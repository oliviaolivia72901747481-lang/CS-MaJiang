import { describe, it, expect, vi } from 'vitest';
import { analyzeBenchmarkResult } from '../benchmark/benchmark-analyzer.js';
import { BenchmarkResult } from '../benchmark/benchmark-types.js';

describe('Benchmark Analyzer Tests', () => {
  const mockResult: BenchmarkResult = {
    config: {
      rounds: 2,
      seeds: ['s1', 's2'],
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    },
    totalRounds: 2,
    completedRounds: 2,
    drawRounds: 0,
    playerMetrics: [
      { seat: 0, aiEngine: 'basic', profile: 'balanced', scoreDelta: -20, winCount: 0, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 10, riskyDiscardCount: 0 },
      { seat: 1, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 20, winCount: 1, dealInCount: 0, ziMoCount: 0, dianPaoWinCount: 1, bigHuCount: 0, smallHuCount: 1, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 10, riskyDiscardCount: 0 },
      { seat: 2, aiEngine: 'basic', profile: 'balanced', scoreDelta: -10, winCount: 0, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 10, riskyDiscardCount: 0 },
      { seat: 3, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 10, winCount: 1, dealInCount: 0, ziMoCount: 0, dianPaoWinCount: 1, bigHuCount: 0, smallHuCount: 1, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 10, riskyDiscardCount: 0 },
    ],
    performance: {
      totalDecisionCount: 40,
      averageDecisionMs: 2.5,
      maxDecisionMs: 15.0,
      overBudgetDecisionCount: 0,
      fallbackCount: 0,
    },
    summary: 'Mock Summary',
  };

  it('1. correctly calculates basic and advanced average scores', () => {
    const metrics = analyzeBenchmarkResult(mockResult);
    expect(metrics.basicAverageScore).toBe(-7.5);
    expect(metrics.advancedAverageScore).toBe(7.5);
  });

  it('2. correctly calculates advanced score lift', () => {
    const metrics = analyzeBenchmarkResult(mockResult);
    expect(metrics.advancedScoreLift).toBe(15.0);
  });

  it('3. correctly calculates deal-in rates', () => {
    const metrics = analyzeBenchmarkResult(mockResult);
    expect(metrics.basicDealInRate).toBe(0.5);
    expect(metrics.advancedDealInRate).toBe(0);
  });

  it('4. handles division by zero safely and prevents NaN', () => {
    const emptyResult: BenchmarkResult = {
      ...mockResult,
      completedRounds: 0,
      playerMetrics: [],
    };
    const metrics = analyzeBenchmarkResult(emptyResult);
    expect(metrics.basicAverageScore).toBe(0);
    expect(metrics.advancedAverageScore).toBe(0);
    expect(metrics.advancedScoreLift).toBe(0);
    expect(Number.isNaN(metrics.basicAverageScore)).toBe(false);
  });

  it('5. handles mixed engines with multiple rounds', () => {
    const metrics = analyzeBenchmarkResult({
      ...mockResult,
      completedRounds: 10,
    });
    expect(metrics.completedRounds).toBe(10);
  });

  it('6. checks that warning is logged when rounds < 15', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    analyzeBenchmarkResult(mockResult);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('less than 15'));
    warnSpy.mockRestore();
  });
});
