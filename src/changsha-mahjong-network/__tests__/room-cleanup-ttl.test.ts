import { describe, it, expect, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat, handleSocketDisconnected } from '../server/connection-manager.js';
import { cleanupRooms } from '../server/room-cleanup-scheduler.js';

describe('Room Cleanup Scheduler TTL Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. waiting empty room is deleted after EMPTY_WAITING_ROOM_TTL_MS (5 mins)', () => {
    const room = createRoom();
    room.status = 'waiting';
    room.createdAt = Date.now() - 301000; // created 5m 1s ago
    room.emptySince = Date.now() - 301000; // empty since 5m 1s ago

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('2. waiting stage: room with reconnecting player is NOT deleted before grace period timeout', () => {
    const room = createRoom();
    room.status = 'waiting';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Simulate passive disconnect
    handleSocketDisconnected('socket_alice');
    expect(room.seats[0]!.connectionState).toBe('reconnecting');

    // Run scheduler checks. Even if room age is 6 mins, the player is reconnecting (grace period 60s has not expired)
    room.createdAt = Date.now() - 361000;

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('3. playing stage: all offline playing room is deleted after ALL_OFFLINE_PLAYING_ROOM_TTL_MS (10 mins)', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    room.status = 'playing';

    handleSocketDisconnected('socket_alice');
    // Force transition to offline (disconnected > 120s)
    room.seats[0]!.connectionState = 'offline';

    // Set allOfflineSince to 10 mins 1s ago
    room.allOfflineSince = Date.now() - 601000;

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('4. playing stage: room with at least one online human player is NOT deleted', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    // Set other human player offline
    joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 'socket_bob', roomId: room.roomId, seat: 1, playerName: 'Bob' });
    handleSocketDisconnected('socket_bob');
    room.seats[1]!.connectionState = 'offline';

    room.status = 'playing';

    // Run cleanup scheduler. Since Alice is online, the room must NOT be deleted
    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).not.toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeDefined();
  });

  it('5. settlement stage: room is deleted after SETTLEMENT_ROOM_TTL_MS (5 mins)', () => {
    const room = createRoom();
    room.status = 'settlement';
    room.settlementSince = Date.now() - 301000; // 5m 1s ago

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('6. playing stage: left-only room (all humans left) is deleted after LEFT_ONLY_ROOM_TTL_MS (2 mins)', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_alice', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    room.status = 'playing';

    // Player left
    room.seats[0]!.connectionState = 'left';
    room.leftOnlySince = Date.now() - 121000; // 2m 1s ago

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('7. playing stage: AI-only room is deleted after LEFT_ONLY_ROOM_TTL_MS (2 mins)', () => {
    const room = createRoom();
    room.status = 'playing';
    // Only AI seats populated
    room.seats[0] = {
      seat: 0,
      playerName: 'AI_0',
      sessionId: 'ai-session-0',
      token: 'ai-token-0',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    room.leftOnlySince = Date.now() - 121000; // 2m 1s ago

    const { removedRoomIds } = cleanupRooms(Date.now());
    expect(removedRoomIds).toContain(room.roomId);
    expect(getRoom(room.roomId)).toBeUndefined();
  });
});
