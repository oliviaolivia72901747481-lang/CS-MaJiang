import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { HandAdvice } from './coach-types.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { buildVisibleStateForCoach, VisibleStateForCoach } from './visible-state.js';

export function getVisibleTiles(visibleState: VisibleStateForCoach): Tile[] {
  return visibleState.revealedTiles;
}

export function getRemainingTileCount(visibleState: VisibleStateForCoach, tileKeys: string[]): number {
  const visible = visibleState.revealedTiles;
  const visibleCounts = new Map<string, number>();
  for (const t of visible) {
    const key = `${t.suit}_${t.rank}`;
    visibleCounts.set(key, (visibleCounts.get(key) || 0) + 1);
  }

  let totalCount = 0;
  for (const key of tileKeys) {
    const visibleCount = visibleCounts.get(key) || 0;
    const remaining = Math.max(0, 4 - visibleCount);
    totalCount += remaining;
  }
  return totalCount;
}

export function getEffectiveTilesForHand(hand: Tile[], melds: Meld[]): string[] {
  const currentBest = calculateBestShanten(hand, melds).bestShanten;
  if (currentBest <= -1) return [];

  const suits = ['wan', 'tong', 'tiao'] as const;
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const effectiveKeys: string[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      const tileKey = `${suit}_${rank}`;
      const tempTile: Tile = { suit, rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, instanceId: 'temp_eval' };
      const newShanten = calculateBestShanten([...hand, tempTile], melds).bestShanten;
      if (newShanten < currentBest) {
        effectiveKeys.push(tileKey);
      }
    }
  }
  return effectiveKeys;
}

export function analyzeHumanHand(input: {
  state: GameState;
  humanSeat: 0;
}): HandAdvice {
  const { state, humanSeat } = input;
  const visibleState = buildVisibleStateForCoach(state, humanSeat);
  const hand = visibleState.humanHand;
  const melds = visibleState.humanMelds;

  const shantenResult = calculateBestShanten(hand, melds);
  const effectiveTileKeys = getEffectiveTilesForHand(hand, melds);
  const effectiveTileCount = getRemainingTileCount(visibleState, effectiveTileKeys);

  // Summary builder using player视角估计/理论剩余张数
  let summary = `当前 ${shantenResult.bestShanten} 向听，根据公开牌估计有 ${effectiveTileKeys.length} 种共 ${effectiveTileCount} 张理论剩余张数。`;
  if (shantenResult.bestShanten === 0) {
    summary = `当前已听牌，根据公开牌估计有 ${effectiveTileKeys.length} 种共 ${effectiveTileCount} 张理论剩余张数，请耐心等待胡牌机会！`;
  } else if (shantenResult.bestShanten === -1) {
    summary = `手牌已达成胡牌结构！`;
  } else {
    if (shantenResult.qiXiaoDuiShanten < shantenResult.normalShanten) {
      summary += `手牌对子较多，可以考虑七小对方向。`;
    } else {
      summary += `打出冗余孤张可加快进张效率。`;
    }
  }

  return {
    normalShanten: shantenResult.normalShanten,
    qiXiaoDuiShanten: shantenResult.qiXiaoDuiShanten,
    bestShanten: shantenResult.bestShanten,
    effectiveTileKeys,
    effectiveTileCount,
    summary,
  };
}

export function getTileChineseName(tileKey: string): string {
  const parts = tileKey.split('_');
  if (parts.length < 2) return tileKey;
  const suitMap: Record<string, string> = { wan: '万', tong: '筒', tiao: '条' };
  const rankNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const rank = parseInt(parts[1], 10);
  const rankStr = rankNames[rank - 1] || parts[1];
  return `${rankStr}${suitMap[parts[0]] || parts[0]}`;
}
