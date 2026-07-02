import { AdvancedAITuningConfig, DEFAULT_ADVANCED_AI_TUNING, setActiveTuningConfig } from './tuning-config.js';
import { BenchmarkSummaryMetrics, TuningCandidate, TuningResult } from './benchmark-types.js';
import { runAIMatch } from './ai-match-runner.js';
import { analyzeBenchmarkResult } from './benchmark-analyzer.js';
import { evaluateAIRegressionGate } from './regression-gate.js';

export const CONSERVATIVE_DEFENSE_TUNING: AdvancedAITuningConfig = {
  attackWeight: 0.8,
  defenseWeight: 1.5,
  routeWeight: 0.9,
  lookaheadWeight: 0.8,
  defenseSwitchRiskThreshold: 30,
  foldWallRemainingThreshold: 14,
  forceAttackShantenThreshold: 0,
  lookaheadTopK: 3,
  lookaheadDepth: 1,
  lookaheadBudgetMs: 20,
  highRiskPenalty: 15,
  criticalRiskPenalty: 35,
  bigHuRouteBonus: 0,
  fastHuShantenBonus: 0,
  defensiveSafetyBonus: 0.5,
};

export const BALANCED_DEFAULT_TUNING: AdvancedAITuningConfig = {
  ...DEFAULT_ADVANCED_AI_TUNING
};

export const AGGRESSIVE_ATTACK_TUNING: AdvancedAITuningConfig = {
  attackWeight: 1.4,
  defenseWeight: 0.6,
  routeWeight: 1.2,
  lookaheadWeight: 1.3,
  defenseSwitchRiskThreshold: 50,
  foldWallRemainingThreshold: 8,
  forceAttackShantenThreshold: 1,
  lookaheadTopK: 5,
  lookaheadDepth: 2,
  lookaheadBudgetMs: 25,
  highRiskPenalty: 0,
  criticalRiskPenalty: 10,
  bigHuRouteBonus: 15,
  fastHuShantenBonus: 10,
  defensiveSafetyBonus: 0,
};

export const TUNING_CANDIDATES: TuningCandidate[] = [
  { name: 'conservative-defense', config: CONSERVATIVE_DEFENSE_TUNING },
  { name: 'balanced-default', config: BALANCED_DEFAULT_TUNING },
  { name: 'aggressive-attack', config: AGGRESSIVE_ATTACK_TUNING },
];

export function runTuningCandidates(input: {
  candidates: TuningCandidate[];
  seeds: string[];
  rounds: number;
}): TuningResult[] {
  const { candidates, seeds, rounds } = input;
  const results: TuningResult[] = [];

  const originalConfig = { ...DEFAULT_ADVANCED_AI_TUNING };

  for (const candidate of candidates) {
    // 1. Apply candidate config
    setActiveTuningConfig(candidate.config);

    // 2. Run simulation match (seat 0/2 basic, seat 1/3 advanced for comparison)
    try {
      const benchmarkResult = runAIMatch({
        rounds,
        seeds,
        aiEngines: {
          0: 'basic',
          1: 'advanced',
          2: 'basic',
          3: 'advanced',
        },
        aiProfiles: {
          0: 'balanced',
          1: 'balanced',
          2: 'balanced',
          3: 'balanced',
        },
        maxStepsPerRound: 500,
        decisionTimeBudgetMs: candidate.config.lookaheadBudgetMs,
      });

      // 3. Analyze and evaluate gate
      const metrics = analyzeBenchmarkResult(benchmarkResult);
      const gateResult = evaluateAIRegressionGate(metrics);

      results.push({
        candidateName: candidate.name,
        metrics,
        passedRegressionGate: gateResult.passed,
        reason: gateResult.passed
          ? 'Passed all regression gate checks.'
          : `Failed checks: ${gateResult.reasons.join('; ')}`,
      });
    } catch (e: any) {
      // Handle runner crash gracefully
      results.push({
        candidateName: candidate.name,
        metrics: {
          basicAverageScore: 0,
          advancedAverageScore: 0,
          advancedScoreLift: 0,
          basicDealInRate: 0,
          advancedDealInRate: 0,
          basicWinRate: 0,
          advancedWinRate: 0,
          basicBigHuRate: 0,
          advancedBigHuRate: 0,
          advancedAverageDecisionMs: 0,
          advancedMaxDecisionMs: 0,
          advancedFallbackCount: 0,
          completedRounds: 0,
          drawRounds: 0,
          advancedTotalDecisionCount: 0,
          totalRounds: rounds,
        },
        passedRegressionGate: false,
        reason: `Runner crashed: ${e.message}`,
      });
    }
  }

  // Restore original config
  setActiveTuningConfig(originalConfig);

  return results;
}

export function recommendBestCandidate(
  results: TuningResult[],
  candidatesList: TuningCandidate[] = TUNING_CANDIDATES
): {
  candidateName: string;
  config: AdvancedAITuningConfig;
  reason: string;
} {
  // Filter passed candidates
  const passedCandidates = results.filter(r => r.passedRegressionGate);
  
  if (passedCandidates.length > 0) {
    // Sort by advancedScoreLift descending
    const sorted = [...passedCandidates].sort((a, b) => b.metrics.advancedScoreLift - a.metrics.advancedScoreLift);
    const best = sorted[0];
    const candidate = candidatesList.find(c => c.name === best.candidateName)!;
    return {
      candidateName: best.candidateName,
      config: candidate.config,
      reason: `推荐 '${best.candidateName}'：它通过了回归门且获得了最高的分数提升 (${best.metrics.advancedScoreLift.toFixed(2)} 分)。`,
    };
  }

  // If none passed, fallback to default or the one with highest score lift
  const sortedAll = [...results].sort((a, b) => b.metrics.advancedScoreLift - a.metrics.advancedScoreLift);
  const bestAll = sortedAll[0];
  const candidate = candidatesList.find(c => c.name === bestAll.candidateName) || candidatesList[0];

  return {
    candidateName: candidate.name,
    config: candidate.config,
    reason: `警告: 所有候选参数均未完全通过回归门。基于最高的分数提升选择 '${candidate.name}' 作为权宜推荐。`,
  };
}
