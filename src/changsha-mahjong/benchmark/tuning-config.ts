export interface LookaheadTriggerConfig {
  enabled: boolean;
  maxTopK: number;
  depth: 1;
  budgetMs: number;
  onlyWhenShantenAtMost: number;
  skipInDefenseMode: boolean;
  scoreTieThreshold: number;
}

export interface AdvancedAITuningConfig {
  attackWeight: number;
  defenseWeight: number;
  routeWeight: number;
  lookaheadWeight: number;

  defenseSwitchRiskThreshold: number;
  foldWallRemainingThreshold: number;
  forceAttackShantenThreshold: number;

  lookaheadTopK: number;
  lookaheadDepth: 1 | 2;
  lookaheadBudgetMs: number;

  highRiskPenalty: number;
  criticalRiskPenalty: number;

  bigHuRouteBonus: number;
  fastHuShantenBonus: number;
  defensiveSafetyBonus: number;

  lookaheadTrigger?: LookaheadTriggerConfig;
}

export const DEFAULT_ADVANCED_AI_TUNING: AdvancedAITuningConfig = {
  attackWeight: 1.0,
  defenseWeight: 1.0,
  routeWeight: 1.0,
  lookaheadWeight: 0.0, // Default 0

  defenseSwitchRiskThreshold: 40,
  foldWallRemainingThreshold: 10,
  forceAttackShantenThreshold: 0,

  lookaheadTopK: 0, // Default 0
  lookaheadDepth: 1, // Default 1
  lookaheadBudgetMs: 0, // Default 0

  highRiskPenalty: 0,
  criticalRiskPenalty: 0,

  bigHuRouteBonus: 0,
  fastHuShantenBonus: 0,
  defensiveSafetyBonus: 0,

  lookaheadTrigger: {
    enabled: false, // Default false
    maxTopK: 0,
    depth: 1,
    budgetMs: 0,
    onlyWhenShantenAtMost: 1,
    skipInDefenseMode: true,
    scoreTieThreshold: 10,
  },
};

export let activeTuningConfig: AdvancedAITuningConfig = { ...DEFAULT_ADVANCED_AI_TUNING };

export function setActiveTuningConfig(config: AdvancedAITuningConfig) {
  activeTuningConfig = { ...config };
}

export type AdvancedAIMode = 'lite' | 'full' | 'basic';

export interface AdvancedAISettings {
  mode: AdvancedAIMode;
  enableLookahead: boolean;
  enableFullOpponentModeler: boolean;
  enableFullRoutePlanner: boolean;
}

export let activeAdvancedAISettings: AdvancedAISettings = {
  mode: 'lite',
  enableLookahead: false,
  enableFullOpponentModeler: false,
  enableFullRoutePlanner: false,
};

export function setActiveAdvancedAISettings(settings: AdvancedAISettings) {
  activeAdvancedAISettings = { ...settings };
}
