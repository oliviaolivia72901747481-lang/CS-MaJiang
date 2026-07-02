import { getRoom } from './room-manager.js';

export interface ConnectionRecord {
  socketId: string;
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  connected: boolean;
  lastSeenAt: number;
}

const socketIdToRecord = new Map<string, ConnectionRecord>();

export function getSocketRecord(socketId: string): ConnectionRecord | undefined {
  return socketIdToRecord.get(socketId);
}

export function clearAllConnections(): void {
  socketIdToRecord.clear();
}

export function bindSocketToSeat(input: {
  socketId: string;
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
}): void {
  const { socketId, roomId, seat, playerName } = input;

  // Invalidate any old socket connected to this seat
  for (const [id, rec] of socketIdToRecord.entries()) {
    if (rec.roomId === roomId && rec.seat === seat) {
      rec.connected = false;
      socketIdToRecord.delete(id);
    }
  }

  socketIdToRecord.set(socketId, {
    socketId,
    roomId,
    seat,
    playerName,
    connected: true,
    lastSeenAt: Date.now()
  });

  // Update connected status in room session
  const room = getRoom(roomId);
  if (room && room.seats[seat]) {
    const session = room.seats[seat]!;
    session.connected = true;
    session.connectionState = 'online';
    session.socketId = socketId;
    session.disconnectedAt = undefined;
    session.lastSeenAt = Date.now();
  }
}

export function handleSocketDisconnected(socketId: string): { roomId: string; seat: 0 | 1 | 2 | 3 } | undefined {
  const record = socketIdToRecord.get(socketId);
  if (!record) return undefined;

  record.connected = false;
  record.lastSeenAt = Date.now();

  const room = getRoom(record.roomId);
  if (room && room.seats[record.seat]) {
    const session = room.seats[record.seat]!;
    if (session.connectionState !== 'left' && session.connectionState !== 'ai') {
      session.connected = false;
      session.connectionState = 'reconnecting';
      session.disconnectedAt = Date.now();
      session.lastSeenAt = Date.now();
    }
  }

  return { roomId: record.roomId, seat: record.seat };
}

export function markSocketDisconnected(socketId: string): void {
  handleSocketDisconnected(socketId);
}

export function reconnectSeat(input: {
  socketId: string;
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  sessionId?: string;
}): boolean {
  const { socketId, roomId, seat, playerName, sessionId } = input;
  const room = getRoom(roomId);
  if (!room) return false;

  const playerSession = room.seats[seat];
  if (!playerSession) return false;

  if (playerSession.playerName !== playerName) return false;
  if (sessionId && playerSession.sessionId !== sessionId) return false;

  bindSocketToSeat({ socketId, roomId, seat, playerName });
  return true;
}

export function getConnectionStatus(roomId: string, now = Date.now()): Record<0 | 1 | 2 | 3, boolean> {
  const status: Record<0 | 1 | 2 | 3, boolean> = {
    0: false,
    1: false,
    2: false,
    3: false
  };

  const room = getRoom(roomId);
  if (!room) return status;

  for (const s of [0, 1, 2, 3] as const) {
    const session = room.seats[s];
    if (!session) {
      status[s] = false;
      continue;
    }

    if (session.isAI || session.connectionState === 'ai') {
      status[s] = true;
      session.connected = true;
      continue;
    }

    if (session.connectionState === 'left') {
      status[s] = false;
      session.connected = false;
      continue;
    }

    let isConnected = false;
    for (const rec of socketIdToRecord.values()) {
      if (rec.roomId === roomId && rec.seat === s && rec.connected) {
        isConnected = true;
        break;
      }
    }

    if (isConnected) {
      session.connectionState = 'online';
      session.connected = true;
      session.disconnectedAt = undefined;
      session.lastSeenAt = now;
      status[s] = true;
    } else {
      session.connected = false;
      status[s] = false;

      if (session.connectionState === 'online') {
        session.connectionState = 'reconnecting';
        session.disconnectedAt = now;
      }

      const disconnectedDuration = now - (session.disconnectedAt || now);

      if (room.status === 'waiting') {
        if (disconnectedDuration > 60000) { // WAITING_RECONNECT_GRACE_MS = 60000
          room.seats[s] = null;
          // Clean up old socket record
          for (const [id, rec] of socketIdToRecord.entries()) {
            if (rec.roomId === roomId && rec.seat === s) {
              socketIdToRecord.delete(id);
            }
          }
          // Mark room emptySince if no humans remain
          const hasHumans = Object.values(room.seats).some(ps => ps !== null && !ps.isAI && ps.connectionState !== 'left');
          if (!hasHumans && !room.emptySince) {
            room.emptySince = now;
          }
        }
      } else if (room.status === 'playing' || room.status === 'settlement') {
        if (disconnectedDuration > 120000) { // PLAYING_RECONNECT_GRACE_MS = 120000
          session.connectionState = 'offline';
        }
      }
    }
  }

  return status;
}
