import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { ChangshaRuleConfig } from '../types/rule-config.js';
import type { BigHuType, HuCheckInput, HuResult } from '../types/game.js';
import { countTiles } from './tile-engine.js';

export type { BigHuType, HuCheckInput, HuResult };

function canPartition(counts: Map<string, number>): boolean {
  let firstKey: string | null = null;
  for (const [key, count] of counts.entries()) {
    if (count > 0) {
      firstKey = key;
      break;
    }
  }

  if (firstKey === null) {
    return true;
  }

  const count = counts.get(firstKey)!;
  const [suit, rankStr] = firstKey.split('_');
  const rank = parseInt(rankStr, 10);

  // Try triplet (刻子)
  if (count >= 3) {
    counts.set(firstKey, count - 3);
    if (canPartition(counts)) {
      counts.set(firstKey, count);
      return true;
    }
    counts.set(firstKey, count);
  }

  // Try run (顺子)
  if (suit === 'wan' || suit === 'tong' || suit === 'tiao') {
    if (rank <= 7) {
      const next1Key = `${suit}_${rank + 1}`;
      const next2Key = `${suit}_${rank + 2}`;
      const c1 = counts.get(next1Key) || 0;
      const c2 = counts.get(next2Key) || 0;
      if (c1 > 0 && c2 > 0) {
        counts.set(firstKey, count - 1);
        counts.set(next1Key, c1 - 1);
        counts.set(next2Key, c2 - 1);
        if (canPartition(counts)) {
          counts.set(firstKey, count);
          counts.set(next1Key, c1);
          counts.set(next2Key, c2);
          return true;
        }
        counts.set(firstKey, count);
        counts.set(next1Key, c1);
        counts.set(next2Key, c2);
      }
    }
  }

  return false;
}

export function isStandardHuStructure(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }
  const counts = countTiles(tiles);

  for (const [key, count] of counts.entries()) {
    if (count >= 2) {
      const remainingCounts = new Map(counts);
      remainingCounts.set(key, count - 2);

      const sortedKeys = Array.from(remainingCounts.keys()).sort((a, b) => {
        const [suitA, rankAStr] = a.split('_');
        const [suitB, rankBStr] = b.split('_');
        const rankA = parseInt(rankAStr, 10);
        const rankB = parseInt(rankBStr, 10);
        const suitOrder: Record<string, number> = { wan: 0, tong: 1, tiao: 2 };
        if (suitA !== suitB) {
          return suitOrder[suitA] - suitOrder[suitB];
        }
        return rankA - rankB;
      });

      const sortedCounts = new Map<string, number>();
      for (const k of sortedKeys) {
        sortedCounts.set(k, remainingCounts.get(k)!);
      }

      if (canPartition(sortedCounts)) {
        return true;
      }
    }
  }
  return false;
}

export function has258Jiang(tiles: Tile[]): boolean {
  if (tiles.length % 3 !== 2) {
    return false;
  }
  const counts = countTiles(tiles);

  for (const [key, count] of counts.entries()) {
    const [, rankStr] = key.split('_');
    const rank = parseInt(rankStr, 10);
    if (rank !== 2 && rank !== 5 && rank !== 8) {
      continue;
    }
    if (count >= 2) {
      const remainingCounts = new Map(counts);
      remainingCounts.set(key, count - 2);

      const sortedKeys = Array.from(remainingCounts.keys()).sort((a, b) => {
        const [suitA, rankAStr] = a.split('_');
        const [suitB, rankBStr] = b.split('_');
        const rankA = parseInt(rankAStr, 10);
        const rankB = parseInt(rankBStr, 10);
        const suitOrder: Record<string, number> = { wan: 0, tong: 1, tiao: 2 };
        if (suitA !== suitB) {
          return suitOrder[suitA] - suitOrder[suitB];
        }
        return rankA - rankB;
      });

      const sortedCounts = new Map<string, number>();
      for (const k of sortedKeys) {
        sortedCounts.set(k, remainingCounts.get(k)!);
      }

      if (canPartition(sortedCounts)) {
        return true;
      }
    }
  }
  return false;
}

export function isSmallHu(tiles: Tile[], melds: Meld[], config: ChangshaRuleConfig): boolean {
  if (!isStandardHuStructure(tiles)) {
    return false;
  }

  if (config.smallHu.need258Jiang) {
    return has258Jiang(tiles);
  }

  return true;
}

export function getBigHuTypes(input: HuCheckInput): BigHuType[] {
  const allHandTiles = [...input.hand];
  if (input.winningTile) {
    allHandTiles.push(input.winningTile);
  }

  const bigHuTypes: BigHuType[] = [];
  const counts = countTiles(allHandTiles);
  const totalTileCount = allHandTiles.length;
  const hasMelds = input.melds.length > 0;

  // 1. Seven Pairs (七小对) & Deluxe Seven Pairs (豪华七小对)
  let isQiXiaoDui = false;
  let isHaoHuaQiXiaoDui = false;
  if (!hasMelds && totalTileCount === 14) {
    let allPairs = true;
    let hasFourOfAKind = false;
    for (const count of counts.values()) {
      if (count !== 2 && count !== 4) {
        allPairs = false;
        break;
      }
      if (count === 4) {
        hasFourOfAKind = true;
      }
    }
    if (allPairs) {
      if (hasFourOfAKind) {
        isHaoHuaQiXiaoDui = true;
        bigHuTypes.push('haoHuaQiXiaoDui');
      } else {
        isQiXiaoDui = true;
        bigHuTypes.push('qiXiaoDui');
      }
    }
  }

  // 2. JiangJiangHu (将将胡)
  const allTiles = [...allHandTiles, ...input.melds.flatMap(m => m.tiles)];
  const isJiangJiang = allTiles.length > 0 && allTiles.every(t => t.rank === 2 || t.rank === 5 || t.rank === 8);
  if (isJiangJiang) {
    bigHuTypes.push('jiangJiangHu');
  }

  // 3. PengPengHu (碰碰胡)
  const isStandard = isStandardHuStructure(allHandTiles);
  if (isStandard) {
    const hasChiMeld = input.melds.some(m => m.type === 'chi');
    if (!hasChiMeld) {
      let canPengPeng = false;
      for (const [key, count] of counts.entries()) {
        if (count >= 2) {
          let onlyTriplets = true;
          for (const [k, c] of counts.entries()) {
            const remainingCount = k === key ? c - 2 : c;
            if (remainingCount % 3 !== 0) {
              onlyTriplets = false;
              break;
            }
          }
          if (onlyTriplets) {
            canPengPeng = true;
            break;
          }
        }
      }
      if (canPengPeng) {
        bigHuTypes.push('pengPengHu');
      }
    }
  }

  // 4. QingYiSe (清一色)
  if (allTiles.length > 0) {
    const firstSuit = allTiles[0].suit;
    const isQingYiSe = allTiles.every(t => t.suit === firstSuit);
    if (isQingYiSe && (isStandard || isQiXiaoDui || isHaoHuaQiXiaoDui || isJiangJiang)) {
      bigHuTypes.push('qingYiSe');
    }
  }

  const canAnyHu = isStandard || isQiXiaoDui || isHaoHuaQiXiaoDui || isJiangJiang;

  if (canAnyHu) {
    if (input.context?.isGangShangKaiHua) {
      bigHuTypes.push('gangShangKaiHua');
    }

    if (input.context?.isQiangGangHu) {
      bigHuTypes.push('qiangGangHu');
    }

    if (input.context?.isHaiDiLaoYue) {
      bigHuTypes.push('haiDiLaoYue');
    }

    if (input.context?.isHaiDiPao) {
      bigHuTypes.push('haiDiPao');
    }

    if (input.melds.length === 4 && allHandTiles.length === 2 && input.winMethod === 'dianPao') {
      bigHuTypes.push('quanQiuRen');
    }

    if (input.context?.isTianHu) {
      bigHuTypes.push('tianHu');
    }

    if (input.context?.isDiHu) {
      bigHuTypes.push('diHu');
    }
  }

  return bigHuTypes;
}

export function canHu(input: HuCheckInput): HuResult {
  const allHandTiles = [...input.hand];
  if (input.winningTile) {
    allHandTiles.push(input.winningTile);
  }

  const bigHuTypes = getBigHuTypes(input);
  const isSmall = isSmallHu(allHandTiles, input.melds, input.config);

  const hasOpenedDoor = input.context?.hasOpenedDoor ?? input.melds.some(m => m.exposed);

  if (bigHuTypes.length === 0 && !isSmall) {
    return {
      canHu: false,
      bigHuTypes: [],
      isSmallHu: false,
      need258Jiang: input.config.smallHu.need258Jiang,
    };
  }

  if (bigHuTypes.length === 0 && isSmall) {
    if (input.config.openDoor.needOpenDoorForDianPaoHu && !hasOpenedDoor && input.winMethod === 'dianPao') {
      return {
        canHu: false,
        bigHuTypes: [],
        isSmallHu: false,
        need258Jiang: input.config.smallHu.need258Jiang,
      };
    }

    return {
      canHu: true,
      huCategory: 'smallHu',
      bigHuTypes: [],
      isSmallHu: true,
      need258Jiang: input.config.smallHu.need258Jiang,
    };
  }

  return {
    canHu: true,
    huCategory: 'bigHu',
    bigHuTypes,
    isSmallHu: isSmall,
    need258Jiang: input.config.smallHu.need258Jiang,
  };
}
