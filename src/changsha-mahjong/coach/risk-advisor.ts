import { GameState } from '../types/game.js';
import { RiskAdvice } from './coach-types.js';
import { evaluateTileRisk } from '../ai/risk-evaluator.js';
import { getVisibleTiles, getTileChineseName } from './hand-advisor.js';
import { Tile } from '../types/tile.js';
import { buildVisibleStateForCoach } from './visible-state.js';

export function analyzeDiscardRisks(input: {
  state: GameState;
  humanSeat: 0;
}): RiskAdvice[] {
  const { state, humanSeat } = input;
  const visibleState = buildVisibleStateForCoach(state, humanSeat);
  const hand = visibleState.humanHand;

  if (hand.length === 0) return [];

  const visibleTiles = getVisibleTiles(visibleState);
  const discardsBySeat = visibleState.allDiscards;
  const currentTurnCount = Object.values(discardsBySeat).reduce((sum, d) => sum + d.length, 0);

  // Group hand by key to evaluate unique candidates
  const uniqueCandidates = new Map<string, Tile>();
  for (const t of hand) {
    const key = `${t.suit}_${t.rank}`;
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, t);
    }
  }

  const advices: RiskAdvice[] = [];

  for (const [key, t] of uniqueCandidates.entries()) {
    const riskScore = evaluateTileRisk({
      tile: t,
      visibleTiles,
      discardsBySeat,
      selfSeat: humanSeat,
      currentTurnCount,
    });

    const tileName = getTileChineseName(key);

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 30) riskLevel = 'high';
    else if (riskScore >= 12) riskLevel = 'medium';

    const visibleCount = visibleTiles.filter(v => v.suit === t.suit && v.rank === t.rank).length;

    let reason = '从已公开牌看，该牌的放铳风险可能较低，属于相对安全范围。';
    if (riskLevel === 'high') {
      if (visibleCount === 0) {
        reason = `${tileName}从公开牌看从未出现过，是高风险生张，打出可能有较高放铳风险。`;
      } else if (t.rank === 4 || t.rank === 5 || t.rank === 6) {
        reason = `${tileName}是中张，容易成为他人凑成顺子的核心，放铳风险可能极高。`;
      } else {
        reason = `该牌在各家已公开牌河中较为罕见，其他玩家可能有概率在听此牌。`;
      }
    } else if (riskLevel === 'medium') {
      reason = `该牌从已公开牌看已见 ${visibleCount} 张，虽不是纯生张但仍有他人凑成顺子或刻子的潜在风险。`;
    }

    advices.push({
      tileKey: key,
      tileName,
      riskScore,
      riskLevel,
      reason,
    });
  }

  // Sort by riskScore descending
  return advices.sort((a, b) => b.riskScore - a.riskScore);
}
