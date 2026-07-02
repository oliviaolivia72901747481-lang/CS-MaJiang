import { LookaheadResult, VisibleInformationForAI } from './advanced-ai-types.js';
import { AIProfile } from '../ai/ai-types.js';
import { Tile } from '../types/tile.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { getTileChineseName } from '../coach/hand-advisor.js';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';
import { activeTuningConfig } from '../benchmark/tuning-config.js';

function removeOneTile(hand: Tile[], tileKey: string): Tile[] {
  const [suit, rankStr] = tileKey.split('_');
  const rank = parseInt(rankStr, 10);
  let found = false;
  return hand.filter(t => {
    if (!found && t.suit === suit && t.rank === rank) {
      found = true;
      return false;
    }
    return true;
  });
}

export function runLookaheadSearch(input: {
  visible: VisibleInformationForAI;
  candidateTileKeys: string[];
  depth: 1 | 2;
  profile: AIProfile;
  startTime?: number;
  budgetMs?: number;
}): LookaheadResult[] {
  const { visible, candidateTileKeys, depth } = input;
  const results: LookaheadResult[] = [];

  const hand = visible.hand;
  const melds = visible.melds;
  const config = activeTuningConfig;

  // Pre-calculate visible counts
  const visibleCounts = new Map<string, number>();
  for (const t of visible.revealedTiles) {
    const key = `${t.suit}_${t.rank}`;
    visibleCounts.set(key, (visibleCounts.get(key) || 0) + 1);
  }

  const suits = ['wan', 'tong', 'tiao'] as const;
  const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  const searchStart = input.startTime || performance.now();
  const budget = input.budgetMs || config.lookaheadBudgetMs || 20; // Default to 20ms if 0
  let currentDepth = depth;

  for (const candidateKey of candidateTileKeys) {
    const tileName = getTileChineseName(candidateKey);

    // If already over budget, immediately return empty results and break the loop
    if ((performance.now() - searchStart) > budget) {
      results.push({
        tileKey: candidateKey,
        depth: currentDepth,
        expectedValue: 0,
        bestFutureTiles: [],
        riskSummary: `打出 ${tileName} 后，手牌向听数未展开（已超时）。`,
        reason: `前瞻超时：已达到预算时限 (${budget}ms)，跳过计算。`,
      });
      continue;
    }

    // Dynamic budget control: downgrade if we are running low on budget time
    if (currentDepth === 2 && (performance.now() - searchStart) > budget * 0.5) {
      currentDepth = 1;
      PerformanceProfiler.recordFallback();
    }

    const handAfterDiscard = removeOneTile(hand, candidateKey);
    const shantenAfterDiscard = calculateBestShanten(handAfterDiscard, melds).bestShanten;

    const bestFutureTiles: string[] = [];
    let expectedValue = 0;

    for (const suit of suits) {
      for (const rank of ranks) {
        const tKey = `${suit}_${rank}`;
        
        const visCount = visibleCounts.get(tKey) || 0;
        const remainingCount = Math.max(0, 4 - visCount);
        if (remainingCount === 0) continue;

        const drawTile: Tile = { suit, rank: rank as any, instanceId: 'sim_draw' };
        const handAfterDraw = [...handAfterDiscard, drawTile];
        const shantenAfterDraw = calculateBestShanten(handAfterDraw, melds).bestShanten;

        if (shantenAfterDraw < shantenAfterDiscard) {
          bestFutureTiles.push(tKey);
          const improvement = shantenAfterDiscard - shantenAfterDraw;
          expectedValue += remainingCount * improvement * 5;

          if (currentDepth === 2 && shantenAfterDraw > 0) {
            expectedValue += remainingCount * 1.5;
          }
        }
      }
    }

    const futureNames = bestFutureTiles.slice(0, 3).map(k => getTileChineseName(k)).join('、');
    const futureStr = bestFutureTiles.length > 0
      ? `后续进张可能包含 ${futureNames} 等牌（共 ${bestFutureTiles.length} 种）。`
      : '暂无直接改善进张牌。';

    results.push({
      tileKey: candidateKey,
      depth: currentDepth,
      expectedValue: Math.round(expectedValue),
      bestFutureTiles,
      riskSummary: `打出 ${tileName} 后，手牌向听数为 ${shantenAfterDiscard}。`,
      reason: `前瞻估算：${futureStr} 理论剩余进张折算分值为 ${Math.round(expectedValue)}。`,
    });
  }

  return results.sort((a, b) => b.expectedValue - a.expectedValue);
}
