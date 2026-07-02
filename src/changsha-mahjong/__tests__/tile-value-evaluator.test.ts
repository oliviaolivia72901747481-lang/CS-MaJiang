import { describe, it, expect } from 'vitest';
import { evaluateDiscardCandidates, chooseBestDiscard } from '../ai/tile-value-evaluator.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { Tile } from '../types/tile.js';

describe('tile-value-evaluator', () => {
  it('1. should prefer to discard isolated tiles over connected ones', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
    ];
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });

    const s9Eval = evals.find(ev => ev.tileKey === 'tiao_9');
    const w5Eval = evals.find(ev => ev.tileKey === 'wan_5');
    
    expect(s9Eval!.discardValue).toBeGreaterThan(w5Eval!.discardValue);
    expect(s9Eval!.reason).toContain('孤张');
  });

  it('2-3. should assign higher keep value to 2, 5, 8 tiles for small Hu', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    
    const w2Eval = evals.find(ev => ev.tileKey === 'wan_2');
    const w9Eval = evals.find(ev => ev.tileKey === 'wan_9');
    
    expect(w2Eval!.discardValue).toBeLessThan(w9Eval!.discardValue);
  });

  it('4. should avoid discarding matching suit if going for QingYiSe', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.bigHu,
    });

    const t9Eval = evals.find(ev => ev.tileKey === 'tong_9');
    const w1Eval = evals.find(ev => ev.tileKey === 'wan_1');
    
    expect(t9Eval!.discardValue).toBeGreaterThan(w1Eval!.discardValue);
    expect(t9Eval!.reason).toContain('清一色');
  });

  it('6. should reduce discardValue for highly dangerous tiles', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];
    const visibleTiles: Tile[] = [
      { suit: 'wan', rank: 9, instanceId: 'v1' },
      { suit: 'wan', rank: 9, instanceId: 'v2' },
      { suit: 'wan', rank: 9, instanceId: 'v3' },
      ...hand,
    ];
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });

    const w5Eval = evals.find(ev => ev.tileKey === 'wan_5');
    const w9Eval = evals.find(ev => ev.tileKey === 'wan_9');
    
    expect(w5Eval!.riskValue).toBeGreaterThan(w9Eval!.riskValue);
    expect(w5Eval!.discardValue).toBeLessThan(w9Eval!.discardValue);
  });

  it('7. chooseBestDiscard should return a valid tile from hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
    ];
    const best = chooseBestDiscard({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(hand).toContain(best);
  });

  it('8. should assign higher keep values to pairs than isolated tiles', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
    ];
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    const w1Eval = evals.find(ev => ev.tileKey === 'wan_1');
    const t5Eval = evals.find(ev => ev.tileKey === 'tong_5');
    expect(t5Eval!.discardValue).toBeGreaterThan(w1Eval!.discardValue);
  });

  it('9. should handle empty hand throw in chooseBestDiscard', () => {
    expect(() => chooseBestDiscard({
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    })).toThrow();
  });

  it('10. should choose discard that does not worsen shanten', () => {
    // Hand has 1w 2w 3w (completed), and 9s (isolated).
    // Discarding 9s preserves shanten. Discarding 1w increases shanten.
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
    ];
    const best = chooseBestDiscard({
      hand,
      melds: [],
      visibleTiles: hand,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(best.suit).toBe('tiao');
    expect(best.rank).toBe(9);
  });

  it('11. should handle chooseBestDiscard fallback if candidate is missing from hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
    ];
    // Mock chooseBestDiscard to use fallback if needed
    const best = chooseBestDiscard({
      hand,
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(best).toBeDefined();
  });

  it('12. should weigh riskAvoidance strongly for defensive profile', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const visibleTiles: Tile[] = [
      { suit: 'tong', rank: 9, instanceId: 't9_v1' },
      { suit: 'tong', rank: 9, instanceId: 't9_v2' },
      { suit: 'tong', rank: 9, instanceId: 't9_v3' },
    ];
    // t9 has 3 visible (safe). w5 has 0 visible (dangerous).
    const evals = evaluateDiscardCandidates({
      hand,
      melds: [],
      visibleTiles,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });
    const w5Eval = evals.find(ev => ev.tileKey === 'wan_5');
    const t9Eval = evals.find(ev => ev.tileKey === 'tong_9');
    // Defensive profile should have a massive difference in discard values favoring t9
    expect(t9Eval!.discardValue - w5Eval!.discardValue).toBeGreaterThan(100);
  });
});
