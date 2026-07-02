import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createRoom, joinRoom, fillEmptySeatsWithAI, getRoom, leaveWaitingRoom, markPlayerLeftDuringGame, leaveSettlementRoom, addSingleAI, fillSeatsWithAITo, removeAI } from './room-manager.js';
import { startOnlineRound, submitPlayerAction } from './game-session.js';
import { buildPlayerVisibleView } from './server-visible-view.js';
import { NetworkPlayerAction } from './network-types.js';
import { 
  bindSocketToSeat, 
  markSocketDisconnected, 
  getConnectionStatus, 
  getSocketRecord,
  handleSocketDisconnected
} from './connection-manager.js';
import { startRoomCleanupScheduler } from './room-cleanup-scheduler.js';
import { stepAIIfNeeded, setBroadcastCallback } from './ai-seat-runner.js';
import { handleHealthCheckRequest } from './health-check.js';
import { getLocalNetworkInfo } from './network-info.js';

const httpServer = createServer((req, res) => {
  const handled = handleHealthCheckRequest(req, res, io);
  if (!handled) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Changsha Mahjong Online server running\n');
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

export function broadcastRoomState(roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  const connectionStatus = getConnectionStatus(roomId);

  const playerNames: Record<0 | 1 | 2 | 3, string> = {
    0: '', 1: '', 2: '', 3: ''
  };

  for (const s of [0, 1, 2, 3] as const) {
    const session = room.seats[s];
    if (session) {
      playerNames[s] = session.playerName;
    }
  }

  for (const s of [0, 1, 2, 3] as const) {
    const session = room.seats[s];
    if (session && !session.isAI && session.socketId && connectionStatus[s]) {
      if (room.gameSession) {
        const view = buildPlayerVisibleView({
          roomId,
          state: room.gameSession.state,
          seat: s,
          connectionStatus,
          aiSeats: room.aiSeats,
          playerNames,
        });
        io.to(session.socketId).emit('game:state', view);
      } else {
        io.to(session.socketId).emit('room:updated', {
          roomId,
          status: room.status,
          seats: room.seats,
          aiSeats: room.aiSeats,
          mySeat: s,
        });
      }
    }
  }
}

// Register broadcast callback for AI runner
setBroadcastCallback(broadcastRoomState);

io.on('connection', (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('room:create', ({ playerName }: { playerName: string }) => {
    try {
      const room = createRoom();
      const { seat } = joinRoom(room.roomId, playerName);
      const session = room.seats[seat]!;
      
      bindSocketToSeat({ socketId: socket.id, roomId: room.roomId, seat, playerName });

      socket.emit('room:created', { roomId: room.roomId, seat, sessionId: session.sessionId, token: session.token });
      broadcastRoomState(room.roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to create room.');
    }
  });

  socket.on('room:join', ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        throw new Error('Room not found.');
      }
      if (room.status !== 'waiting') {
        throw new Error('Game already started.');
      }
      const { seat } = joinRoom(roomId, playerName);
      const session = room.seats[seat]!;
      
      bindSocketToSeat({ socketId: socket.id, roomId, seat, playerName });

      socket.emit('room:joined', { roomId, seat, sessionId: session.sessionId, token: session.token });
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to join room.');
    }
  });

  socket.on('room:fill-ai', ({ roomId, targetCount }: { roomId: string; targetCount?: number }) => {
    try {
      if (targetCount) {
        fillSeatsWithAITo(roomId, targetCount);
      } else {
        fillEmptySeatsWithAI(roomId);
      }
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to fill AI.');
    }
  });

  socket.on('room:add-ai', ({ roomId, seat }: { roomId: string; seat: 0 | 1 | 2 | 3 }) => {
    try {
      addSingleAI(roomId, seat);
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to add AI.');
    }
  });

  socket.on('room:remove-ai', ({ roomId, seat }: { roomId: string; seat: 0 | 1 | 2 | 3 }) => {
    try {
      const success = removeAI(roomId, seat);
      if (success) {
        broadcastRoomState(roomId);
      } else {
        socket.emit('error', 'Failed to remove AI.');
      }
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to remove AI.');
    }
  });

  socket.on('game:start', async ({ roomId, requestedPlayerCount, fillAIToPlayerCount }: { roomId: string; requestedPlayerCount?: 2 | 3 | 4; fillAIToPlayerCount?: 2 | 3 | 4 }) => {
    try {
      startOnlineRound(roomId, requestedPlayerCount, fillAIToPlayerCount);
      broadcastRoomState(roomId);
      
      await stepAIIfNeeded(roomId);
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Failed to start game.');
    }
  });

  socket.on('game:discard', async ({ roomId, seat, tileInstanceId, actionId }: { roomId: string; seat: 0 | 1 | 2 | 3; tileInstanceId: string; actionId?: string }) => {
    try {
      // Security authorization check
      const record = getSocketRecord(socket.id);
      if (!record || record.roomId !== roomId || record.seat !== seat) {
        socket.emit('error', 'Unauthorized seat action.');
        return;
      }

      const res = submitPlayerAction({
        roomId,
        seat,
        action: { type: 'discard', tileInstanceId, actionId },
      });

      if (!res.success) {
        socket.emit('error', res.error || 'Invalid discard action.');
        return;
      }

      broadcastRoomState(roomId);

      await stepAIIfNeeded(roomId);
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Discard failed.');
    }
  });

  socket.on('game:action', async ({ roomId, seat, action }: { roomId: string; seat: 0 | 1 | 2 | 3; action: NetworkPlayerAction }) => {
    try {
      // Security authorization check
      const record = getSocketRecord(socket.id);
      if (!record || record.roomId !== roomId || record.seat !== seat) {
        socket.emit('error', 'Unauthorized seat action.');
        return;
      }

      const res = submitPlayerAction({
        roomId,
        seat,
        action,
      });

      if (!res.success) {
        socket.emit('error', res.error || 'Action failed.');
        return;
      }

      broadcastRoomState(roomId);

      await stepAIIfNeeded(roomId);
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('error', err.message || 'Action processing failed.');
    }
  });

  socket.on('game:sync', ({ roomId, seat, sessionId, token }: { roomId: string; seat: 0 | 1 | 2 | 3; sessionId: string; token: string }) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('game:sync-failed', { code: 'ROOM_NOT_FOUND', message: '房间已不存在。' });
        return;
      }

      if (seat === undefined || seat < 0 || seat > 3) {
        socket.emit('game:sync-failed', { code: 'TOKEN_INVALID', message: '无效座位。' });
        return;
      }

      const session = room.seats[seat];
      if (!session) {
        socket.emit('game:sync-failed', { code: 'SEAT_RELEASED', message: '席位已被释放或不存在。' });
        return;
      }

      if (session.connectionState === 'left') {
        socket.emit('game:sync-failed', { code: 'PLAYER_LEFT', message: '你已主动离开该房间。' });
        return;
      }

      if (session.sessionId !== sessionId) {
        socket.emit('game:sync-failed', { code: 'SESSION_EXPIRED', message: '会话已过期。' });
        return;
      }

      if (session.token !== token) {
        socket.emit('game:sync-failed', { code: 'TOKEN_INVALID', message: '身份验证失败。' });
        return;
      }

      // Invalidate old socket if it's different
      if (session.socketId && session.socketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(session.socketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
      }

      bindSocketToSeat({ socketId: socket.id, roomId, seat, playerName: session.playerName });
      broadcastRoomState(roomId);
    } catch (err: any) {
      socket.emit('game:sync-failed', { code: 'ERROR', message: err.message || '同步失败。' });
    }
  });

  socket.on('room:leave', ({ roomId, seat, sessionId, token }: { roomId: string; seat: 0 | 1 | 2 | 3; sessionId: string; token: string }) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room:leave-failed', { code: 'ROOM_NOT_FOUND', message: '房间不存在。' });
        return;
      }

      if (seat === undefined || seat < 0 || seat > 3) {
        socket.emit('room:leave-failed', { code: 'TOKEN_INVALID', message: '无效座位。' });
        return;
      }

      const session = room.seats[seat];
      if (!session) {
        socket.emit('room:leave-failed', { code: 'SEAT_RELEASED', message: '席位不存在。' });
        return;
      }

      if (session.sessionId !== sessionId || session.token !== token) {
        socket.emit('room:leave-failed', { code: 'TOKEN_INVALID', message: '身份验证失败。' });
        return;
      }

      if (room.status === 'waiting') {
        leaveWaitingRoom(roomId, seat);
        // Invalidate socket record
        const record = getSocketRecord(socket.id);
        if (record && record.roomId === roomId && record.seat === seat) {
          markSocketDisconnected(socket.id);
        }
      } else if (room.status === 'playing') {
        markPlayerLeftDuringGame(roomId, seat);
      } else {
        leaveSettlementRoom(roomId, seat);
      }

      socket.emit('room:left', { roomId, seat });
      broadcastRoomState(roomId);

      if (room.status === 'playing') {
        stepAIIfNeeded(roomId).then(() => {
          broadcastRoomState(roomId);
        });
      }
    } catch (err: any) {
      socket.emit('room:leave-failed', { code: 'ERROR', message: err.message || '离开房间失败。' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const record = getSocketRecord(socket.id);
    if (record) {
      const res = handleSocketDisconnected(socket.id);
      if (res) {
        broadcastRoomState(res.roomId);
        const room = getRoom(res.roomId);
        if (room && room.status === 'playing') {
          // Trigger AI takeover after 30.5s if not reconnected
          setTimeout(async () => {
            const r = getRoom(res.roomId);
            if (r && r.status === 'playing') {
              await stepAIIfNeeded(res.roomId);
              broadcastRoomState(res.roomId);
            }
          }, 30500);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    const info = getLocalNetworkInfo({ frontendPort: 5173, socketPort: Number(PORT) });
    console.log(`\n==================================================`);
    console.log(`🀄 长沙麻将多人联机服务端已成功启动！`);
    console.log(`主机名称: ${info.hostname}`);
    console.log(`Socket 服务地址 (本地): http://localhost:${PORT}`);
    if (info.lanIPs.length > 0) {
      console.log(`Socket 局域网服务地址:`);
      info.lanIPs.forEach(ip => console.log(`  http://${ip}:${PORT}`));
      console.log(`\n手机/局域网设备前端访问 URL:`);
      info.lanIPs.forEach(ip => console.log(`  http://${ip}:5173/?mode=online`));
    }
    console.log(`==================================================\n`);
  });

  // Start Cleanup Scheduler
  startRoomCleanupScheduler({
    intervalMs: 60000,          // Check every minute
    emptyRoomTtlMs: 300000,      // Clean empty rooms after 5 minutes
    disconnectedRoomTtlMs: 600000 // Clean fully disconnected rooms after 10 minutes
  });
}

export { httpServer, io };
