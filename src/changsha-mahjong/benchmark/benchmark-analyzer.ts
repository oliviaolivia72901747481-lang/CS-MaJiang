import { BenchmarkResult, BenchmarkSummaryMetrics } from './benchmark-types.js';

export function analyzeBenchmarkResult(result: BenchmarkResult): BenchmarkSummaryMetrics {
  const completedRounds = result.completedRounds;
  if (completedRounds < 15) {
    console.warn(`[WARNING] Benchmark completed rounds (${completedRounds}) is less than 15. The sample size might be too small for statistically significant conclusions.`);
  }

  const basicMetrics = result.playerMetrics.filter(m => m.aiEngine === 'basic');
  const advMetrics = result.playerMetrics.filter(m => m.aiEngine === 'advanced');

  const basicTotalScore = basicMetrics.reduce((sum, m) => sum + m.scoreDelta, 0);
  const basicAverageScore = basicMetrics.length > 0 && completedRounds > 0
    ? basicTotalScore / (completedRounds * basicMetrics.length)
    : 0;

  const advTotalScore = advMetrics.reduce((sum, m) => sum + m.scoreDelta, 0);
  const advAverageScore = advMetrics.length > 0 && completedRounds > 0
    ? advTotalScore / (completedRounds * advMetrics.length)
    : 0;

  const advancedScoreLift = advAverageScore - basicAverageScore;

  // Rates for Basic
  const basicWinCount = basicMetrics.reduce((sum, m) => sum + m.winCount, 0);
  const basicWinRate = basicMetrics.length > 0 && completedRounds > 0
    ? basicWinCount / (completedRounds * basicMetrics.length)
    : 0;

  const basicDealInCount = basicMetrics.reduce((sum, m) => sum + m.dealInCount, 0);
  const basicDealInRate = basicMetrics.length > 0 && completedRounds > 0
    ? basicDealInCount / (completedRounds * basicMetrics.length)
    : 0;

  const basicBigHuCount = basicMetrics.reduce((sum, m) => sum + m.bigHuCount, 0);
  const basicBigHuRate = basicMetrics.length > 0 && completedRounds > 0
    ? basicBigHuCount / (completedRounds * basicMetrics.length)
    : 0;

  // Rates for Advanced
  const advWinCount = advMetrics.reduce((sum, m) => sum + m.winCount, 0);
  const advWinRate = advMetrics.length > 0 && completedRounds > 0
    ? advWinCount / (completedRounds * advMetrics.length)
    : 0;

  const advDealInCount = advMetrics.reduce((sum, m) => sum + m.dealInCount, 0);
  const advDealInRate = advMetrics.length > 0 && completedRounds > 0
    ? advDealInCount / (completedRounds * advMetrics.length)
    : 0;

  const advBigHuCount = advMetrics.reduce((sum, m) => sum + m.bigHuCount, 0);
  const advBigHuRate = advMetrics.length > 0 && completedRounds > 0
    ? advBigHuCount / (completedRounds * advMetrics.length)
    : 0;

  // Performance (these are pre-profiled globally under the run)
  const advancedAverageDecisionMs = result.performance.averageDecisionMs || 0;
  const advancedMaxDecisionMs = result.performance.maxDecisionMs || 0;
  const advancedFallbackCount = result.performance.fallbackCount || 0;

  const finalMetrics: BenchmarkSummaryMetrics = {
    basicAverageScore: Number.isNaN(basicAverageScore) ? 0 : basicAverageScore,
    advancedAverageScore: Number.isNaN(advAverageScore) ? 0 : advAverageScore,
    advancedScoreLift: Number.isNaN(advancedScoreLift) ? 0 : advancedScoreLift,

    basicDealInRate: Number.isNaN(basicDealInRate) ? 0 : basicDealInRate,
    advancedDealInRate: Number.isNaN(advDealInRate) ? 0 : advDealInRate,

    basicWinRate: Number.isNaN(basicWinRate) ? 0 : basicWinRate,
    advancedWinRate: Number.isNaN(advWinRate) ? 0 : advWinRate,

    basicBigHuRate: Number.isNaN(basicBigHuRate) ? 0 : basicBigHuRate,
    advancedBigHuRate: Number.isNaN(advBigHuRate) ? 0 : advBigHuRate,

    advancedAverageDecisionMs: Number.isNaN(advancedAverageDecisionMs) ? 0 : advancedAverageDecisionMs,
    advancedMaxDecisionMs: Number.isNaN(advancedMaxDecisionMs) ? 0 : advancedMaxDecisionMs,
    advancedFallbackCount: Number.isNaN(advancedFallbackCount) ? 0 : advancedFallbackCount,

    completedRounds,
    drawRounds: result.drawRounds,
    advancedTotalDecisionCount: result.performance.totalDecisionCount || 0,
    totalRounds: result.totalRounds || result.completedRounds,
  };

  return finalMetrics;
}
