import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat } from '../server/connection-manager.js';
import { stepAIIfNeeded } from '../server/ai-seat-runner.js';

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

describe('Explicit Leave Flow Tests', () => {
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

  it('1. waiting stage: active room:leave releases seat immediately', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_1',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_1', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    expect(room.seats[0]).not.toBeNull();

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]).toBeNull();
    expect(mockSocket.emit).toHaveBeenCalledWith('room:left', { roomId: room.roomId, seat: 0 });
  });

  it('2. waiting stage: room:leave with incorrect sessionId fails', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_2',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Bob');
    const session = room.seats[0]!;

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: 'wrong-session-id',
      token: session.token
    });

    expect(room.seats[0]).not.toBeNull();
    expect(mockSocket.emit).toHaveBeenCalledWith('room:leave-failed', {
      code: 'TOKEN_INVALID',
      message: expect.any(String)
    });
  });

  it('3. waiting stage: room:leave with incorrect token fails', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_3',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Charlie');
    const session = room.seats[0]!;

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: 'wrong-token'
    });

    expect(room.seats[0]).not.toBeNull();
    expect(mockSocket.emit).toHaveBeenCalledWith('room:leave-failed', {
      code: 'TOKEN_INVALID',
      message: expect.any(String)
    });
  });

  it('4. playing stage: room:leave marks session as left and connected as false, does not delete seat', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_4',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'David');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_4', roomId: room.roomId, seat: 0, playerName: 'David' });

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('left');
    expect(room.seats[0]!.connected).toBe(false);
  });

  it('5. settlement stage: room:leave marks session as left', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_5',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'settlement';
    joinRoom(room.roomId, 'Eve');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_5', roomId: room.roomId, seat: 0, playerName: 'Eve' });

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('left');
    expect(room.seats[0]!.connected).toBe(false);
  });

  it('6. waiting stage: seat not occupied by the player fails room:leave', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_6',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    // Seat 0 is empty

    socketListeners['room:leave']({
      roomId: room.roomId,
      seat: 0,
      sessionId: 'any-session',
      token: 'any-token'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('room:leave-failed', {
      code: 'SEAT_RELEASED',
      message: expect.any(String)
    });
  });
});
