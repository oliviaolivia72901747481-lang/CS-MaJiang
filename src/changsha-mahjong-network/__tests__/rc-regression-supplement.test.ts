import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom, markPlayerLeftDuringGame, leaveSettlementRoom, leaveWaitingRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat, getSocketRecord, handleSocketDisconnected, reconnectSeat } from '../server/connection-manager.js';
import { isSeatTrustee } from '../server/ai-seat-runner.js';
import { cleanupRooms } from '../server/room-cleanup-scheduler.js';

const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

vi.mock('socket.io', () => {
  return {
    Server: vi.fn().mockImplementation(() => {
      return {
        on: mockOn,
        to: mockTo,
        sockets: {
          sockets: new Map()
        }
      };
    }),
  };
});

describe('RC Regression Supplement Tests', () => {
  let connectionHandler: Function;
  let mockSocketsMap: Map<string, any>;

  beforeEach(async () => {
    clearAllRooms();
    clearAllConnections();
    mockOn.mockClear();
    mockEmit.mockClear();
    mockTo.mockClear();

    mockSocketsMap = new Map();
    const imported = await import('../server/index.js');
    (imported.io.sockets as any).sockets = mockSocketsMap;

    const connectionCall = mockOn.mock.calls.find(call => call[0] === 'connection');
    if (connectionCall) {
      connectionHandler = connectionCall[1];
    }
  });

  it('1. playing room:leave does not set seat = null', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_play_leave',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_play_leave', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    // Seat must NOT be null
    expect(room.seats[0]).not.toBeNull();
  });

  it('2. playing room:leave sets connectionState = left', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_play_leave_state',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_play_leave_state', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]!.connectionState).toBe('left');
    expect(room.seats[0]!.connected).toBe(false);
  });

  it('3. playing left seat is managed by AI trustee', () => {
    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    session.connectionState = 'left';

    expect(isSeatTrustee(room.roomId, 0)).toBe(true);
  });

  it('4. old socket after reconnect cannot act', async () => {
    const socketListenersOld: Record<string, Function> = {};
    const mockOldSocket = {
      id: 'socket_old',
      on: (event: string, callback: Function) => {
        socketListenersOld[event] = callback;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };

    connectionHandler(mockOldSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_old', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Connect new socket
    const socketListenersNew: Record<string, Function> = {};
    const mockNewSocket = {
      id: 'socket_new',
      on: (event: string, callback: Function) => {
        socketListenersNew[event] = callback;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
    mockSocketsMap.set('socket_old', mockOldSocket);
    connectionHandler(mockNewSocket);

    // Sync with new socket
    socketListenersNew['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    // Try to perform action from old socket
    socketListenersOld['game:discard']({
      roomId: room.roomId,
      seat: 0,
      tileInstanceId: 'wan_1_inst'
    });

    expect(mockOldSocket.emit).toHaveBeenCalledWith('error', 'Unauthorized seat action.');
  });

  it('5. old socket after reconnect does not receive private view', async () => {
    const room = createRoom();
    room.status = 'playing';
    room.gameSession = {
      roomId: room.roomId,
      state: { 
        phase: 'playing', 
        currentSeat: 0, 
        players: [
          { seat: 0, hand: [], melds: [], discards: [], score: 1000 },
          { seat: 1, hand: [], melds: [], discards: [], score: 1000 },
          { seat: 2, hand: [], melds: [], discards: [], score: 1000 },
          { seat: 3, hand: [], melds: [], discards: [], score: 1000 }
        ],
        discards: { 0: [], 1: [], 2: [], 3: [] },
        pendingActions: [],
        logs: [],
        wall: []
      } as any,
      actionLock: false,
      lastUpdatedAt: Date.now()
    };

    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_old', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Reconnect new socket
    const socketListenersNew: Record<string, Function> = {};
    const mockNewSocket = {
      id: 'socket_new',
      on: (event: string, callback: Function) => {
        socketListenersNew[event] = callback;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
    connectionHandler(mockNewSocket);

    socketListenersNew['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    // Clear calls
    mockTo.mockClear();

    // Trigger broadcast
    const imported = await import('../server/index.js');
    imported.broadcastRoomState(room.roomId);

    // Should broadcast to socket_new, NOT socket_old
    expect(mockTo).toHaveBeenCalledWith('socket_new');
    expect(mockTo).not.toHaveBeenCalledWith('socket_old');
  });

  it('6. playing all-offline room is NOT cleaned before configured TTL', () => {
    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    handleSocketDisconnected('socket_alice');
    room.seats[0]!.connectionState = 'offline';

    // Set allOfflineSince to 5 mins ago (TTL is 10 mins)
    room.allOfflineSince = Date.now() - 300000;

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('7. left-only room uses shorter TTL', () => {
    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    room.seats[0]!.connectionState = 'left';
    room.leftOnlySince = Date.now() - 121000; // 2m 1s ago (TTL is 2 mins)

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('8. waiting reconnecting player prevents premature cleanup', () => {
    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    handleSocketDisconnected('socket_alice');
    expect(room.seats[0]!.connectionState).toBe('reconnecting');

    // Make room created 6 minutes ago
    room.createdAt = Date.now() - 360000;

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('9. same playerName different sessionId cannot take seat', () => {
    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    
    const res = reconnectSeat({
      socketId: 'socket_alice_new',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice',
      sessionId: 'fake-session-id'
    });

    expect(res).toBe(false);
  });

  it('10. settlement leave keeps settlement data until TTL', () => {
    const room = createRoom();
    room.status = 'settlement';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    
    // Simulate settlement leave
    leaveSettlementRoom(room.roomId, 0);

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('left');

    // Run scheduler checks. Should keep room if settlementSince is not expired
    room.settlementSince = Date.now() - 100000; // 1m 40s ago (TTL is 5 mins)
    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });
});
