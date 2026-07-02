import { describe, it, expect } from 'vitest';
import { evaluateAIRegressionGate, getRegressionGateStatusString } from '../benchmark/regression-gate.js';
import { BenchmarkSummaryMetrics } from '../benchmark/benchmark-types.js';

describe('Regression Gate Tests', () => {
  const baseMetrics: BenchmarkSummaryMetrics = {
    basicAverageScore: 0,
    advancedAverageScore: 5,
    advancedScoreLift: 5,
    basicDealInRate: 0.1,
    advancedDealInRate: 0.1,
    basicWinRate: 0.2,
    advancedWinRate: 0.25,
    basicBigHuRate: 0,
    advancedBigHuRate: 0.05,
    advancedAverageDecisionMs: 5,
    advancedMaxDecisionMs: 40,
    advancedFallbackCount: 0,
    completedRounds: 10,
    drawRounds: 2,
    advancedTotalDecisionCount: 200,
    totalRounds: 10,
  };

  it('1. passes when Advanced scores higher than Basic with acceptable deal-in and latency', () => {
    const result = evaluateAIRegressionGate(baseMetrics);
    expect(result.passed).toBe(true);
    expect(result.reasons.length).toBe(0);
  });

  it('2. fails when Advanced score is lower than Basic', () => {
    const badScoreMetrics = {
      ...baseMetrics,
      advancedAverageScore: -2,
      basicAverageScore: 0,
    };
    const result = evaluateAIRegressionGate(badScoreMetrics);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('average score'))).toBe(true);
  });

  it('3. fails when Advanced deal-in rate is higher than Basic by > 5%', () => {
    const highDealInMetrics = {
      ...baseMetrics,
      advancedDealInRate: 0.2, // 20% vs basic 10% (diff = 10% > 5%)
    };
    const result = evaluateAIRegressionGate(highDealInMetrics);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('deal-in rate'))).toBe(true);
  });

  it('4. fails when latencies exceed the budget', () => {
    const slowMetrics = {
      ...baseMetrics,
      advancedAverageDecisionMs: 25, // limit: 20
      advancedMaxDecisionMs: 90,     // limit: 80
    };
    const result = evaluateAIRegressionGate(slowMetrics);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('average decision time'))).toBe(true);
    expect(result.reasons.some(r => r.includes('max decision time'))).toBe(true);
  });

  it('5. fails when fallback rate exceeds 1%', () => {
    const fallbackMetrics = {
      ...baseMetrics,
      advancedFallbackCount: 20, // 20 / 200 = 10% > 1%
    };
    const result = evaluateAIRegressionGate(fallbackMetrics);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('fallback count'))).toBe(true);
  });

  it('6. produces descriptive failure reasons in status string', () => {
    const result = evaluateAIRegressionGate({
      ...baseMetrics,
      advancedAverageScore: -5,
    });
    const status = getRegressionGateStatusString(result);
    expect(status).toContain('未通过回归门');
    expect(status).toContain('average score');
  });

  it('7. fails when completed rounds is less than total rounds', () => {
    const incompleteMetrics = {
      ...baseMetrics,
      completedRounds: 8,
      totalRounds: 10,
    };
    const result = evaluateAIRegressionGate(incompleteMetrics);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('Completed rounds'))).toBe(true);
  });

  it('8. passes when Advanced score equals Basic score exactly', () => {
    const equalScoreMetrics = {
      ...baseMetrics,
      advancedAverageScore: 0,
      basicAverageScore: 0,
      advancedScoreLift: 0,
    };
    const result = evaluateAIRegressionGate(equalScoreMetrics);
    expect(result.passed).toBe(true);
  });
});
