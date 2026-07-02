import { describe, it, expect } from 'vitest';
import { getStartingHuTypes } from '../engine/starting-hu-checker.js';
import { Tile } from '../types/tile.js';

function makeTiles(str: string): Tile[] {
  const parts = str.trim().split(/\s+/);
  return parts.map((part, index) => {
    const rank = parseInt(part[0], 10);
    const suitChar = part[1];
    let suit: 'wan' | 'tong' | 'tiao' = 'wan';
    if (suitChar === 't') suit = 'tong';
    if (suitChar === 's') suit = 'tiao';
    return {
      suit,
      rank: rank as any,
      instanceId: `t_${suit}_${rank}_${index}`,
    };
  });
}

describe('starting-hu-checker', () => {
  it('1. should identify QueYiSe (missing a suit)', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 1w 2w 3w 4w');
    const result = getStartingHuTypes(hand, false);
    expect(result).toContain('queYiSe');
  });

  it('2. should identify BanBanHu (no 2, 5, 8)', () => {
    const hand = makeTiles('1w 3w 4w 6w 7w 9w 1t 3t 4t 6t 7t 9t 1s');
    const result = getStartingHuTypes(hand, false);
    expect(result).toContain('banBanHu');
  });

  it('3. should identify LiuLiuShun (at least two triplets)', () => {
    const hand = makeTiles('1w 1w 1w 2t 2t 2t 3s 4s 5s 6w 7w 8w 9w');
    const result = getStartingHuTypes(hand, false);
    expect(result).toContain('liuLiuShun');
  });

  it('4. should identify SiXi (at least one quad)', () => {
    const hand = makeTiles('1w 1w 1w 1w 2t 3t 4t 5s 6s 7s 8s 9s 9s');
    const result = getStartingHuTypes(hand, false);
    expect(result).toContain('siXi');
  });

  it('5. should identify multiple starting Hus simultaneously', () => {
    const hand = makeTiles('1w 1w 1w 1w 3t 3t 3t 4t 6t 7t 9t 3w 3w');
    const result = getStartingHuTypes(hand, false);
    expect(result).toContain('queYiSe');
    expect(result).toContain('banBanHu');
    expect(result).toContain('siXi');
  });
});
