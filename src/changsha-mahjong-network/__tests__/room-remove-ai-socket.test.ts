import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom, addSingleAI } from '../server/room-manager.js';
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

describe('Room Remove AI Socket Events Tests', () => {
  let connectionHandler: Function;

  beforeEach(async () => {
    clearAllRooms();
    clearAllConnections();
    mockOn.mockClear();
    mockEmit.mockClear();
    mockTo.mockClear();

    // Import index to trigger socket initialization
    await import('../server/index.js');

    const connectionCall = mockOn.mock.calls.find(call => call[0] === 'connection');
    if (connectionCall) {
      connectionHandler = connectionCall[1];
    }
  });

  it('1. should remove AI via room:remove-ai and broadcast room:updated', () => {
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
    joinRoom(room.roomId, 'Alice'); // seat 0
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Add AI to seat 1
    addSingleAI(room.roomId, 1);
    expect(room.seats[1]).not.toBeNull();
    expect(room.seats[1]?.isAI).toBe(true);

    // Call remove-ai listener
    socketListeners['room:remove-ai']({
      roomId: room.roomId,
      seat: 1
    });

    // Expect AI removed
    expect(room.seats[1]).toBeNull();
    
    // Expect broadcast of room:updated to Alice's socket
    expect(mockTo).toHaveBeenCalledWith('socket_alice');
    expect(mockEmit).toHaveBeenCalledWith('room:updated', expect.any(Object));
  });

  it('2. should fail to remove AI if seat is occupied by human and emit error', () => {
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
    joinRoom(room.roomId, 'Alice'); // seat 0
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Call remove-ai on seat 0 (human player)
    socketListeners['room:remove-ai']({
      roomId: room.roomId,
      seat: 0
    });

    // Expect AI NOT removed
    expect(room.seats[0]).not.toBeNull();
    
    // Expect error emitted to socket
    expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to remove AI.');
  });
});
