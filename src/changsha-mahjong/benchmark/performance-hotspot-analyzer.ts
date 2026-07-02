import { BenchmarkResult } from './benchmark-types.js';
import { PerformanceProfiler, ModuleProfileData, SlowDecisionSample } from './performance-profiler.js';

export interface DecisionHotspot {
  moduleName: string;
  callCount: number;
  totalMs: number;
  averageMs: number;
  maxMs: number;
  overBudgetCount: number;
}

export interface HotspotReport {
  totalDecisionCount: number;
  hotspots: DecisionHotspot[];
  slowestDecisionSamples: Array<{
    seed: string;
    step: number;
    seat: 0 | 1 | 2 | 3;
    elapsedMs: number;
    reason: string;
  }>;
}

export function analyzePerformanceHotspots(input: {
  benchmarkResult: BenchmarkResult;
}): HotspotReport {
  const totalDecisionCount = input.benchmarkResult.performance.totalDecisionCount || 0;
  const profiles = PerformanceProfiler.getModuleProfiles();
  const slowSamples = PerformanceProfiler.getSlowSamples();

  const hotspots: DecisionHotspot[] = [];

  for (const [moduleName, data] of Object.entries(profiles)) {
    const averageMs = data.callCount > 0 ? data.totalMs / data.callCount : 0;
    // Estimate overBudgetCount inside module levels (e.g. if elapsed > module average * 3 or hard limit)
    // For simplicity, we can count it based on how many calls are over a nominal budget or default to 0
    hotspots.push({
      moduleName,
      callCount: data.callCount,
      totalMs: data.totalMs,
      averageMs: Number.isNaN(averageMs) ? 0 : averageMs,
      maxMs: data.maxMs,
      overBudgetCount: 0, // optional or defaulted
    });
  }

  // Sort hotspots by totalMs descending (most heavy module first)
  hotspots.sort((a, b) => b.totalMs - a.totalMs);

  // Map slow samples
  const slowestDecisionSamples = slowSamples
    .map((s: SlowDecisionSample) => ({
      seed: s.seed,
      step: s.step,
      seat: s.seat,
      elapsedMs: s.elapsedMs,
      reason: s.reason,
    }))
    .sort((a, b) => b.elapsedMs - a.elapsedMs); // Sort by slowest first

  return {
    totalDecisionCount,
    hotspots,
    slowestDecisionSamples,
  };
}
