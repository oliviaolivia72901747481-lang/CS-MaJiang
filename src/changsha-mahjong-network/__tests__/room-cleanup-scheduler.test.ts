import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoom, clearAllRooms, getRoom, joinRoom } from '../server/room-manager.js';
import { 
  cleanupRooms, 
  startRoomCleanupScheduler, 
  stopRoomCleanupScheduler 
} from '../server/room-cleanup-scheduler.js';
import { bindSocketToSeat, clearAllConnections, markSocketDisconnected } from '../server/connection-manager.js';

describe('Room Cleanup Scheduler Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  afterEach(() => {
    stopRoomCleanupScheduler();
  });

  it('1. empty room is cleaned up after TTL', () => {
    const room = createRoom();
    const createdTime = Date.now() - 400000; // 400s ago
    room.createdAt = createdTime;

    // Trigger cleanup with now (current time)
    // Using default TTL = 300s (300000ms)
    const { removedRoomIds } = cleanupRooms(Date.now());

    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('2. empty room is not cleaned up before TTL', () => {
    const room = createRoom();
    room.createdAt = Date.now() - 100000; // 100s ago (before 300s TTL)

    const { removedRoomIds } = cleanupRooms(Date.now());

    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('3. active room (with connected humans) is protected from cleanup', () => {
    const room = createRoom();
    room.createdAt = Date.now() - 400000; // 400s ago
    
    // Join a human and bind connection
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Try cleanup
    const { removedRoomIds } = cleanupRooms(Date.now());

    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('4. fully disconnected room is cleaned up after inactive TTL', () => {
    const room = createRoom();
    room.createdAt = Date.now() - 800000; // 800s ago
    
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Disconnect player
    markSocketDisconnected('s1');

    // Mock lastActiveAt to 800s ago as well
    (room as any).lastActiveAt = Date.now() - 800000; // Inactive for 800s (exceeds default 600s TTL)

    const { removedRoomIds } = cleanupRooms(Date.now());

    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('5. playing room with at least one human is protected from early cleanup', () => {
    const room = createRoom();
    room.createdAt = Date.now() - 800000;
    
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: 0, playerName: 'Alice' });
    
    joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: 1, playerName: 'Bob' });

    // One disconnects, one remains connected
    markSocketDisconnected('s1');

    (room as any).lastActiveAt = Date.now() - 200000; // Last active 200s ago (Bob is still online!)

    const { removedRoomIds } = cleanupRooms(Date.now());

    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });
});
