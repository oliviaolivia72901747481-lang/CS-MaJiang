import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { AIProfile, HandEvaluation } from './ai-types.js';
import { calculateBestShanten, calculateQiXiaoDuiShanten } from './shanten-calculator.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function evaluateHand(
  hand: Tile[],
  melds: Meld[],
  visibleTiles: Tile[],
  profile: AIProfile
): HandEvaluation {
  // 1. Calculate shanten
  const shantenRes = calculateBestShanten(hand, melds);
  const bestShanten = shantenRes.bestShanten;

  // 2. Calculate effective tiles (effectiveTileKeys)
  const effectiveTileKeys: string[] = [];
  if (bestShanten >= 0) {
    const suits: Array<'wan' | 'tong' | 'tiao'> = ['wan', 'tong', 'tiao'];
    let vId = 0;
    for (const suit of suits) {
      for (let rank = 1; rank <= 9; rank++) {
        const virtualTile: Tile = {
          suit,
          rank: rank as any,
          instanceId: `v_${suit}_${rank}_${vId++}`,
        };
        const clonedHand = [...hand, virtualTile];
        const newShanten = calculateBestShanten(clonedHand, melds).bestShanten;
        if (newShanten < bestShanten) {
          effectiveTileKeys.push(`${suit}_${rank}`);
        }
      }
    }
  }

  // 3. Partition Hand to extract pairCount, meldLikeCount, isolatedTileCount
  const counts = new Map<string, number>();
  for (const t of hand) {
    const key = getTileKey(t);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const keys = Array.from(counts.keys()).sort();

  let bestM = 0;
  let bestP = 0;
  let bestK = 0;
  let minShanten = 8;

  function findFirstNonZeroKey(): string | null {
    for (const k of keys) {
      if ((counts.get(k) || 0) > 0) return k;
    }
    return null;
  }

  function partitionSearch(currentM: number, currentP: number, currentK: number) {
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

      if (shanten < minShanten) {
        minShanten = shanten;
        bestM = currentM;
        bestP = currentP;
        bestK = currentK;
      }
      return;
    }

    const c = counts.get(firstKey)!;
    const [suit, rankStr] = firstKey.split('_');
    const rank = parseInt(rankStr, 10);

    // Triplet
    if (c >= 3) {
      counts.set(firstKey, c - 3);
      partitionSearch(currentM + 1, currentP, currentK);
      counts.set(firstKey, c);
    }

    // Run
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
          partitionSearch(currentM + 1, currentP, currentK);
          counts.set(firstKey, c);
          counts.set(next1, c1);
          counts.set(next2, c2);
        }
      }
    }

    // Pair
    if (c >= 2) {
      counts.set(firstKey, c - 2);
      partitionSearch(currentM, currentP + 1, currentK);
      counts.set(firstKey, c);
    }

    // Protomeld (r, r+1)
    if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
      if (rank <= 8) {
        const next1 = `${suit}_${rank + 1}`;
        const c1 = counts.get(next1) || 0;
        if (c1 > 0) {
          counts.set(firstKey, c - 1);
          counts.set(next1, c1 - 1);
          partitionSearch(currentM, currentP, currentK + 1);
          counts.set(firstKey, c);
          counts.set(next1, c1);
        }
      }
    }

    // Protomeld (r, r+2)
    if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
      if (rank <= 7) {
        const next2 = `${suit}_${rank + 2}`;
        const c2 = counts.get(next2) || 0;
        if (c2 > 0) {
          counts.set(firstKey, c - 1);
          counts.set(next2, c2 - 1);
          partitionSearch(currentM, currentP, currentK + 1);
          counts.set(firstKey, c);
          counts.set(next2, c2);
        }
      }
    }

    // Isolated
    counts.set(firstKey, c - 1);
    partitionSearch(currentM, currentP, currentK);
    counts.set(firstKey, c);
  }

  partitionSearch(0, 0, 0);

  // Compute pairCount
  let pairCount = 0;
  const pairCounts = new Map<string, number>();
  for (const t of hand) {
    const key = getTileKey(t);
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }
  for (const count of pairCounts.values()) {
    pairCount += Math.floor(count / 2);
  }

  const meldLikeCount = melds.length + bestM + bestK;
  const isolatedTileCount = Math.max(0, hand.length - 3 * bestM - 2 * bestP - 2 * bestK);

  // 4. QingYiSe Potential
  let qingYiSePotential = 0;
  const meldSuits = Array.from(new Set(melds.filter(m => m.tiles && m.tiles.length > 0).map(m => m.tiles[0].suit)));
  if (meldSuits.length <= 1) {
    const suits: Array<'wan' | 'tong' | 'tiao'> = ['wan', 'tong', 'tiao'];
    const activeSuit = meldSuits[0];
    let maxCount = 0;
    for (const suit of suits) {
      if (activeSuit && suit !== activeSuit) {
        continue;
      }
      const inHand = hand.filter(t => t.suit === suit).length;
      const inMelds = melds.filter(m => m.tiles && m.tiles.length > 0 && m.tiles[0].suit === suit).reduce((sum, m) => sum + m.tiles.length, 0);
      const totalForSuit = inHand + inMelds;
      if (totalForSuit > maxCount) {
        maxCount = totalForSuit;
      }
    }
    qingYiSePotential = maxCount / 14;
  }

  // 5. PengPengHu Potential
  let pengPengHuPotential = 0;
  const hasChiMeld = melds.some(m => m.type === 'chi');
  if (!hasChiMeld) {
    const meldTriplets = melds.length; // all non-chi melds are triplets/kongs
    const handTriplets = bestM; // triplets found in best partition
    const handPairs = bestP;
    pengPengHuPotential = Math.min(1.0, (meldTriplets + handTriplets + handPairs) / 5);
  }

  // 6. QiXiaoDui Potential
  const qiXiaoDuiPotential = melds.length > 0 ? 0 : pairCount / 7;

  // 7. Summary
  const summary = `向听数: ${bestShanten === -1 ? '已胡牌' : bestShanten === 0 ? '已听牌' : bestShanten}, 有效进张: ${effectiveTileKeys.length}种, 对子数: ${pairCount}, 孤张数: ${isolatedTileCount}`;

  return {
    normalShanten: shantenRes.normalShanten,
    qiXiaoDuiShanten: shantenRes.qiXiaoDuiShanten,
    bestShanten,
    effectiveTileKeys,
    qingYiSePotential,
    pengPengHuPotential,
    qiXiaoDuiPotential,
    pairCount,
    meldLikeCount,
    isolatedTileCount,
    summary,
  };
}
