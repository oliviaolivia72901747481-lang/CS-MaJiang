import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, clearAllRooms, joinRoom } from '../server/room-manager.js';
import { 
  bindSocketToSeat, 
  markSocketDisconnected, 
  reconnectSeat, 
  getConnectionStatus, 
  clearAllConnections, 
  getSocketRecord 
} from '../server/connection-manager.js';

describe('Connection Manager Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. socket can bind to roomId + seat', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');

    bindSocketToSeat({
      socketId: 'socket_1',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    const rec = getSocketRecord('socket_1');
    expect(rec).toBeDefined();
    expect(rec!.roomId).toBe(room.roomId);
    expect(rec!.seat).toBe(0);
    expect(rec!.connected).toBe(true);
    expect(room.seats[0]!.connected).toBe(true);
    expect(room.seats[0]!.socketId).toBe('socket_1');
  });

  it('2. disconnection marks seat disconnected', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');

    bindSocketToSeat({
      socketId: 'socket_1',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    markSocketDisconnected('socket_1');

    const rec = getSocketRecord('socket_1');
    expect(rec!.connected).toBe(false);
    expect(room.seats[0]!.connected).toBe(false);
  });

  it('3. reconnection restores seat connection', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');

    bindSocketToSeat({
      socketId: 'socket_1',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    markSocketDisconnected('socket_1');
    expect(room.seats[0]!.connected).toBe(false);

    const success = reconnectSeat({
      socketId: 'socket_2',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    expect(success).toBe(true);
    expect(room.seats[0]!.connected).toBe(true);
    expect(room.seats[0]!.socketId).toBe('socket_2');

    // old socket record is invalidated
    const oldRec = getSocketRecord('socket_1');
    expect(oldRec).toBeUndefined();
    const newRec = getSocketRecord('socket_2');
    expect(newRec!.connected).toBe(true);
  });

  it('4. new socket reconnects and invalidates old socket', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');

    bindSocketToSeat({
      socketId: 'socket_1',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    bindSocketToSeat({
      socketId: 'socket_2',
      roomId: room.roomId,
      seat: 0,
      playerName: 'Alice'
    });

    const oldRec = getSocketRecord('socket_1');
    expect(oldRec).toBeUndefined();

    const newRec = getSocketRecord('socket_2');
    expect(newRec!.connected).toBe(true);
    expect(room.seats[0]!.socketId).toBe('socket_2');
  });

  it('5. getConnectionStatus correctly returns seat connection statuses', () => {
    const room = createRoom();
    
    // Join players to seats 0 and 1
    joinRoom(room.roomId, 'Alice'); // seat 0
    joinRoom(room.roomId, 'Bob');   // seat 1

    bindSocketToSeat({ socketId: 's0', roomId: room.roomId, seat: 0, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: 1, playerName: 'Bob' });
    markSocketDisconnected('s1');

    // seat 2: AI connected
    room.seats[2] = { 
      socketId: null, 
      playerName: 'Bot', 
      seat: 2, 
      connected: true, 
      isAI: true,
      sessionId: 'ai-session-2',
      token: 'ai-token-2',
      connectionState: 'ai',
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.aiSeats.push(2);
    // seat 3: vacant

    const conn = getConnectionStatus(room.roomId);
    expect(conn[0]).toBe(true);
    expect(conn[1]).toBe(false);
    expect(conn[2]).toBe(true);
    expect(conn[3]).toBe(false);
  });
});
