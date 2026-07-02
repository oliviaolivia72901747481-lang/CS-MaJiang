import { describe, it, expect } from 'vitest';
import { evaluateAIRegressionGateV074 } from '../benchmark/regression-gate.js';
import { BenchmarkSummaryMetrics } from '../benchmark/benchmark-types.js';
import { clearDecisionTraces, recordDecisionTrace } from '../benchmark/decision-trace-profiler.js';

describe('v0.7.4 Regression Gate Tests', () => {
  it('1. passes all gates when performance and strength are fully met', () => {
    clearDecisionTraces();
    recordDecisionTrace({
      seed: 'seed1',
      step: 1,
      seat: 0,
      actionType: 'discard',
      totalElapsedMs: 12.5,
      rootSpan: {
        name: 'root',
        startMs: 0,
        endMs: 12.5,
        elapsedMs: 12.5,
        children: [
          { name: 'child', startMs: 0, endMs: 11.0, elapsedMs: 11.0, children: [] }
        ]
      },
      exceededBudget: false,
    });

    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.1,
      advancedScoreLift: 0.1,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 12.5,
      advancedMaxDecisionMs: 65.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 1,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV074(metrics);
    expect(gateRes.performancePassed).toBe(true);
    expect(gateRes.softPassed).toBe(true);
    expect(gateRes.strictPassed).toBe(true);
  });

  it('2. fails performance gate when average decision time is >= 20ms', () => {
    clearDecisionTraces();
    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.1,
      advancedScoreLift: 0.1,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 25.0,
      advancedMaxDecisionMs: 65.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 1,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV074(metrics);
    expect(gateRes.performancePassed).toBe(false);
    expect(gateRes.performanceReasons[0]).toContain('average decision time');
  });

  it('3. fails performance gate when max decision time is >= 100ms', () => {
    clearDecisionTraces();
    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.1,
      advancedScoreLift: 0.1,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 12.0,
      advancedMaxDecisionMs: 120.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 1,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV074(metrics);
    expect(gateRes.performancePassed).toBe(false);
    expect(gateRes.performanceReasons[0]).toContain('max decision time');
  });

  it('4. fails performance gate when over 80ms ratio is >= 1%', () => {
    clearDecisionTraces();
    recordDecisionTrace({
      seed: 'seed1',
      step: 1,
      seat: 0,
      actionType: 'discard',
      totalElapsedMs: 95.0, // > 80ms
      rootSpan: {
        name: 'root',
        startMs: 0,
        endMs: 95.0,
        elapsedMs: 95.0,
        children: []
      },
      exceededBudget: false,
    });

    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.1,
      advancedScoreLift: 0.1,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 12.0,
      advancedMaxDecisionMs: 95.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 1, // 1/1 = 100% > 1% over 80ms
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV074(metrics);
    expect(gateRes.performancePassed).toBe(false);
    expect(gateRes.performanceReasons[0]).toContain('exceeding 80ms');
  });

  it('5. fails soft strength gate when win rate is extremely low', () => {
    clearDecisionTraces();
    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 0.9,
      advancedScoreLift: -0.1,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.3,
      advancedWinRate: 0.1, // Win rate diff = -0.2 < -0.05
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 12.0,
      advancedMaxDecisionMs: 65.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 1,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV074(metrics);
    expect(gateRes.softPassed).toBe(false);
    expect(gateRes.softReasons[0]).toContain('win rate');
  });
});
