import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { checkTileConservation } from '../../changsha-mahjong/benchmark/ai-match-runner.js';

describe('Variable Player Deal Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. 2-player deal assigns cards to only active seats', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    expect(state.players.length).toBe(2);
    expect(state.players.find(p => p.seat === 0)).toBeDefined();
    expect(state.players.find(p => p.seat === 1)).toBeDefined();
    expect(state.players.find(p => p.seat === 2)).toBeUndefined();
    expect(state.players.find(p => p.seat === 3)).toBeUndefined();

    const p0 = state.players.find(p => p.seat === 0)!;
    const p1 = state.players.find(p => p.seat === 1)!;

    // Dealer has 14, others have 13
    expect(p0.isDealer).toBe(true);
    expect(p0.hand.length).toBe(14);
    expect(p1.hand.length).toBe(13);

    // Wall remainder conservation
    expect(state.wall.length).toBe(108 - 14 - 13);
    expect(checkTileConservation(state)).toBe(true);
  });

  it('2. 3-player deal assigns cards to only active seats', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');

    const session = startOnlineRound(room.roomId, 3);
    const state = session.state;

    expect(state.players.length).toBe(3);
    const p0 = state.players.find(p => p.seat === 0)!;
    const p1 = state.players.find(p => p.seat === 1)!;
    const p2 = state.players.find(p => p.seat === 2)!;

    expect(p0.isDealer).toBe(true);
    expect(p0.hand.length).toBe(14);
    expect(p1.hand.length).toBe(13);
    expect(p2.hand.length).toBe(13);

    expect(state.wall.length).toBe(108 - 14 - 13 - 13);
    expect(checkTileConservation(state)).toBe(true);
  });

  it('3. 4-player deal maintains original 4-player rules', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    joinRoom(room.roomId, 'David');

    const session = startOnlineRound(room.roomId, 4);
    const state = session.state;

    expect(state.players.length).toBe(4);
    const p0 = state.players.find(p => p.seat === 0)!;
    expect(p0.isDealer).toBe(true);
    expect(p0.hand.length).toBe(14);

    expect(state.wall.length).toBe(108 - 14 - 13 - 13 - 13);
    expect(checkTileConservation(state)).toBe(true);
  });

  it('4. dealer seat must be an active seat', () => {
    const room = createRoom();
    room.seats[1] = {
      seat: 1,
      playerName: 'Bob',
      sessionId: 'sess1',
      token: 'tok1',
      socketId: 'sock1',
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
    
    const session = startOnlineRound(room.roomId, 2);
    expect(session.state.activeSeats).toEqual([1, 2]);
    expect(session.state.dealerSeat).toBe(1);
    
    const dealerPlayer = session.state.players.find(p => p.seat === session.state.dealerSeat)!;
    expect(dealerPlayer.isDealer).toBe(true);
    expect(dealerPlayer.hand.length).toBe(14);
  });
});
