import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat, getSocketRecord } from '../server/connection-manager.js';

// Mock socket.io
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

describe('Lobby Leave and Sync Tests', async () => {
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

  it('1. player disconnect in waiting room does not leave room immediately but enters reconnecting state', async () => {
    expect(connectionHandler).toBeDefined();

    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_alice',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    const seat = 0;
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat, playerName: 'Alice' });

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.playerName).toBe('Alice');

    socketListeners['disconnect']();

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('reconnecting');
  });

  it('2. player disconnect in playing room does not leave room, but shows offline/reconnecting', async () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_bob',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    const seat = 0;
    joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 'socket_bob', roomId: room.roomId, seat, playerName: 'Bob' });

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connected).toBe(true);

    socketListeners['disconnect']();

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('reconnecting');
  });

  it('3. game:sync fails and emits game:sync-failed if seat is empty/vacated', async () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_charlie',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';
    expect(room.seats[0]).toBeNull();

    expect(socketListeners['game:sync']).toBeDefined();
    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: 'some-session',
      token: 'some-token',
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'SEAT_RELEASED',
      message: expect.any(String),
    });
  });
});
