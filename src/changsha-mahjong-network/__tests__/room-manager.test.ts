import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, leaveWaitingRoom, fillEmptySeatsWithAI, getRoom, clearAllRooms } from '../server/room-manager.js';

describe('Room Manager Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. can successfully create a room with 6-digit shortcode', () => {
    const room = createRoom();
    expect(room.roomId).toBeDefined();
    expect(room.roomId).toHaveLength(6);
    expect(room.status).toBe('waiting');
  });

  it('2. room codes are unique and retrievable', () => {
    const room1 = createRoom();
    const room2 = createRoom();
    expect(room1.roomId).not.toBe(room2.roomId);

    const retrieved = getRoom(room1.roomId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.roomId).toBe(room1.roomId);
  });

  it('3. player can join a vacant seat in the room', () => {
    const room = createRoom();
    const { seat, room: updatedRoom } = joinRoom(room.roomId, 'Alice');

    expect(seat).toBe(0);
    expect(updatedRoom.seats[0]?.playerName).toBe('Alice');
    expect(updatedRoom.seats[0]?.isAI).toBe(false);
  });

  it('4. seats are filled sequentially and block on 4 players', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    joinRoom(room.roomId, 'David');

    expect(() => joinRoom(room.roomId, 'Eve')).toThrowError('Room is full.');
  });

  it('5. can fill empty seats with AI', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    fillEmptySeatsWithAI(room.roomId);

    const updated = getRoom(room.roomId);
    expect(updated?.seats[0]?.playerName).toBe('Alice');
    expect(updated?.seats[1]?.isAI).toBe(true);
    expect(updated?.seats[2]?.isAI).toBe(true);
    expect(updated?.seats[3]?.isAI).toBe(true);
    expect(updated?.aiSeats).toEqual([1, 2, 3]);
  });

  it('6. leaving a room cleans up the seat and closes empty room', async () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    leaveWaitingRoom(room.roomId, 0);
    const updated = getRoom(room.roomId);
    expect(updated?.seats[0]).toBeNull();
    expect(updated?.seats[1]).toBeDefined();

    leaveWaitingRoom(room.roomId, 1);
    const updatedAgain = getRoom(room.roomId);
    expect(updatedAgain?.seats[1]).toBeNull();

    // Trigger cleanupRooms with expired emptyWaitingRoom TTL to delete room
    const { cleanupRooms } = await import('../server/room-cleanup-scheduler.js');
    cleanupRooms(Date.now() + 301000);
    expect(getRoom(room.roomId)).toBeUndefined();
  });

  it('7. getRoom returns undefined for invalid room codes', () => {
    const retrieved = getRoom('999999');
    expect(retrieved).toBeUndefined();
  });

  it('8. clearAllRooms purges all rooms in memory', () => {
    createRoom();
    createRoom();
    clearAllRooms();
    const room = createRoom();
    expect(getRoom(room.roomId)).toBeDefined();
  });
});
