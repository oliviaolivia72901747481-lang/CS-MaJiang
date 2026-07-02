import { StrategyMode, RouteEvaluation, DefenseEvaluation } from './advanced-ai-types.js';
import { AIProfile } from '../ai/ai-types.js';
import { activeTuningConfig } from '../benchmark/tuning-config.js';

export function decideStrategyMode(input: {
  handEvaluation: { bestShanten: number; normalShanten: number; qiXiaoDuiShanten: number };
  routeEvaluations: RouteEvaluation[];
  defenseEvaluations: DefenseEvaluation[];
  wallRemainingCount: number;
  currentScore: number;
  profile: AIProfile;
}): {
  strategyMode: StrategyMode;
  reason: string;
} {
  const { handEvaluation, defenseEvaluations, routeEvaluations, wallRemainingCount, profile } = input;
  const shanten = handEvaluation.bestShanten;
  const config = activeTuningConfig;

  // Thresholds from config
  const riskThreshold = config.defenseSwitchRiskThreshold;
  const wallThreshold = config.foldWallRemainingThreshold;
  const forceAttackShanten = config.forceAttackShantenThreshold;

  // Check threats
  const hasCriticalThreat = defenseEvaluations.some(d => d.riskLevel === 'critical' || d.riskScore > 65);
  const hasHighThreat = defenseEvaluations.some(d => d.riskLevel === 'high' || d.riskScore > riskThreshold);

  // Big Hu profile check: retains attack if big Hu potential is high
  const bestRoute = [...routeEvaluations].sort((a, b) => b.score - a.score)[0];
  const hasHighBigHuPotential = bestRoute && bestRoute.route !== 'smallHu' && bestRoute.route !== 'mixed' && bestRoute.score > 50;

  // 1. Shanten <= forceAttackShanten (0 向听时强攻)
  if (shanten <= forceAttackShanten) {
    if (hasCriticalThreat && profile.type === 'defensive') {
      return {
        strategyMode: 'balanced',
        reason: '虽然手牌已听牌，但手牌中含有对其他玩家的极高风险牌，防守型性格选择适度攻守兼顾。',
      };
    }
    return {
      strategyMode: 'forceWin',
      reason: '手牌已听牌或已胡牌，选择强攻模式以期尽快和牌。',
    };
  }

  // 2. Wall remaining count < wallThreshold (剩余牌少于阈值更容易 fold / defense)
  if (wallRemainingCount < wallThreshold) {
    let shouldFold = shanten >= 3 || hasHighThreat;
    if (profile.type === 'defensive') {
      shouldFold = shanten >= 2 || hasHighThreat; // defensive folds earlier
    }
    if (profile.type === 'fastHu') {
      shouldFold = shanten >= 4 || (hasCriticalThreat && shanten >= 2); // fastHu folds later
    }

    if (shouldFold) {
      return {
        strategyMode: 'fold',
        reason: '牌局已至尾声且摸牌墙所剩无几，选择彻底弃牌避铳以求安全流局。',
      };
    }
    return {
      strategyMode: 'defense',
      reason: '牌局尾声且进张机会有限，转入防守模式打出低风险牌。',
    };
  }

  // 3. Shanten === 1 (1 向听)
  if (shanten === 1) {
    if (hasCriticalThreat) {
      if (profile.type === 'defensive') {
        return {
          strategyMode: 'defense',
          reason: '手牌虽已一向听，但存在极高放铳威胁生张，防守性格选择优先避铳。',
        };
      }
      return {
        strategyMode: 'balanced',
        reason: '手牌一向听进攻价值较高，但因存在危险牌，选择折中平衡处理。',
      };
    }
    
    // Risk is controllable
    let mode: StrategyMode = 'balanced';
    if (profile.type === 'fastHu' || profile.type === 'balanced' || (profile.type === 'bigHu' && hasHighBigHuPotential)) {
      mode = 'attack';
    }
    return {
      strategyMode: mode,
      reason: mode === 'attack'
        ? '手牌处于一向听的进攻黄金期，进张效率高，优先全力进攻。'
        : '手牌已达一向听，选择常规的攻守平衡策略推牌。',
    };
  }

  // 4. Shanten >= 2 (2 向听及以上，且对手疑似听牌转防守)
  if (shanten >= 2) {
    let enterDefense = hasCriticalThreat || hasHighThreat;
    if (profile.type === 'defensive') {
      enterDefense = enterDefense || shanten >= 3; // defensive enters defense earlier
    }

    // fastHu profile enters defense later
    if (profile.type === 'fastHu') {
      enterDefense = hasCriticalThreat;
    }

    // bigHu profile retains attack if big Hu potential is high
    if (profile.type === 'bigHu' && hasHighBigHuPotential && shanten === 2) {
      enterDefense = false;
    }

    if (enterDefense) {
      return {
        strategyMode: 'defense',
        reason: '手牌距离听牌较远且面临对手疑似听牌的高风险，转向防守避让。',
      };
    }

    if (profile.type === 'defensive') {
      return {
        strategyMode: 'defense',
        reason: '防守型性格在手牌尚未成型时，倾向于保留安全牌，走守势路线。',
      };
    }

    if (profile.type === 'fastHu' && shanten === 2) {
      return {
        strategyMode: 'attack',
        reason: '快胡型性格在两向听时依然倾向积极进攻，尽可能优化牌效。',
      };
    }
  }

  // Default
  return {
    strategyMode: 'balanced',
    reason: '当前局势未见极端威胁且手牌处于正常发展期，保持攻守平衡策略。',
  };
}
