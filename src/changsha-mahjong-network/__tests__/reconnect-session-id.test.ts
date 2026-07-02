import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat } from '../server/connection-manager.js';

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

describe('Reconnect Session ID Verification Tests', () => {
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
    // Set socket io mock sockets map
    (imported.io.sockets as any).sockets = mockSocketsMap;

    const connectionCall = mockOn.mock.calls.find(call => call[0] === 'connection');
    if (connectionCall) {
      connectionHandler = connectionCall[1];
    }
  });

  it('1. game:sync succeeds with correct sessionId and token', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_ok',
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

    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]!.connectionState).toBe('online');
    expect(room.seats[0]!.socketId).toBe('socket_sync_ok');
  });

  it('2. game:sync fails with incorrect sessionId (returns SESSION_EXPIRED)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_fail_session',
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

    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: 'wrong-session-id',
      token: session.token
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'SESSION_EXPIRED',
      message: expect.any(String)
    });
  });

  it('3. game:sync fails with incorrect token (returns TOKEN_INVALID)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_fail_tok',
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

    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: 'wrong-token'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'TOKEN_INVALID',
      message: expect.any(String)
    });
  });

  it('4. game:sync fails if seat is empty (returns SEAT_RELEASED)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_fail_seat',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'waiting';

    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: 'some-session',
      token: 'some-token'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'SEAT_RELEASED',
      message: expect.any(String)
    });
  });

  it('5. game:sync fails if room not found (returns ROOM_NOT_FOUND)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_fail_room',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    socketListeners['game:sync']({
      roomId: 'non-existing-room',
      seat: 0,
      sessionId: 'some-session',
      token: 'some-token'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'ROOM_NOT_FOUND',
      message: expect.any(String)
    });
  });

  it('6. game:sync fails if player has left (returns PLAYER_LEFT)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_sync_fail_left',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    const session = room.seats[0]!;
    session.connectionState = 'left';

    socketListeners['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('game:sync-failed', {
      code: 'PLAYER_LEFT',
      message: expect.any(String)
    });
  });

  it('7. game:sync with new socket disconnects old socket if it is still connected', () => {
    // Register old socket in sockets map
    const mockOldSocket = {
      id: 'socket_old',
      disconnect: vi.fn(),
    };
    mockSocketsMap.set('socket_old', mockOldSocket);

    // Setup room and bind old socket
    const room = createRoom();
    room.status = 'waiting';
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
    };

    connectionHandler(mockNewSocket);

    socketListenersNew['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    // Old socket disconnect should be called
    expect(mockOldSocket.disconnect).toHaveBeenCalledWith(true);
    expect(room.seats[0]!.socketId).toBe('socket_new');
  });
});
