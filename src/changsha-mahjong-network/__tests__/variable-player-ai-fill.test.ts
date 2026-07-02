import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms, addSingleAI, fillSeatsWithAITo } from '../server/room-manager.js';

describe('Variable Player AI Fill Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. addSingleAI adds AI to a specific empty seat', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0

    addSingleAI(room.roomId, 2); // Add AI to seat 2
    expect(room.seats[2]).not.toBeNull();
    expect(room.seats[2]?.isAI).toBe(true);
    expect(room.seats[1]).toBeNull();
    expect(room.seats[3]).toBeNull();
  });

  it('2. fillSeatsWithAITo fills empty seats up to target count', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    joinRoom(room.roomId, 'Bob');   // seat 1

    fillSeatsWithAITo(room.roomId, 3); // target total participants 3
    const occupied = Object.values(room.seats).filter(s => s !== null);
    expect(occupied.length).toBe(3);
    expect(room.seats[2]?.isAI).toBe(true);
    expect(room.seats[3]).toBeNull();
  });
});
