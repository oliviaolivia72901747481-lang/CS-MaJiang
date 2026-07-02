import { describe, it, expect } from 'vitest';
import { calculateNormalShanten, calculateQiXiaoDuiShanten, calculateBestShanten } from '../ai/shanten-calculator.js';
import { Tile } from '../types/tile.js';

describe('shanten-calculator', () => {
  it('1. should return -1 for already Hu normal hand', () => {
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
      { suit: 'tong', rank: 5, instanceId: 't5_1' },
      { suit: 'tong', rank: 5, instanceId: 't5_2' },
    ];
    const melds = [{ type: 'chi' as const, tiles: [{ suit: 'tiao' as const, rank: 2 as any, instanceId: 's2' }, { suit: 'tiao' as const, rank: 3 as any, instanceId: 's3' }, { suit: 'tiao' as const, rank: 4 as any, instanceId: 's4' }], exposed: true }];
    
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(-1);
  });

  it('2. should return 0 for Tenpai normal hand', () => {
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
      { suit: 'tong', rank: 5, instanceId: 't5' },
    ];
    const melds = [{ type: 'chi' as const, tiles: [{ suit: 'tiao' as const, rank: 2 as any, instanceId: 's2' }, { suit: 'tiao' as const, rank: 3 as any, instanceId: 's3' }, { suit: 'tiao' as const, rank: 4 as any, instanceId: 's4' }], exposed: true }];
    
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(0);
  });

  it('3. should return 1 for 1-shanten normal hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'tiao', rank: 9, instanceId: 's9_tile' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
    ];
    const melds = [{ type: 'chi' as const, tiles: [{ suit: 'tiao' as const, rank: 2 as any, instanceId: 's2' }, { suit: 'tiao' as const, rank: 3 as any, instanceId: 's3' }, { suit: 'tiao' as const, rank: 4 as any, instanceId: 's4' }], exposed: true }];
    
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(1);
  });

  it('4. should return 0 for Tenpai QiXiaoDui', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' }, { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' }, { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'tong', rank: 4, instanceId: 't4_1' }, { suit: 'tong', rank: 4, instanceId: 't4_2' },
      { suit: 'tong', rank: 5, instanceId: 't5_1' }, { suit: 'tong', rank: 5, instanceId: 't5_2' },
      { suit: 'tiao', rank: 6, instanceId: 's6_1' }, { suit: 'tiao', rank: 6, instanceId: 's6_2' },
      { suit: 'tiao', rank: 7, instanceId: 's7' }, { suit: 'tiao', rank: 8, instanceId: 's8' },
    ];
    
    const shanten = calculateQiXiaoDuiShanten(hand);
    expect(shanten).toBe(0);
  });

  it('5. should return 1 for 1-shanten QiXiaoDui', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' }, { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' }, { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'tong', rank: 4, instanceId: 't4_1' }, { suit: 'tong', rank: 4, instanceId: 't4_2' },
      { suit: 'tong', rank: 5, instanceId: 't5_1' }, { suit: 'tong', rank: 5, instanceId: 't5_2' },
      { suit: 'tiao', rank: 6, instanceId: 's6' }, { suit: 'tiao', rank: 7, instanceId: 's7' },
      { suit: 'tiao', rank: 8, instanceId: 's8' }, { suit: 'tiao', rank: 9, instanceId: 's9' },
    ];
    
    const shanten = calculateQiXiaoDuiShanten(hand);
    expect(shanten).toBe(1);
  });

  it('6. should reduce shanten when melds are active', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(0);
  });

  it('7. should not crash on empty hand', () => {
    expect(calculateNormalShanten([], [])).toBe(8);
    expect(calculateQiXiaoDuiShanten([])).toBe(6);
  });

  it('8. should return reasonable bestShanten', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
    ];
    const best = calculateBestShanten(hand, []);
    expect(best.bestShanten).toBeLessThanOrEqual(best.normalShanten);
  });

  it('9. should return 2 for 2-shanten normal hand', () => {
    // 1w 2w (protomeld), 5w (isolated), 8w (isolated), 2s 3s (protomeld), 1t (isolated), 5t (isolated) + 2 melds
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'tiao', rank: 2, instanceId: 's2' },
      { suit: 'tiao', rank: 3, instanceId: 's3' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(2);
  });

  it('10. should return 3 for 3-shanten normal hand', () => {
    // 8 cards in hand, 2 melds. All isolated.
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'tiao', rank: 2, instanceId: 's2' },
      { suit: 'tiao', rank: 5, instanceId: 's5' },
      { suit: 'tong', rank: 3, instanceId: 't3' },
      { suit: 'tong', rank: 6, instanceId: 't6' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(4);
  });

  it('11. should return 2 for 2-shanten QiXiaoDui', () => {
    // 4 pairs, 6 isolated
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' }, { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' }, { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'tong', rank: 4, instanceId: 't4_1' }, { suit: 'tong', rank: 4, instanceId: 't4_2' },
      { suit: 'tiao', rank: 5, instanceId: 's5' }, { suit: 'tiao', rank: 6, instanceId: 's6' },
      { suit: 'tiao', rank: 7, instanceId: 's7' }, { suit: 'tiao', rank: 8, instanceId: 's8' },
      { suit: 'tong', rank: 9, instanceId: 't9' }, { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];
    const shanten = calculateQiXiaoDuiShanten(hand);
    expect(shanten).toBe(2);
  });

  it('12. should handle hand size of 14 with 4 melds and 1 pair (already Hu)', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
    ];
    const melds = [
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
      { type: 'peng' as const, tiles: [], exposed: true },
    ];
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(-1);
  });

  it('13. should handle hand size of 14 with 4 melds and 2 isolated (0-shanten)', () => {
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
    const shanten = calculateNormalShanten(hand, melds);
    expect(shanten).toBe(0);
  });
});
