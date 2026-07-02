import { AdvancedAITuningConfig } from './tuning-config.js';

export type AIEngineType = 'basic' | 'advanced';

export interface BenchmarkConfig {
  rounds: number;
  seeds: string[];
  aiEngines: Record<0 | 1 | 2 | 3, AIEngineType>;
  aiProfiles: Record<0 | 1 | 2 | 3, 'fastHu' | 'bigHu' | 'defensive' | 'balanced'>;
  maxStepsPerRound: number;
  decisionTimeBudgetMs: number;
}

export interface PlayerRoundMetrics {
  seat: 0 | 1 | 2 | 3;
  aiEngine: AIEngineType;
  profile: string;
  scoreDelta: number;
  winCount: number;
  dealInCount: number; // 放炮次数
  ziMoCount: number;   // 自摸胡次数
  dianPaoWinCount: number; // 吃点炮胡次数
  bigHuCount: number;
  smallHuCount: number;
  gangCount: number;
  chiCount: number;
  pengCount: number;
  discardCount: number;
  riskyDiscardCount: number;
}

export interface PerformanceMetrics {
  totalDecisionCount: number;
  averageDecisionMs: number;
  maxDecisionMs: number;
  overBudgetDecisionCount: number;
  fallbackCount: number;
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  totalRounds: number;
  completedRounds: number;
  drawRounds: number;
  playerMetrics: PlayerRoundMetrics[];
  performance: PerformanceMetrics;
  summary: string;
}

export interface BenchmarkSummaryMetrics {
  basicAverageScore: number;
  advancedAverageScore: number;
  advancedScoreLift: number;

  basicDealInRate: number;
  advancedDealInRate: number;

  basicWinRate: number;
  advancedWinRate: number;

  basicBigHuRate: number;
  advancedBigHuRate: number;

  advancedAverageDecisionMs: number;
  advancedMaxDecisionMs: number;
  advancedFallbackCount: number;

  completedRounds: number;
  drawRounds: number;

  advancedTotalDecisionCount: number;
  totalRounds: number;
}

export interface TuningCandidate {
  name: string;
  config: AdvancedAITuningConfig;
}

export interface TuningResult {
  candidateName: string;
  metrics: BenchmarkSummaryMetrics;
  passedRegressionGate: boolean;
  reason: string;
}

export interface DecisionTraceSpan {
  name: string;
  startMs: number;
  endMs: number;
  elapsedMs: number;
  children: DecisionTraceSpan[];
}

export interface DecisionTrace {
  seed: string;
  step: number;
  seat: 0 | 1 | 2 | 3;
  actionType: 'discard' | 'action';
  totalElapsedMs: number;
  rootSpan: DecisionTraceSpan;
  exceededBudget: boolean;
  warning?: string;
}
