import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { moveToNextSeat } from '../../changsha-mahjong/controller/round-controller.js';

describe('Variable Player Turn Order Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. 2-player turn order: 0 -> 1 -> 0', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    let state = session.state;

    expect(state.currentSeat).toBe(0);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(1);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(0);
  });

  it('2. 3-player turn order: 0 -> 1 -> 2 -> 0', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');

    const session = startOnlineRound(room.roomId, 3);
    let state = session.state;

    expect(state.currentSeat).toBe(0);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(1);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(2);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(0);
  });

  it('3. non-continuous activeSeats [0, 2, 3] turn order: 0 -> 2 -> 3 -> 0', () => {
    const room = createRoom();
    room.seats[0] = {
      seat: 0,
      playerName: 'Alice',
      sessionId: 'sess0',
      token: 'tok0',
      socketId: 'sock0',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'David',
      sessionId: 'sess3',
      token: 'tok3',
      socketId: 'sock3',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 3);
    let state = session.state;

    expect(state.activeSeats).toEqual([0, 2, 3]);
    expect(state.currentSeat).toBe(0);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(2);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(3);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(0);
  });

  it('4. currentSeat throws error if it is not an active seat', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    // Manually force currentSeat to an inactive seat
    state.currentSeat = 2;

    expect(() => moveToNextSeat(state)).toThrow('Current seat 2 is not active');
  });
});
