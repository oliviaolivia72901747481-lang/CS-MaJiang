import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { settleRoundWin } from '../../changsha-mahjong/controller/settlement-controller.js';

const winningHand = [
  { id: 1, suit: 'wan', rank: 1, instanceId: 'w1' },
  { id: 2, suit: 'wan', rank: 2, instanceId: 'w2' },
  { id: 3, suit: 'wan', rank: 3, instanceId: 'w3' },
  { id: 4, suit: 'wan', rank: 1, instanceId: 'w4' },
  { id: 5, suit: 'wan', rank: 2, instanceId: 'w5' },
  { id: 6, suit: 'wan', rank: 3, instanceId: 'w6' },
  { id: 7, suit: 'wan', rank: 4, instanceId: 'w7' },
  { id: 8, suit: 'wan', rank: 5, instanceId: 'w8' },
  { id: 9, suit: 'wan', rank: 6, instanceId: 'w9' },
  { id: 10, suit: 'wan', rank: 7, instanceId: 'w10' },
  { id: 11, suit: 'wan', rank: 8, instanceId: 'w11' },
  { id: 12, suit: 'wan', rank: 9, instanceId: 'w12' },
  { id: 13, suit: 'wan', rank: 5, instanceId: 'w13' },
  { id: 14, suit: 'wan', rank: 5, instanceId: 'w14' }
] as any[];

describe('Variable Player Settlement Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. 2-player ZiMo settlement: only bills active opponents', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    // Force ZiMo win for seat 0
    state.winnerSeats = [0];
    state.lastDiscard = undefined; // ZiMo
    
    const p0 = state.players.find(p => p.seat === 0)!;
    const p1 = state.players.find(p => p.seat === 1)!;
    
    p0.hand = [...winningHand];
    p0.score = 0;
    p1.score = 0;

    const resultState = settleRoundWin(state);

    const rp0 = resultState.players.find(p => p.seat === 0)!;
    const rp1 = resultState.players.find(p => p.seat === 1)!;

    // Base ZiMo is 2 points (since SmallHu is 2 points each), so p0 gets +2 from p1, p1 gets -2.
    // Let's verify score changes:
    expect(rp0.score).toBeGreaterThan(0);
    expect(rp1.score).toBeLessThan(0);

    // Inactive seats should have no score entries
    expect(resultState.players.find(p => p.seat === 2)).toBeUndefined();
    expect(resultState.players.find(p => p.seat === 3)).toBeUndefined();
  });

  it('2. 3-player ZiMo settlement: only bills 2 active opponents', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');

    const session = startOnlineRound(room.roomId, 3);
    const state = session.state;

    // Force ZiMo win for seat 0
    state.winnerSeats = [0];
    state.lastDiscard = undefined; // ZiMo
    
    const p0 = state.players.find(p => p.seat === 0)!;
    const p1 = state.players.find(p => p.seat === 1)!;
    const p2 = state.players.find(p => p.seat === 2)!;

    p0.hand = [...winningHand];
    p0.score = 0;
    p1.score = 0;
    p2.score = 0;

    const resultState = settleRoundWin(state);

    const rp0 = resultState.players.find(p => p.seat === 0)!;
    const rp1 = resultState.players.find(p => p.seat === 1)!;
    const rp2 = resultState.players.find(p => p.seat === 2)!;

    // Winner gets points from both active opponents
    expect(rp0.score).toBeGreaterThan(0);
    expect(rp1.score).toBeLessThan(0);
    expect(rp2.score).toBeLessThan(0);
  });
});
