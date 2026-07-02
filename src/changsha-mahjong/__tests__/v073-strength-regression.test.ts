import { describe, it, expect } from 'vitest';
import { runV073TuningRunner } from '../benchmark/v073-benchmark-runner.js';
import { evaluateAIRegressionGateV073 } from '../benchmark/regression-gate.js';
import { BenchmarkSummaryMetrics } from '../benchmark/benchmark-types.js';

describe('v0.7.3 Strength Regression Tests', () => {
  it('1. can successfully run 1-round benchmark for v0.7.3 presets', () => {
    const results = runV073TuningRunner({
      seeds: ['benchmark-001'],
      rounds: 1,
    });

    expect(results.length).toBe(3);
    expect(results.some(r => r.candidateName === 'fast-balanced-lite')).toBe(true);
    expect(results.some(r => r.candidateName === 'no-lookahead-fastHu')).toBe(true);
    expect(results.some(r => r.candidateName === 'defense-lite')).toBe(true);
  });

  it('2. correctly evaluates Soft Gate and Strict Gate results', () => {
    const metrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 0.6, // Lift = -0.4 >= -0.5 (Soft passes, Strict fails)
      advancedScoreLift: -0.4,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.1,
      basicWinRate: 0.2,
      advancedWinRate: 0.2,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 15.0,
      advancedMaxDecisionMs: 120.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 200,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV073(metrics);
    expect(gateRes.softPassed).toBe(true);
    expect(gateRes.strictPassed).toBe(false);
  });

  it('3. rejects准入 for v0.8 when strict gate is not fully met', () => {
    const failedMetrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 0.2, // Lift = -0.8 < -0.5
      advancedScoreLift: -0.8,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.15,
      basicWinRate: 0.2,
      advancedWinRate: 0.15,
      basicBigHuRate: 0,
      advancedBigHuRate: 0,
      advancedAverageDecisionMs: 30.0,
      advancedMaxDecisionMs: 200.0,
      advancedFallbackCount: 5,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 200,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV073(failedMetrics);
    expect(gateRes.softPassed).toBe(false);
    expect(gateRes.strictPassed).toBe(false);
  });

  it('4. passes strict gate when lift >= 0 and latency <= 20ms', () => {
    const perfectMetrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.2,
      advancedScoreLift: 0.2,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0.02,
      advancedAverageDecisionMs: 12.0,
      advancedMaxDecisionMs: 65.0,
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 200,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV073(perfectMetrics);
    expect(gateRes.softPassed).toBe(true);
    expect(gateRes.strictPassed).toBe(true);
  });

  it('5. fails strict gate when max decision time > 80ms', () => {
    const slowMaxMetrics: BenchmarkSummaryMetrics = {
      basicAverageScore: 1.0,
      advancedAverageScore: 1.2,
      advancedScoreLift: 0.2,
      basicDealInRate: 0.1,
      advancedDealInRate: 0.08,
      basicWinRate: 0.2,
      advancedWinRate: 0.22,
      basicBigHuRate: 0,
      advancedBigHuRate: 0.02,
      advancedAverageDecisionMs: 12.0,
      advancedMaxDecisionMs: 95.0, // > 80ms
      advancedFallbackCount: 0,
      completedRounds: 10,
      drawRounds: 2,
      advancedTotalDecisionCount: 200,
      totalRounds: 10,
    };

    const gateRes = evaluateAIRegressionGateV073(slowMaxMetrics);
    expect(gateRes.softPassed).toBe(true); // Soft limit is 150ms
    expect(gateRes.strictPassed).toBe(false); // Strict limit is 80ms
  });
});
