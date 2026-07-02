import { describe, it, expect } from 'vitest';
import { collectRoundMetrics } from '../benchmark/ai-metrics-collector.js';
import { GameState } from '../types/game.js';

describe('AI Metrics Collector Tests', () => {
  function createMockFinalState(winnerSeat?: number, loserSeat?: number): GameState {
    return {
      phase: 'ended',
      dealerSeat: 0,
      winnerSeats: winnerSeat !== undefined ? [winnerSeat] : [],
      lastDiscard: loserSeat !== undefined ? {
        tile: { suit: 'wan', rank: 3, instanceId: 'w3' },
        fromSeat: loserSeat as any
      } : undefined,
      players: [
        { seat: 0, id: 'p0', hand: [], melds: [], discards: [], score: 12, isDealer: true, hasOpenedDoor: false },
        { seat: 1, id: 'p1', hand: [], melds: [{ type: 'peng', tiles: [], exposed: true }], discards: [], score: 0, isDealer: false, hasOpenedDoor: false },
        { seat: 2, id: 'p2', hand: [], melds: [], discards: [], score: -12, isDealer: false, hasOpenedDoor: false },
        { seat: 3, id: 'p3', hand: [], melds: [], discards: [], score: 0, isDealer: false, hasOpenedDoor: false },
      ],
      discards: { 0: [], 1: [], 2: [], 3: [] },
      logs: [
        { step: 1, phase: 'playing', seat: 0, action: '打出牌', detail: '三万' }
      ],
      config: {
        bird: { enabled: false },
      },
    } as any;
  }

  it('1. correctly collects score delta, wins, and deal ins', () => {
    const state = createMockFinalState(0, 2);
    const metrics = collectRoundMetrics({
      finalState: state,
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    });

    expect(metrics[0].scoreDelta).toBe(12);
    expect(metrics[0].winCount).toBe(1);
    expect(metrics[0].dealInCount).toBe(0);

    expect(metrics[2].scoreDelta).toBe(-12);
    expect(metrics[2].winCount).toBe(0);
    expect(metrics[2].dealInCount).toBe(1);
  });

  it('2. correctly counts chi/peng/gang and discards from log entries', () => {
    const state = createMockFinalState();
    const metrics = collectRoundMetrics({
      finalState: state,
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    });

    expect(metrics[0].discardCount).toBe(1);
    expect(metrics[1].pengCount).toBe(1);
  });

  it('3. ensures no metric yields NaN', () => {
    const state = createMockFinalState();
    const metrics = collectRoundMetrics({
      finalState: state,
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    });

    metrics.forEach(m => {
      expect(Number.isNaN(m.scoreDelta)).toBe(false);
      expect(Number.isNaN(m.winCount)).toBe(false);
      expect(Number.isNaN(m.dealInCount)).toBe(false);
    });
  });

  it('4. counts gang, chi and peng melds accurately even with empty hands', () => {
    const state = createMockFinalState();
    state.players[0].melds = [
      { type: 'chi', tiles: [], exposed: true },
      { type: 'mingGang', tiles: [], exposed: true }
    ];
    const metrics = collectRoundMetrics({
      finalState: state,
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    });

    expect(metrics[0].chiCount).toBe(1);
    expect(metrics[0].gangCount).toBe(1);
  });

  it('5. handles draw game metrics accurately', () => {
    const drawState = createMockFinalState(); // winnerSeats is empty
    const metrics = collectRoundMetrics({
      finalState: drawState,
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    });

    metrics.forEach(m => {
      expect(m.winCount).toBe(0);
      expect(m.dealInCount).toBe(0);
      expect(m.ziMoCount).toBe(0);
      expect(m.dianPaoWinCount).toBe(0);
    });
  });
});
