import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { isStandardHuStructure } from '../engine/hu-checker.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function calculateNormalShanten(hand: Tile[], melds: Meld[]): number {
  if (hand.length === 0) {
    return 8;
  }

  // If we already satisfy standard Hu structure, it is -1 (Hu)
  if (hand.length % 3 === 2 && isStandardHuStructure(hand)) {
    return -1;
  }

  // Count the tiles in the hand
  const counts = new Map<string, number>();
  for (const t of hand) {
    const key = getTileKey(t);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const keys = Array.from(counts.keys()).sort();
  let minShanten = 8;

  function findFirstNonZeroKey(): string | null {
    for (const k of keys) {
      if ((counts.get(k) || 0) > 0) return k;
    }
    return null;
  }

  function backtrack(currentM: number, currentP: number, currentK: number) {
    const firstKey = findFirstNonZeroKey();
    if (!firstKey) {
      const P = currentP;
      const K = currentK;
      const M = currentM + melds.length;
      let T_use = 0;
      let shanten = 8;
      if (P > 0) {
        T_use = Math.min(P - 1 + K, 4 - M);
        shanten = 8 - 2 * M - T_use - 1;
      } else {
        T_use = Math.min(K, 4 - M);
        shanten = 8 - 2 * M - T_use;
      }
      minShanten = Math.min(minShanten, shanten);
      return;
    }

    const c = counts.get(firstKey)!;
    const [suit, rankStr] = firstKey.split('_');
    const rank = parseInt(rankStr, 10);

    // 1. Triplet
    if (c >= 3) {
      counts.set(firstKey, c - 3);
      backtrack(currentM + 1, currentP, currentK);
      counts.set(firstKey, c);
    }

    // 2. Run
    if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
      if (rank <= 7) {
        const next1 = `${suit}_${rank + 1}`;
        const next2 = `${suit}_${rank + 2}`;
        const c1 = counts.get(next1) || 0;
        const c2 = counts.get(next2) || 0;
        if (c1 > 0 && c2 > 0) {
          counts.set(firstKey, c - 1);
          counts.set(next1, c1 - 1);
          counts.set(next2, c2 - 1);
          backtrack(currentM + 1, currentP, currentK);
          counts.set(firstKey, c);
          counts.set(next1, c1);
          counts.set(next2, c2);
        }
      }
    }

    // 3. Pair
    if (c >= 2) {
      counts.set(firstKey, c - 2);
      backtrack(currentM, currentP + 1, currentK);
      counts.set(firstKey, c);
    }

    // 4. Protomeld (r, r+1)
    if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
      if (rank <= 8) {
        const next1 = `${suit}_${rank + 1}`;
        const c1 = counts.get(next1) || 0;
        if (c1 > 0) {
          counts.set(firstKey, c - 1);
          counts.set(next1, c1 - 1);
          backtrack(currentM, currentP, currentK + 1);
          counts.set(firstKey, c);
          counts.set(next1, c1);
        }
      }
    }

    // 5. Protomeld (r, r+2)
    if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
      if (rank <= 7) {
        const next2 = `${suit}_${rank + 2}`;
        const c2 = counts.get(next2) || 0;
        if (c2 > 0) {
          counts.set(firstKey, c - 1);
          counts.set(next2, c2 - 1);
          backtrack(currentM, currentP, currentK + 1);
          counts.set(firstKey, c);
          counts.set(next2, c2);
        }
      }
    }

    // 6. Isolated
    counts.set(firstKey, c - 1);
    backtrack(currentM, currentP, currentK);
    counts.set(firstKey, c);
  }

  backtrack(0, 0, 0);

  return minShanten;
}

export function calculateQiXiaoDuiShanten(hand: Tile[]): number {
  if (hand.length === 0) {
    return 6;
  }
  const counts = new Map<string, number>();
  for (const t of hand) {
    const key = getTileKey(t);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let pairs = 0;
  for (const count of counts.values()) {
    pairs += Math.floor(count / 2);
  }

  return Math.max(-1, 6 - pairs);
}

export function calculateBestShanten(hand: Tile[], melds: Meld[]): {
  normalShanten: number;
  qiXiaoDuiShanten: number;
  bestShanten: number;
} {
  const normal = calculateNormalShanten(hand, melds);
  const qiXiaoDui = melds.length > 0 ? 99 : calculateQiXiaoDuiShanten(hand);
  return {
    normalShanten: normal,
    qiXiaoDuiShanten: qiXiaoDui,
    bestShanten: Math.min(normal, qiXiaoDui),
  };
}
