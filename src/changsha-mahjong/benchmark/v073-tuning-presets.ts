import { AdvancedAITuningConfig } from './tuning-config.js';

export const FAST_BALANCED_LITE_TUNING: AdvancedAITuningConfig = {
  attackWeight: 1.25,
  defenseWeight: 1.0,
  routeWeight: 0.45,
  lookaheadWeight: 0.2,
  defenseSwitchRiskThreshold: 42,
  foldWallRemainingThreshold: 8,
  forceAttackShantenThreshold: 1,
  lookaheadTopK: 2,
  lookaheadDepth: 1,
  lookaheadBudgetMs: 10,
  highRiskPenalty: 10,
  criticalRiskPenalty: 25,
  bigHuRouteBonus: 0.2,
  fastHuShantenBonus: 0.8,
  defensiveSafetyBonus: 0.2,
  lookaheadTrigger: {
    enabled: true,
    maxTopK: 2,
    depth: 1,
    budgetMs: 10,
    onlyWhenShantenAtMost: 1,
    skipInDefenseMode: true,
    scoreTieThreshold: 10,
  }
};

export const NO_LOOKAHEAD_FASTHU_TUNING: AdvancedAITuningConfig = {
  attackWeight: 1.4,
  defenseWeight: 0.9,
  routeWeight: 0.3,
  lookaheadWeight: 0.0,
  defenseSwitchRiskThreshold: 45,
  foldWallRemainingThreshold: 6,
  forceAttackShantenThreshold: 1,
  lookaheadTopK: 0,
  lookaheadDepth: 1,
  lookaheadBudgetMs: 0,
  highRiskPenalty: 8,
  criticalRiskPenalty: 22,
  bigHuRouteBonus: 0.1,
  fastHuShantenBonus: 1.0,
  defensiveSafetyBonus: 0.1,
  lookaheadTrigger: {
    enabled: false,
    maxTopK: 0,
    depth: 1,
    budgetMs: 0,
    onlyWhenShantenAtMost: 0,
    skipInDefenseMode: true,
    scoreTieThreshold: 0,
  }
};

export const DEFENSE_LITE_TUNING: AdvancedAITuningConfig = {
  attackWeight: 1.1,
  defenseWeight: 1.2,
  routeWeight: 0.5,
  lookaheadWeight: 0.1,
  defenseSwitchRiskThreshold: 36,
  foldWallRemainingThreshold: 10,
  forceAttackShantenThreshold: 1,
  lookaheadTopK: 1,
  lookaheadDepth: 1,
  lookaheadBudgetMs: 8,
  highRiskPenalty: 12,
  criticalRiskPenalty: 28,
  bigHuRouteBonus: 0.2,
  fastHuShantenBonus: 0.6,
  defensiveSafetyBonus: 0.3,
  lookaheadTrigger: {
    enabled: true,
    maxTopK: 1,
    depth: 1,
    budgetMs: 8,
    onlyWhenShantenAtMost: 1,
    skipInDefenseMode: true,
    scoreTieThreshold: 10,
  }
};

export const V073_PRESETS = [
  { name: 'fast-balanced-lite', config: FAST_BALANCED_LITE_TUNING },
  { name: 'no-lookahead-fastHu', config: NO_LOOKAHEAD_FASTHU_TUNING },
  { name: 'defense-lite', config: DEFENSE_LITE_TUNING },
];
