import { ExpectedValueResult, VisibleInformationForAI, RouteEvaluation, DefenseEvaluation, StrategyMode } from './advanced-ai-types.js';
import { Tile } from '../types/tile.js';
import { AIProfile } from '../ai/ai-types.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { getTileChineseName } from '../coach/hand-advisor.js';
import { activeTuningConfig } from '../benchmark/tuning-config.js';

function removeOneTile(hand: Tile[], tileKey: string): Tile[] {
  const [suit, rankStr] = tileKey.split('_');
  const rank = parseInt(rankStr, 10);
  let found = false;
  return hand.filter((t: Tile) => {
    if (!found && t.suit === suit && t.rank === rank) {
      found = true;
      return false;
    }
    return true;
  });
}

export function evaluateDiscardExpectedValues(input: {
  visible: VisibleInformationForAI;
  handEvaluation: { bestShanten: number; normalShanten: number; qiXiaoDuiShanten: number };
  routeEvaluations: RouteEvaluation[];
  defenseEvaluations: DefenseEvaluation[];
  strategyMode: StrategyMode;
  profile: AIProfile;
}): ExpectedValueResult[] {
  const { visible, routeEvaluations, defenseEvaluations, strategyMode, profile } = input;
  const results: ExpectedValueResult[] = [];

  const hand = visible.hand;
  const melds = visible.melds;
  const config = activeTuningConfig;

  // Group hand by unique keys
  const uniqueKeys = Array.from(new Set<string>(hand.map((t: Tile) => `${t.suit}_${t.rank}`)));

  // Identify the best route (highest score)
  const bestRouteEval = [...routeEvaluations].sort((a, b) => b.score - a.score)[0];
  const selectedRoute = bestRouteEval ? bestRouteEval.route : 'mixed';

  // Personality adjustments to weights
  let currentRouteWeight = config.routeWeight;
  let currentDefenseWeight = config.defenseWeight;
  let currentAttackWeight = config.attackWeight;

  if (profile.type === 'bigHu') {
    currentRouteWeight *= (1.0 + config.bigHuRouteBonus);
  }
  if (profile.type === 'defensive') {
    currentDefenseWeight *= (1.0 + config.defensiveSafetyBonus);
  }
  if (profile.type === 'fastHu') {
    currentAttackWeight *= (1.0 + config.fastHuShantenBonus);
  }

  for (const tileKey of uniqueKeys) {
    const tileChineseName = getTileChineseName(tileKey);
    const [suit, rankStr] = tileKey.split('_');
    const rank = parseInt(rankStr, 10);

    // 1. Simulate discarding this tile
    const handWithoutT = removeOneTile(hand, tileKey);
    const shantenAfter = calculateBestShanten(handWithoutT, melds).bestShanten;

    // Simple attack value: better shanten remaining means higher attack value
    const attackValue = (8 - shantenAfter) * 15;

    // 2. Defense risk from evaluations
    const defEval = defenseEvaluations.find((d: DefenseEvaluation) => d.tileKey === tileKey);
    const defenseRisk = defEval ? defEval.riskScore : 10;

    // 3. Route value based on target route
    let routeValue = 0;
    if (selectedRoute === 'qingYiSe') {
      // Find dominating suit of qingYiSe
      const targetSuitEval = routeEvaluations.find((r: RouteEvaluation) => r.route === 'qingYiSe');
      const desc = targetSuitEval ? targetSuitEval.reason : '';
      let targetSuit = '';
      if (desc.includes('万字')) targetSuit = 'wan';
      else if (desc.includes('筒子')) targetSuit = 'tong';
      else if (desc.includes('条子')) targetSuit = 'tiao';

      if (targetSuit && suit !== targetSuit) {
        routeValue = 50;
      } else {
        routeValue = -50;
      }
    } else if (selectedRoute === 'jiangJiangHu') {
      const isJiang = rank === 2 || rank === 5 || rank === 8;
      if (!isJiang) {
        routeValue = 40;
      } else {
        routeValue = -40;
      }
    } else if (selectedRoute === 'pengPengHu' || selectedRoute === 'qiXiaoDui') {
      const count = hand.filter((t: Tile) => t.suit === suit && t.rank === rank).length;
      if (count === 1) {
        routeValue = 30;
      } else if (count >= 2) {
        routeValue = -35;
      }
    }

    // 4. Expected Score calculation based on StrategyMode
    let expectedScore = 0;
    let strategyDesc = '';

    const highRiskPenalty = (defenseRisk > 40) ? config.highRiskPenalty : 0;
    const criticalRiskPenalty = (defenseRisk > 65) ? config.criticalRiskPenalty : 0;

    if (strategyMode === 'forceWin' || strategyMode === 'attack') {
      expectedScore = (attackValue * currentAttackWeight) + (routeValue * currentRouteWeight) - (defenseRisk * 0.15 * currentDefenseWeight) - highRiskPenalty - criticalRiskPenalty;
      strategyDesc = `当前为进攻态势，专注出牌效率，不惜承担少量放铳风险。`;
    } else if (strategyMode === 'balanced') {
      expectedScore = (attackValue * currentAttackWeight) + (routeValue * currentRouteWeight) - (defenseRisk * 0.6 * currentDefenseWeight) - highRiskPenalty - criticalRiskPenalty;
      strategyDesc = `当前攻守平衡，兼顾牌效与防御。`;
    } else if (strategyMode === 'defense') {
      expectedScore = (attackValue * 0.3 * currentAttackWeight) + (routeValue * currentRouteWeight) - (defenseRisk * 1.8 * currentDefenseWeight) - highRiskPenalty - criticalRiskPenalty;
      strategyDesc = `以防守避铳为主，优先选择安全牌。`;
    } else if (strategyMode === 'fold') {
      expectedScore = 100 - (defenseRisk * 2.5 * currentDefenseWeight) - highRiskPenalty - criticalRiskPenalty;
      strategyDesc = `处于绝对弃牌状态，选择防守危险度最低的牌舍弃。`;
    }

    // Personality profile adjustments
    if (profile.type === 'fastHu') {
      expectedScore += 10;
    } else if (profile.type === 'defensive') {
      expectedScore -= defenseRisk * 0.2;
    }

    expectedScore = Math.round(expectedScore);

    const reason = `打出 ${tileChineseName} 的估算期望分为 ${expectedScore}。${strategyDesc}其防守危险分 ${defenseRisk.toFixed(0)}，牌效进攻价值 ${attackValue}。`;

    results.push({
      tileKey,
      attackValue,
      defenseRisk,
      routeValue,
      expectedScore,
      reason,
    });
  }

  return results.sort((a, b) => b.expectedScore - a.expectedScore);
}
