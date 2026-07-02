import { describe, it, expect } from 'vitest';
import { evaluateHand } from '../ai/hand-evaluator.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { Tile } from '../types/tile.js';

describe('hand-evaluator', () => {
  it('1-8. should evaluate hand metrics correctly', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' }, { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' }, { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' }, { suit: 'wan', rank: 4, instanceId: 'w4_2' },
      { suit: 'wan', rank: 5, instanceId: 'w5_1' }, { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'wan', rank: 6, instanceId: 'w6_1' }, { suit: 'wan', rank: 6, instanceId: 'w6_2' },
      { suit: 'wan', rank: 7, instanceId: 'w7_1' }, { suit: 'wan', rank: 7, instanceId: 'w7_2' },
    ];
    const profile = AI_PROFILES.balanced;
    const evalRes = evaluateHand(hand, [], [], profile);

    expect(evalRes.qiXiaoDuiShanten).toBe(-1);
    expect(evalRes.bestShanten).toBe(-1);
    expect(evalRes.qingYiSePotential).toBe(1.0);
    expect(evalRes.qiXiaoDuiPotential).toBe(1.0);
    expect(evalRes.pairCount).toBe(7);
    expect(evalRes.isolatedTileCount).toBe(0);
    expect(evalRes.summary).toContain('已胡牌');
  });

  it('should identify PengPengHu potential', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' }, { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' }, { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' }, { suit: 'wan', rank: 4, instanceId: 'w4_2' },
    ];
    const evalRes = evaluateHand(hand, [], [], AI_PROFILES.balanced);
    expect(evalRes.pengPengHuPotential).toBeGreaterThan(0.5);
  });

  it('3. should calculate 0 potential for QiXiaoDui and PengPengHu if door is open with Chi', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
    ];
    const melds = [
      { type: 'chi' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const evalRes = evaluateHand(hand, melds, [], AI_PROFILES.balanced);
    expect(evalRes.qiXiaoDuiPotential).toBe(0);
    expect(evalRes.pengPengHuPotential).toBe(0);
  });

  it('4. should calculate correct counts for melds and isolated tiles in hand-eval', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const evalRes = evaluateHand(hand, melds, [], AI_PROFILES.balanced);
    expect(evalRes.meldLikeCount).toBe(4);
    expect(evalRes.isolatedTileCount).toBe(2);
  });

  it('5. should return correct summary format for Tenpai hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const evalRes = evaluateHand(hand, melds, [], AI_PROFILES.balanced);
    expect(evalRes.summary).toContain('已听牌');
  });

  it('6. should evaluate correct QingYiSe potential for hybrid hands', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'tiao', rank: 5, instanceId: 's5' },
    ];
    const evalRes = evaluateHand(hand, [], [], AI_PROFILES.balanced);
    expect(evalRes.qingYiSePotential).toBe(2 / 14);
  });

  it('7. should identify zero potentials when hand is completely mixed with no dominant patterns', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tiao', rank: 5, instanceId: 's5' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const evalRes = evaluateHand(hand, [], [], AI_PROFILES.balanced);
    expect(evalRes.qiXiaoDuiPotential).toBe(0);
    expect(evalRes.pengPengHuPotential).toBe(0);
  });
});
