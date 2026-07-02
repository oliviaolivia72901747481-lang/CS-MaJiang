import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createRoom, 
  joinRoom, 
  addSingleAI, 
  removeAI, 
  fillSeatsWithAITo, 
  getRoom, 
  clearAllRooms 
} from '../server/room-manager.js';

describe('Room Remove AI & Status Locking Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. should remove AI in waiting phase successfully', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    addSingleAI(room.roomId, 1);

    const r1 = getRoom(room.roomId)!;
    expect(r1.seats[1]).not.toBeNull();
    expect(r1.seats[1]?.isAI).toBe(true);
    expect(r1.aiSeats).toContain(1);

    const success = removeAI(room.roomId, 1);
    expect(success).toBe(true);
    expect(r1.seats[1]).toBeNull();
    expect(r1.aiSeats).not.toContain(1);
  });

  it('2. should not remove a human player', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0

    const success = removeAI(room.roomId, 0);
    expect(success).toBe(false);
    
    const r = getRoom(room.roomId)!;
    expect(r.seats[0]).not.toBeNull();
    expect(r.seats[0]?.playerName).toBe('Alice');
  });

  it('3. should return false when trying to remove from non-existent seat or room', () => {
    expect(removeAI('invalid-room', 1)).toBe(false);

    const room = createRoom();
    expect(removeAI(room.roomId, 1)).toBe(false); // vacant seat
  });

  it('4. should not add AI or remove AI if room status is not waiting', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    addSingleAI(room.roomId, 1);

    // Mock start game phase change
    room.status = 'playing';

    // Try adding AI in playing phase
    addSingleAI(room.roomId, 2);
    expect(room.seats[2]).toBeNull();

    // Try fillSeatsWithAITo in playing phase
    fillSeatsWithAITo(room.roomId, 4);
    expect(room.seats[3]).toBeNull();

    // Try removing AI in playing phase
    const success = removeAI(room.roomId, 1);
    expect(success).toBe(false);
    expect(room.seats[1]).not.toBeNull();
  });
});
