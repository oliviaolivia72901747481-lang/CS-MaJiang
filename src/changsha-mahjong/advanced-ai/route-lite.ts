import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { AIProfile } from '../ai/ai-types.js';

export function evaluateRouteHintsLite(input: {
  hand: Tile[];
  melds: Meld[];
  profile: AIProfile;
}): {
  qingYiSePotential: 'none' | 'weak' | 'strong';
  pengPengHuPotential: 'none' | 'weak' | 'strong';
  qiXiaoDuiPotential: 'none' | 'weak' | 'strong';
  jiangJiangHuPotential: 'none' | 'weak' | 'strong';
  reason: string;
} {
  const { hand, melds } = input;

  // 1. qingYiSe
  let qingYiSePotential: 'none' | 'weak' | 'strong' = 'none';
  const suitCounts = { wan: 0, tong: 0, tiao: 0 };
  for (const t of hand) {
    suitCounts[t.suit]++;
  }
  for (const m of melds) {
    for (const t of m.tiles) {
      suitCounts[t.suit as 'wan' | 'tong' | 'tiao']++;
    }
  }
  const maxSuit = Object.keys(suitCounts).reduce((a, b) => 
    suitCounts[a as keyof typeof suitCounts] > suitCounts[b as keyof typeof suitCounts] ? a : b
  ) as 'wan' | 'tong' | 'tiao';
  const maxCount = suitCounts[maxSuit];
  const hasOtherMeldSuits = melds.some(m => m.tiles.some(t => t.suit !== maxSuit));
  if (!hasOtherMeldSuits) {
    if (maxCount >= 10) qingYiSePotential = 'strong';
    else if (maxCount >= 8) qingYiSePotential = 'weak';
  }

  // Group hand frequencies
  const freq = new Map<string, number>();
  for (const t of hand) {
    const key = `${t.suit}_${t.rank}`;
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  // 2. qiXiaoDui
  let qiXiaoDuiPotential: 'none' | 'weak' | 'strong' = 'none';
  if (melds.length === 0) {
    let pairCount = 0;
    for (const c of freq.values()) {
      if (c >= 2) {
        pairCount += Math.floor(c / 2);
      }
    }
    if (pairCount >= 5) qiXiaoDuiPotential = 'strong';
    else if (pairCount === 4) qiXiaoDuiPotential = 'weak';
  }

  // 3. pengPengHu
  let pengPengHuPotential: 'none' | 'weak' | 'strong' = 'none';
  const hasChiMeld = melds.some(m => m.type === 'chi');
  if (!hasChiMeld) {
    let triplets = 0;
    let pairs = 0;
    for (const c of freq.values()) {
      if (c >= 3) {
        triplets++;
      } else if (c === 2) {
        pairs++;
      }
    }
    const totalGroups = melds.length + triplets + pairs;
    if (totalGroups >= 5) pengPengHuPotential = 'strong';
    else if (totalGroups === 4) pengPengHuPotential = 'weak';
  }

  // 4. jiangJiangHu
  let jiangJiangHuPotential: 'none' | 'weak' | 'strong' = 'none';
  const hasNonJiangMeld = melds.some(m => m.tiles.some(t => t.rank !== 2 && t.rank !== 5 && t.rank !== 8));
  if (!hasNonJiangMeld) {
    const jiangCount = hand.filter(t => t.rank === 2 || t.rank === 5 || t.rank === 8).length +
      melds.reduce((sum, m) => sum + m.tiles.filter(t => t.rank === 2 || t.rank === 5 || t.rank === 8).length, 0);

    if (jiangCount >= 10) jiangJiangHuPotential = 'strong';
    else if (jiangCount >= 8) jiangJiangHuPotential = 'weak';
  }

  const reason = `清一色:${qingYiSePotential}, 碰碰胡:${pengPengHuPotential}, 七小对:${qiXiaoDuiPotential}, 将将胡:${jiangJiangHuPotential}`;

  return {
    qingYiSePotential,
    pengPengHuPotential,
    qiXiaoDuiPotential,
    jiangJiangHuPotential,
    reason,
  };
}
