import { describe, it, expect } from 'vitest';
import { buildBenchmarkReport } from '../benchmark/benchmark-report-builder.js';
import { BenchmarkResult } from '../benchmark/benchmark-types.js';

describe('Benchmark Report Builder Tests', () => {
  const mockResult: BenchmarkResult = {
    config: {
      rounds: 5,
      seeds: ['s1'],
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    },
    totalRounds: 5,
    completedRounds: 5,
    drawRounds: 1,
    playerMetrics: [
      { seat: 0, aiEngine: 'basic', profile: 'balanced', scoreDelta: -20, winCount: 0, dealInCount: 2, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
      { seat: 1, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 20, winCount: 2, dealInCount: 0, ziMoCount: 1, dianPaoWinCount: 1, bigHuCount: 1, smallHuCount: 1, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
      { seat: 2, aiEngine: 'basic', profile: 'balanced', scoreDelta: -10, winCount: 0, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
      { seat: 3, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 10, winCount: 2, dealInCount: 0, ziMoCount: 1, dianPaoWinCount: 1, bigHuCount: 0, smallHuCount: 2, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
    ],
    performance: {
      totalDecisionCount: 100,
      averageDecisionMs: 1.5,
      maxDecisionMs: 12.0,
      overBudgetDecisionCount: 0,
      fallbackCount: 0,
    },
    summary: 'Mock summary',
  };

  it('1. builds a valid markdown report with basic and advanced sections', () => {
    const report = buildBenchmarkReport(mockResult);

    expect(report).toContain('# 长沙麻将 AI 强度评测与性能基准报告');
    expect(report).toContain('Basic AI 平均得分');
    expect(report).toContain('Advanced AI 平均得分');
    expect(report).toContain('放炮率对比');
    expect(report).toContain('平均决策耗时');
  });

  it('2. adds warning header block when completed rounds are small (< 15)', () => {
    const report = buildBenchmarkReport(mockResult);
    expect(report).toContain('样本量有限，结果仅作为回归参考');
  });

  it('3. calculates rates and percentages correctly', () => {
    const report = buildBenchmarkReport(mockResult);
    expect(report).toContain('Advanced AI (40.0%)');
  });

  it('4. should print draw rates properly', () => {
    const report = buildBenchmarkReport(mockResult);
    expect(report).toContain('流局率**: 20.0%');
  });

  it('5. should handle conclusion for non-prominent Advanced AI advantages', () => {
    const lowAdvantageResult: BenchmarkResult = {
      ...mockResult,
      playerMetrics: [
        { seat: 0, aiEngine: 'basic', profile: 'balanced', scoreDelta: 0, winCount: 1, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
        { seat: 1, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 0, winCount: 1, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
        { seat: 2, aiEngine: 'basic', profile: 'balanced', scoreDelta: 0, winCount: 1, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
        { seat: 3, aiEngine: 'advanced', profile: 'balanced', scoreDelta: 0, winCount: 1, dealInCount: 1, ziMoCount: 0, dianPaoWinCount: 0, bigHuCount: 0, smallHuCount: 0, gangCount: 0, chiCount: 0, pengCount: 0, discardCount: 15, riskyDiscardCount: 0 },
      ]
    };
    const report = buildBenchmarkReport(lowAdvantageResult);
    expect(report).toContain('Advanced AI 在当前参数下的优势尚不明显');
  });
});
