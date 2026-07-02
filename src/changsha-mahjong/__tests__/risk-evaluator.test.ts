import { describe, it, expect } from 'vitest';
import { evaluateTileRisk } from '../ai/risk-evaluator.js';
import { Tile } from '../types/tile.js';

describe('risk-evaluator', () => {
  it('1-2. should assign low risk to 3+ visible or dead tiles', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const visibleTiles: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'v1' },
      { suit: 'wan', rank: 5, instanceId: 'v2' },
      { suit: 'wan', rank: 5, instanceId: 'v3' },
      { suit: 'wan', rank: 5, instanceId: 'v4' },
    ];
    
    const risk = evaluateTileRisk({
      tile,
      visibleTiles,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 20,
    });
    expect(risk).toBe(0);
  });

  it('3. should assign high risk to unseen middle cards in late game', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    
    const riskEarly = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 2,
    });

    const riskLate = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 30,
    });

    expect(riskLate).toBeGreaterThan(riskEarly);
    expect(riskLate).toBeGreaterThan(30);
  });

  it('4. should assign 0 risk if the tile is safe by discards of all opponents', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    
    const risk = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: {
        0: [],
        1: [{ suit: 'wan', rank: 5, instanceId: 'd1' }],
        2: [{ suit: 'wan', rank: 5, instanceId: 'd2' }],
        3: [{ suit: 'wan', rank: 5, instanceId: 'd3' }],
      },
      selfSeat: 0,
      currentTurnCount: 25,
    });
    
    expect(risk).toBe(0);
  });

  it('6-7. should keep risk value between 0 and 100', () => {
    const tile: Tile = { suit: 'tong', rank: 5, instanceId: 't5' };
    const risk = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 100,
    });
    expect(risk).toBeLessThanOrEqual(100);
    expect(risk).toBeGreaterThanOrEqual(0);
  });

  it('8. should return higher risk for middle tile (5) than corner tile (9) under same conditions', () => {
    const t5: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const t9: Tile = { suit: 'wan', rank: 9, instanceId: 'w9' };
    
    const risk5 = evaluateTileRisk({
      tile: t5,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 10,
    });

    const risk9 = evaluateTileRisk({
      tile: t9,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 10,
    });

    expect(risk5).toBeGreaterThan(risk9);
  });

  it('9. should handle risk calculation when self is the only player discarding', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const risk = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: {
        0: [{ suit: 'wan', rank: 5, instanceId: 'w5_self' }],
        1: [],
        2: [],
        3: [],
      },
      selfSeat: 0,
      currentTurnCount: 10,
    });
    // Our own discard doesn't make it safe against opponents
    expect(risk).toBeGreaterThan(0);
  });

  it('10. should assign higher risk to a suit when opponent has discarded zero cards of it in late game', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const riskNormal = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: {
        0: [],
        1: [{ suit: 'wan', rank: 1, instanceId: 'w1' }, { suit: 'wan', rank: 2, instanceId: 'w2' }],
        2: [],
        3: [],
      },
      selfSeat: 0,
      currentTurnCount: 15,
    });

    const riskHoarding = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: {
        0: [],
        1: [
          { suit: 'tong', rank: 1, instanceId: 't1' },
          { suit: 'tong', rank: 2, instanceId: 't2' },
          { suit: 'tong', rank: 3, instanceId: 't3' },
          { suit: 'tiao', rank: 4, instanceId: 's4' },
          { suit: 'tiao', rank: 5, instanceId: 's5' },
          { suit: 'tiao', rank: 6, instanceId: 's6' },
          { suit: 'tong', rank: 7, instanceId: 't7' },
          { suit: 'tong', rank: 8, instanceId: 't8' },
          { suit: 'tong', rank: 9, instanceId: 't9' },
          { suit: 'tiao', rank: 1, instanceId: 's1' },
        ], // 10 discards, 0 in wan suit
        2: [],
        3: [],
      },
      selfSeat: 0,
      currentTurnCount: 15,
    });

    expect(riskHoarding).toBeGreaterThan(riskNormal);
  });

  it('11. should return 0 risk if the tile is safe against the only active opponents', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const risk = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: {
        0: [],
        1: [{ suit: 'wan', rank: 5, instanceId: 'w5_1' }],
        2: [{ suit: 'wan', rank: 5, instanceId: 'w5_2' }],
        3: [{ suit: 'wan', rank: 5, instanceId: 'w5_3' }],
      },
      selfSeat: 0,
      currentTurnCount: 10,
    });
    expect(risk).toBe(0);
  });

  it('12. should handle turn count progression correctly', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const riskEarly = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 0,
    });
    const riskLate = evaluateTileRisk({
      tile,
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      currentTurnCount: 80,
    });
    expect(riskLate).toBeGreaterThan(riskEarly);
  });
});
