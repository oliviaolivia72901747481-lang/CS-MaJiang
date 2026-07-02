import { describe, it, expect } from 'vitest';
import { createInitialGameState, startRound, stepGame, isRoundEnded } from '../controller/game-engine.js';
import { GameState } from '../types/game.js';

function countAllTiles(state: GameState): number {
  let total = 0;
  for (const p of state.players) {
    total += p.hand.length;
    total += p.melds.reduce((sum, m) => sum + m.tiles.length, 0);
    total += p.discards.length;
  }
  total += state.wall.length;
  return total;
}

describe('game-engine', () => {
  it('1. should create initial state correctly', () => {
    const state = createInitialGameState();
    expect(state.phase).toBe('init');
    expect(state.players.length).toBe(4);
    expect(state.dealerSeat).toBe(0);
    expect(state.roundEnded).toBe(false);
  });

  it('2. should verify there are exactly 4 players', () => {
    const state = createInitialGameState();
    expect(state.players.map(p => p.seat)).toEqual([0, 1, 2, 3]);
  });

  it('3. should verify dealerSeat is correct', () => {
    const state = createInitialGameState();
    expect(state.dealerSeat).toBe(0);
    state.dealerSeat = 2;
    expect(state.dealerSeat).toBe(2);
  });

  it('4-5. should deal 14 tiles to dealer and 13 to other players on startRound', () => {
    let state = createInitialGameState();
    state.dealerSeat = 1;
    state = startRound(state, 'deal-test');
    
    expect(state.players[1].hand.length).toBe(14);
    expect(state.players[0].hand.length).toBe(13);
    expect(state.players[2].hand.length).toBe(13);
    expect(state.players[3].hand.length).toBe(13);
    
    expect(state.wall.length).toBe(55);
    expect(countAllTiles(state)).toBe(108);
  });

  it('6. should transition to startingHu or playing phase after startRound', () => {
    let state = createInitialGameState();
    state = startRound(state, 'hu-transition');
    expect(['startingHu', 'playing', 'waitingForResponses']).toContain(state.phase);
  });

  it('7. should record logs during startRound', () => {
    let state = createInitialGameState();
    state = startRound(state, 'logs-test');
    expect(state.logs.length).toBeGreaterThan(0);
  });

  it('8. should preserve exactly 108 tiles after stepGame', () => {
    let state = createInitialGameState();
    state = startRound(state, 'step-test');
    expect(countAllTiles(state)).toBe(108);
    
    state = stepGame(state);
    expect(countAllTiles(state)).toBe(108);
  });

  it('9. should verify that creating initial state with custom config works', () => {
    const customConfig = {
      baseScore: 10,
      scoreMode: 'changsha_6_6' as const,
      smallHu: { need258Jiang: false, dianPao: 5, ziMoEach: 10 },
      bigHu: { dianPao: 30, ziMoEach: 30, allowStacking: false },
      gang: { mingGang: 10, buGang: 5, anGang: 15, settleImmediately: true, refundOnDraw: true },
      bird: { enabled: false, count: 1 as const },
      openDoor: { needOpenDoorForDianPaoHu: false },
      startingHu: { enabled: false, scoreEach: 0, dealerBonusEach: 0 },
    };
    const state = createInitialGameState(customConfig);
    expect(state.config.baseScore).toBe(10);
    expect(state.config.smallHu.need258Jiang).toBe(false);
  });

  it('10. should verify isRoundEnded helper works', () => {
    const state = createInitialGameState();
    expect(isRoundEnded(state)).toBe(false);
    state.roundEnded = true;
    expect(isRoundEnded(state)).toBe(true);
  });

  it('11. should verify startRound clears previous round winnerSeats and scoreEvents', () => {
    let state = createInitialGameState();
    state.winnerSeats = [2];
    state.scoreEvents = [{ fromPlayerId: 'p0', toPlayerId: 'p2', score: 10, reason: 'test' }];
    state = startRound(state, 'clear-test');
    expect(state.winnerSeats).toEqual([]);
    expect(state.scoreEvents).toEqual([]);
  });
});
