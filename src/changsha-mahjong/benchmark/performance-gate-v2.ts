import { PerformanceBenchmarkV2Result } from './runtime-benchmark-runner.js';

export interface PerformanceGateV2Result {
  aiDecisionPassed: boolean;
  aiDecisionReasons: string[];
  gameLoopPassed: boolean;
  gameLoopReasons: string[];
  coldStartWarning: boolean;
  coldStartWarningMsg?: string;
  allPassed: boolean;
}

export function evaluatePerformanceGateV2(
  benchmarkRes: PerformanceBenchmarkV2Result
): PerformanceGateV2Result {
  const aiDist = benchmarkRes.aiDecisionDistribution;
  const loopDist = benchmarkRes.totalLoopDistribution;

  const aiReasons: string[] = [];
  if (aiDist.count === 0) {
    aiReasons.push('No warm-run AI decision samples recorded.');
  } else {
    if (aiDist.averageMs >= 10) {
      aiReasons.push(`Average decision time (${aiDist.averageMs.toFixed(2)}ms) >= 10ms`);
    }
    if (aiDist.p95Ms >= 20) {
      aiReasons.push(`P95 decision time (${aiDist.p95Ms.toFixed(2)}ms) >= 20ms`);
    }
    if (aiDist.p99Ms >= 50) {
      aiReasons.push(`P99 decision time (${aiDist.p99Ms.toFixed(2)}ms) >= 50ms`);
    }
    if (aiDist.maxMs >= 100) {
      aiReasons.push(`Max decision time (${aiDist.maxMs.toFixed(2)}ms) >= 100ms`);
    }
    if (aiDist.over80msRatio >= 0.01) {
      aiReasons.push(`Ratio of decisions exceeding 80ms (${(aiDist.over80msRatio * 100).toFixed(2)}%) >= 1%`);
    }
  }

  const loopReasons: string[] = [];
  if (loopDist.count === 0) {
    loopReasons.push('No warm-run game loop samples recorded.');
  } else {
    if (loopDist.averageMs >= 25) {
      loopReasons.push(`Average loop time (${loopDist.averageMs.toFixed(2)}ms) >= 25ms`);
    }
    if (loopDist.p95Ms >= 50) {
      loopReasons.push(`P95 loop time (${loopDist.p95Ms.toFixed(2)}ms) >= 50ms`);
    }
    if (loopDist.p99Ms >= 100) {
      loopReasons.push(`P99 loop time (${loopDist.p99Ms.toFixed(2)}ms) >= 100ms`);
    }
  }

  const aiDecisionPassed = aiReasons.length === 0;
  const gameLoopPassed = loopReasons.length === 0;

  const coldStartMax = benchmarkRes.coldStartSamples.length > 0
    ? Math.max(...benchmarkRes.coldStartSamples.map((s: any) => s.aiDecisionMs))
    : 0;

  const coldStartWarning = coldStartMax > 300;
  const coldStartWarningMsg = coldStartWarning
    ? `Cold start max decision time reached ${coldStartMax.toFixed(1)}ms. Production deployment should pre-warm the engine or show initial loading tips.`
    : undefined;

  return {
    aiDecisionPassed,
    aiDecisionReasons: aiReasons,
    gameLoopPassed,
    gameLoopReasons: loopReasons,
    coldStartWarning,
    coldStartWarningMsg,
    allPassed: aiDecisionPassed && gameLoopPassed,
  };
}
