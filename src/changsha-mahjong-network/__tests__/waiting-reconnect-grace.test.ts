import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat, getConnectionStatus } from '../server/connection-manager.js';

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

describe('Waiting Reconnect Grace Period Tests', () => {
  let connectionHandler: Function;

  beforeEach(async () => {
    clearAllRooms();
    clearAllConnections();
    mockOn.mockClear();
    mockEmit.mockClear();
    mockTo.mockClear();

    await import('../server/index.js');

    const connectionCall = mockOn.mock.calls.find(call => call[0] === 'connection');
    if (connectionCall) {
      connectionHandler = connectionCall[1];
    }
  });

  it('1. disconnect marks player connectionState as reconnecting and does not release seat', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_alice_grace',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice_grace', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    expect(room.seats[0]!.connectionState).toBe('online');

    // Trigger passive disconnect
    socketListeners['disconnect']();

    // Verify seat is kept but state changes to reconnecting
    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('reconnecting');
  });

  it('2. player reconnects within 60s successfully (online again)', () => {
    const socketListeners1: Record<string, Function> = {};
    const mockSocket1 = {
      id: 'socket_alice_old',
      on: (event: string, callback: Function) => {
        socketListeners1[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket1);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_alice_old', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Disconnect old socket
    socketListeners1['disconnect']();
    expect(room.seats[0]!.connectionState).toBe('reconnecting');

    // Reconnect new socket
    const socketListeners2: Record<string, Function> = {};
    const mockSocket2 = {
      id: 'socket_alice_new',
      on: (event: string, callback: Function) => {
        socketListeners2[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket2);

    socketListeners2['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]!.connectionState).toBe('online');
    expect(room.seats[0]!.socketId).toBe('socket_alice_new');
  });

  it('3. player does not reconnect within 60s -> seat is released', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_alice_timeout',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice_timeout', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();

    // Trigger getConnectionStatus at 61 seconds later
    const startTime = Date.now();
    getConnectionStatus(room.roomId, startTime + 61000);

    // Verify seat is released
    expect(room.seats[0]).toBeNull();
  });

  it('4. seat release invalidates old token/session', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_alice_tok_inv',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    const oldSessionId = room.seats[0]!.sessionId;
    const oldToken = room.seats[0]!.token;
    bindSocketToSeat({ socketId: 'socket_alice_tok_inv', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();

    // Timeout release
    getConnectionStatus(room.roomId, Date.now() + 61000);
    expect(room.seats[0]).toBeNull();

    // Reconnection attempt with old session details should fail
    const socketListenersNew: Record<string, Function> = {};
    const mockSocketNew = {
      id: 'socket_alice_reconnect_fail',
      on: (event: string, callback: Function) => {
        socketListenersNew[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocketNew);

    socketListenersNew['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: oldSessionId,
      token: oldToken
    });

    expect(mockSocketNew.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'SEAT_RELEASED',
      message: expect.any(String)
    });
  });

  it('5. room becomes empty after grace period timeout and emptySince is set', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_alice_empty',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice_empty', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();
    expect(room.emptySince).toBeUndefined();

    // Timeout release
    const now = Date.now();
    getConnectionStatus(room.roomId, now + 61000);

    expect(room.seats[0]).toBeNull();
    expect(room.emptySince).toBeGreaterThanOrEqual(now + 61000);
  });
});
