import { describe, it, expect } from 'vitest';
import { createInitialGameState, startRound } from '../controller/game-engine.js';
import { settleRoundWin, settleDraw, applyScoreEventsToPlayers, buildSettlementSummary } from '../controller/settlement-controller.js';
import { GameState } from '../types/game.js';

describe('settlement-controller', () => {
  it('1. should settle DianPao Hu correctly', () => {
    let state = createInitialGameState();
    state = startRound(state, 'dianpao-settle');
    
    state.winnerSeats = [1];
    state.lastDiscard = {
      tile: { suit: 'wan', rank: 5, instanceId: 'w5_d' },
      fromSeat: 0,
    };
    
    state.players[1].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3' },
      { suit: 'tiao', rank: 4, instanceId: 'ti4' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_1' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_2' },
    ];
    state.players[1].hasOpenedDoor = true; // Required for DianPao Hu by default

    state = settleRoundWin(state);
    
    expect(state.phase).toBe('ended');
    expect(state.scoreEvents.length).toBeGreaterThan(0);
    expect(state.players[1].score).toBeGreaterThan(0);
    expect(state.players[0].score).toBeLessThan(0);
  });

  it('2. should settle ZiMo Hu correctly', () => {
    let state = createInitialGameState();
    state = startRound(state, 'zimo-settle');
    
    state.winnerSeats = [1];
    state.lastDiscard = undefined;
    
    state.players[1].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3' },
      { suit: 'tiao', rank: 4, instanceId: 'ti4' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_1' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_2' },
    ];

    state = settleRoundWin(state);
    
    expect(state.phase).toBe('ended');
    expect(state.players[1].score).toBeGreaterThan(0);
    expect(state.players[0].score).toBeLessThan(0);
    expect(state.players[2].score).toBeLessThan(0);
    expect(state.players[3].score).toBeLessThan(0);
  });

  it('3. should settle MultiHu (一炮多响) correctly', () => {
    let state = createInitialGameState();
    state = startRound(state, 'multihu-settle');
    
    state.winnerSeats = [1, 2];
    state.lastDiscard = {
      tile: { suit: 'wan', rank: 5, instanceId: 'w5_d' },
      fromSeat: 0,
    };
    
    state.players[1].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3' },
      { suit: 'tiao', rank: 4, instanceId: 'ti4' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_1' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_2' },
    ];
    state.players[1].hasOpenedDoor = true;

    state.players[2].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_2' },
      { suit: 'wan', rank: 6, instanceId: 'w6_2' },
      { suit: 'tong', rank: 7, instanceId: 't7_2' },
      { suit: 'tong', rank: 8, instanceId: 't8_2' },
      { suit: 'tong', rank: 9, instanceId: 't9_2' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2_2' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_2' },
      { suit: 'tiao', rank: 4, instanceId: 'ti4_2' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_3' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_4' },
    ];
    state.players[2].hasOpenedDoor = true;

    state = settleRoundWin(state);
    
    expect(state.phase).toBe('ended');
    expect(state.players[1].score).toBeGreaterThan(0);
    expect(state.players[2].score).toBeGreaterThan(0);
    expect(state.players[0].score).toBeLessThan(0);
  });

  it('4. should apply gang scores correctly to players', () => {
    let state = createInitialGameState();
    
    state.scoreEvents = [
      { fromPlayerId: state.players[1].id, toPlayerId: state.players[0].id, score: 2, reason: 'mingGang' }
    ];
    
    state = applyScoreEventsToPlayers(state);
    expect(state.players[0].score).toBe(2);
    expect(state.players[1].score).toBe(-2);
  });

  it('6. should not generate winner scores on draw', () => {
    let state = createInitialGameState();
    state = startRound(state, 'draw-score');
    
    state = settleDraw(state);
    expect(state.winnerSeats.length).toBe(0);
    expect(state.phase).toBe('ended');
  });

  it('7-8. should produce non-empty settlement summary containing winners and score changes', () => {
    let state = createInitialGameState();
    state = startRound(state, 'summary-test');
    
    state.winnerSeats = [0];
    state.players[0].score = 14;
    state.players[1].score = -14;
    
    const summary = buildSettlementSummary(state);
    expect(summary).toContain('赢家');
    expect(summary).toContain('玩家0');
    expect(summary).toContain('+14分');
  });
});
