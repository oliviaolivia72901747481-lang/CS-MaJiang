import { describe, it, expect } from 'vitest';
import { evaluateRouteHintsLite } from '../advanced-ai/route-lite.js';
import { Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';

describe('Route Hints Lite Tests', () => {
  const profile = AI_PROFILES.balanced;

  it('1. detects strong qingYiSe when dominating suit count >= 10', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
      { suit: 'wan', rank: 9, instanceId: 'w9_2' },
    ];
    const hints = evaluateRouteHintsLite({ hand, melds: [], profile });
    expect(hints.qingYiSePotential).toBe('strong');
  });

  it('2. detects weak qingYiSe when dominating suit count is 8-9', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'tong', rank: 1, instanceId: 'to1' },
    ];
    const hints = evaluateRouteHintsLite({ hand, melds: [], profile });
    expect(hints.qingYiSePotential).toBe('weak');
  });

  it('3. detects qiXiaoDui strong when pair count >= 5', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'tong', rank: 3, instanceId: 'to3_1' },
      { suit: 'tong', rank: 3, instanceId: 'to3_2' },
      { suit: 'tong', rank: 4, instanceId: 'to4_1' },
      { suit: 'tong', rank: 4, instanceId: 'to4_2' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_1' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_2' },
    ];
    const hints = evaluateRouteHintsLite({ hand, melds: [], profile });
    expect(hints.qiXiaoDuiPotential).toBe('strong');
  });

  it('4. detects pengPengHu strong when triplets + pairs >= 5', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 1, instanceId: 'w1_3' },
      { suit: 'tong', rank: 2, instanceId: 'to2_1' },
      { suit: 'tong', rank: 2, instanceId: 'to2_2' },
      { suit: 'tong', rank: 2, instanceId: 'to2_3' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_1' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' },
      { suit: 'wan', rank: 4, instanceId: 'w4_2' },
      { suit: 'tong', rank: 5, instanceId: 'to5_1' },
      { suit: 'tong', rank: 5, instanceId: 'to5_2' },
    ];
    const hints = evaluateRouteHintsLite({ hand, melds: [], profile });
    expect(hints.pengPengHuPotential).toBe('strong');
  });

  it('5. detects jiangJiangHu strong when 2-5-8 count >= 10', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 2, instanceId: 'w2_1' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tong', rank: 2, instanceId: 'to2_1' },
      { suit: 'tong', rank: 5, instanceId: 'to5_1' },
      { suit: 'tong', rank: 8, instanceId: 'to8_1' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2_1' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5_1' },
      { suit: 'tiao', rank: 8, instanceId: 'ti8_1' },
    ];
    const hints = evaluateRouteHintsLite({ hand, melds: [], profile });
    expect(hints.jiangJiangHuPotential).toBe('strong');
  });

  it('6. returns qiXiaoDuiPotential = none if any meld exists', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const melds: any[] = [{ type: 'chi', tiles: [] }];
    const hints = evaluateRouteHintsLite({ hand, melds, profile });
    expect(hints.qiXiaoDuiPotential).toBe('none');
  });

  it('7. returns jiangJiangHuPotential = none if any non-jiang card is present in melds', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 2, instanceId: 'w2' }];
    const melds: any[] = [{ type: 'peng', tiles: [{ suit: 'wan', rank: 1, instanceId: 'w1' }] }];
    const hints = evaluateRouteHintsLite({ hand, melds, profile });
    expect(hints.jiangJiangHuPotential).toBe('none');
  });
});
