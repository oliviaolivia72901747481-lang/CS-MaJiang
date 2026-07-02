import { BenchmarkSummaryMetrics } from './benchmark-types.js';
import { getDecisionTraces } from './decision-trace-profiler.js';

export interface AIRegressionGateResult {
  passed: boolean;
  reasons: string[];
  metrics: BenchmarkSummaryMetrics;
}

export interface AIRegressionGateResultV073 {
  softPassed: boolean;
  strictPassed: boolean;
  softReasons: string[];
  strictReasons: string[];
  metrics: BenchmarkSummaryMetrics;
}

export interface AIRegressionGateResultV074 {
  performancePassed: boolean;
  softPassed: boolean;
  strictPassed: boolean;
  performanceReasons: string[];
  softReasons: string[];
  strictReasons: string[];
  unaccountedTimeAvgMs: number;
  over80msRatio: number;
  metrics: BenchmarkSummaryMetrics;
}

export function evaluateAIRegressionGate(metrics: BenchmarkSummaryMetrics): AIRegressionGateResult {
  const reasons: string[] = [];

  if (metrics.advancedAverageScore < metrics.basicAverageScore) {
    reasons.push(`Advanced AI average score (${metrics.advancedAverageScore.toFixed(2)}) is lower than Basic AI average score (${metrics.basicAverageScore.toFixed(2)}).`);
  }

  if (metrics.advancedDealInRate > metrics.basicDealInRate + 0.05) {
    reasons.push(`Advanced AI deal-in rate (${(metrics.advancedDealInRate * 100).toFixed(1)}%) is higher than Basic AI deal-in rate (${(metrics.basicDealInRate * 100).toFixed(1)}%) by more than 5%.`);
  }

  if (metrics.advancedAverageDecisionMs >= 20) {
    reasons.push(`Advanced AI average decision time (${metrics.advancedAverageDecisionMs.toFixed(2)} ms) is >= 20ms.`);
  }

  if (metrics.advancedMaxDecisionMs >= 80) {
    reasons.push(`Advanced AI max decision time (${metrics.advancedMaxDecisionMs.toFixed(2)} ms) is >= 80ms.`);
  }

  const totalDecisions = metrics.advancedTotalDecisionCount;
  const fallbackLimit = Math.max(10, totalDecisions) * 0.01;
  if (metrics.advancedFallbackCount > fallbackLimit) {
    reasons.push(`Advanced AI fallback count (${metrics.advancedFallbackCount}) exceeds 1% of total decisions (${totalDecisions}, limit: ${fallbackLimit.toFixed(1)}).`);
  }

  if (metrics.completedRounds !== metrics.totalRounds) {
    reasons.push(`Completed rounds (${metrics.completedRounds}) does not match total rounds (${metrics.totalRounds}).`);
  }

  const keys = Object.keys(metrics) as Array<keyof BenchmarkSummaryMetrics>;
  for (const key of keys) {
    if (Number.isNaN(metrics[key])) {
      reasons.push(`Metric field '${key}' contains NaN.`);
    }
  }

  const passed = reasons.length === 0;

  return {
    passed,
    reasons,
    metrics,
  };
}

export function evaluateAIRegressionGateV073(metrics: BenchmarkSummaryMetrics): AIRegressionGateResultV073 {
  const softReasons: string[] = [];
  const strictReasons: string[] = [];

  const totalDecisions = metrics.advancedTotalDecisionCount;
  const fallbackLimit = Math.max(10, totalDecisions) * 0.01;

  if (metrics.advancedAverageScore < metrics.basicAverageScore - 0.5) {
    softReasons.push(`Advanced score (${metrics.advancedAverageScore.toFixed(2)}) is lower than Basic score minus 0.5 (${(metrics.basicAverageScore - 0.5).toFixed(2)}).`);
  }
  if (metrics.advancedDealInRate > metrics.basicDealInRate + 0.05) {
    softReasons.push(`Advanced deal-in rate (${(metrics.advancedDealInRate * 100).toFixed(1)}%) is higher than Basic deal-in rate (${(metrics.basicDealInRate * 100).toFixed(1)}%) by > 5%.`);
  }
  if (metrics.advancedAverageDecisionMs >= 25) {
    softReasons.push(`Advanced average decision time (${metrics.advancedAverageDecisionMs.toFixed(2)} ms) is >= 25ms.`);
  }
  if (metrics.advancedMaxDecisionMs >= 150) {
    softReasons.push(`Advanced max decision time (${metrics.advancedMaxDecisionMs.toFixed(2)} ms) is >= 150ms.`);
  }
  if (metrics.advancedFallbackCount > fallbackLimit) {
    softReasons.push(`Advanced fallback count (${metrics.advancedFallbackCount}) exceeds 1% of total decisions (${totalDecisions}).`);
  }

  if (metrics.advancedAverageScore < metrics.basicAverageScore) {
    strictReasons.push(`Advanced score (${metrics.advancedAverageScore.toFixed(2)}) is lower than Basic score (${metrics.basicAverageScore.toFixed(2)}).`);
  }
  if (metrics.advancedDealInRate > metrics.basicDealInRate + 0.05) {
    strictReasons.push(`Advanced deal-in rate (${(metrics.advancedDealInRate * 100).toFixed(1)}%) is higher than Basic deal-in rate (${(metrics.basicDealInRate * 100).toFixed(1)}%) by > 5%.`);
  }
  if (metrics.advancedAverageDecisionMs >= 20) {
    strictReasons.push(`Advanced average decision time (${metrics.advancedAverageDecisionMs.toFixed(2)} ms) is >= 20ms.`);
  }
  if (metrics.advancedMaxDecisionMs >= 80) {
    strictReasons.push(`Advanced max decision time (${metrics.advancedMaxDecisionMs.toFixed(2)} ms) is >= 80ms.`);
  }
  if (metrics.advancedFallbackCount > fallbackLimit) {
    strictReasons.push(`Advanced fallback count (${metrics.advancedFallbackCount}) exceeds 1% of total decisions (${totalDecisions}).`);
  }

  const softPassed = softReasons.length === 0;
  const strictPassed = strictReasons.length === 0;

  return {
    softPassed,
    strictPassed,
    softReasons,
    strictReasons,
    metrics,
  };
}

export function evaluateAIRegressionGateV074(
  metrics: BenchmarkSummaryMetrics
): AIRegressionGateResultV074 {
  const traces = getDecisionTraces();
  
  const totalDecisions = metrics.advancedTotalDecisionCount || traces.length || 1;
  const over80Count = traces.filter(t => t.totalElapsedMs > 80).length;
  const over80msRatio = over80Count / totalDecisions;

  let totalUnaccounted = 0;
  let tracedCount = 0;
  for (const t of traces) {
    const root = t.rootSpan;
    let childSum = 0;
    for (const c of root.children) {
      childSum += c.elapsedMs;
    }
    const unaccounted = Math.max(0, root.elapsedMs - childSum);
    totalUnaccounted += unaccounted;
    tracedCount++;
  }
  const unaccountedTimeAvgMs = tracedCount > 0 ? totalUnaccounted / tracedCount : 0;

  const performanceReasons: string[] = [];
  const softReasons: string[] = [];
  const strictReasons: string[] = [];

  // Performance Gate:
  if (metrics.advancedAverageDecisionMs >= 20) {
    performanceReasons.push(`Advanced average decision time (${metrics.advancedAverageDecisionMs.toFixed(2)} ms) is >= 20ms.`);
  }
  if (metrics.advancedMaxDecisionMs >= 100) {
    performanceReasons.push(`Advanced max decision time (${metrics.advancedMaxDecisionMs.toFixed(2)} ms) is >= 100ms.`);
  }
  if (over80msRatio >= 0.01) {
    performanceReasons.push(`Ratio of decisions exceeding 80ms (${(over80msRatio * 100).toFixed(2)}%) is >= 1%.`);
  }
  const fallbackLimit = Math.max(10, totalDecisions) * 0.01;
  if (metrics.advancedFallbackCount > fallbackLimit) {
    performanceReasons.push(`Fallback count (${metrics.advancedFallbackCount}) exceeds 1% of total decisions (${totalDecisions}).`);
  }
  if (unaccountedTimeAvgMs >= 5) {
    performanceReasons.push(`Average unaccounted time (${unaccountedTimeAvgMs.toFixed(2)} ms) is >= 5ms.`);
  }

  // Strength Soft Gate:
  if (metrics.advancedAverageScore < metrics.basicAverageScore - 0.5) {
    softReasons.push(`Advanced score (${metrics.advancedAverageScore.toFixed(2)}) is lower than Basic score minus 0.5 (${(metrics.basicAverageScore - 0.5).toFixed(2)}).`);
  }
  if (metrics.advancedDealInRate > metrics.basicDealInRate + 0.05) {
    softReasons.push(`Advanced deal-in rate (${(metrics.advancedDealInRate * 100).toFixed(1)}%) is higher than Basic deal-in rate (${(metrics.basicDealInRate * 100).toFixed(1)}%) by > 5%.`);
  }
  if (metrics.advancedWinRate < metrics.basicWinRate - 0.05) {
    softReasons.push(`Advanced win rate (${(metrics.advancedWinRate * 100).toFixed(1)}%) is lower than Basic win rate (${(metrics.basicWinRate * 100).toFixed(1)}%) by > 5%.`);
  }

  // Strength Strict Gate:
  if (metrics.advancedAverageScore < metrics.basicAverageScore) {
    strictReasons.push(`Advanced score (${metrics.advancedAverageScore.toFixed(2)}) is lower than Basic score (${metrics.basicAverageScore.toFixed(2)}).`);
  }
  if (metrics.advancedDealInRate > metrics.basicDealInRate + 0.05) {
    strictReasons.push(`Advanced deal-in rate (${(metrics.advancedDealInRate * 100).toFixed(1)}%) is higher than Basic deal-in rate (${(metrics.basicDealInRate * 100).toFixed(1)}%) by > 5%.`);
  }
  if (metrics.advancedWinRate < metrics.basicWinRate) {
    strictReasons.push(`Advanced win rate (${(metrics.advancedWinRate * 100).toFixed(1)}%) is lower than Basic win rate (${(metrics.basicWinRate * 100).toFixed(1)}%).`);
  }

  const performancePassed = performanceReasons.length === 0;
  const softPassed = softReasons.length === 0;
  const strictPassed = strictReasons.length === 0;

  return {
    performancePassed,
    softPassed,
    strictPassed,
    performanceReasons,
    softReasons,
    strictReasons,
    unaccountedTimeAvgMs,
    over80msRatio,
    metrics,
  };
}

export function getRegressionGateStatusString(gateResult: AIRegressionGateResult): string {
  if (gateResult.passed) {
    return 'Advanced AI 已通过回归门，性能与强度达标。';
  } else {
    return 'Advanced AI 当前未通过回归门，需要继续调参。\n未通过原因:\n' + gateResult.reasons.map(r => `- ${r}`).join('\n');
  }
}
