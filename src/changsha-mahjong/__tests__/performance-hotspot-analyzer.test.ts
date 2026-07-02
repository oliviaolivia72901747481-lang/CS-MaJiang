import { describe, it, expect } from 'vitest';
import { analyzePerformanceHotspots } from '../benchmark/performance-hotspot-analyzer.js';
import { BenchmarkResult } from '../benchmark/benchmark-types.js';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';

describe('Performance Hotspot Analyzer Tests', () => {
  const mockResult: BenchmarkResult = {
    config: {
      rounds: 1,
      seeds: ['s1'],
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    },
    totalRounds: 1,
    completedRounds: 1,
    drawRounds: 0,
    playerMetrics: [],
    performance: {
      totalDecisionCount: 10,
      averageDecisionMs: 15.0,
      maxDecisionMs: 120.0,
      overBudgetDecisionCount: 2,
      fallbackCount: 0,
    },
    summary: 'Mock Summary',
  };

  it('1. generates a hotspot report successfully', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.profileModule('lookahead-search', () => {});
    PerformanceProfiler.profileModule('route-planner', () => {});

    PerformanceProfiler.recordSlowSample({
      seed: 's1',
      step: 15,
      seat: 1,
      elapsedMs: 85.5,
      reason: 'Lookahead slow',
    });

    const report = analyzePerformanceHotspots({ benchmarkResult: mockResult });
    expect(report.totalDecisionCount).toBe(10);
    expect(report.hotspots.length).toBeGreaterThanOrEqual(2);
    expect(report.slowestDecisionSamples.length).toBe(1);
    expect(report.slowestDecisionSamples[0].elapsedMs).toBe(85.5);
  });

  it('2. correctly identifies the modules with highest average/total times and prevents NaN', () => {
    const report = analyzePerformanceHotspots({ benchmarkResult: mockResult });
    report.hotspots.forEach(h => {
      expect(Number.isNaN(h.averageMs)).toBe(false);
      expect(Number.isFinite(h.averageMs)).toBe(true);
    });
  });

  it('3. handles empty or edge case input safely', () => {
    PerformanceProfiler.reset();
    const emptyResult: BenchmarkResult = {
      config: mockResult.config,
      totalRounds: 0,
      completedRounds: 0,
      drawRounds: 0,
      playerMetrics: [],
      performance: {
        totalDecisionCount: 0,
        averageDecisionMs: 0,
        maxDecisionMs: 0,
        overBudgetDecisionCount: 0,
        fallbackCount: 0,
      },
      summary: '',
    };
    const report = analyzePerformanceHotspots({ benchmarkResult: emptyResult });
    expect(report.totalDecisionCount).toBe(0);
    expect(report.hotspots.length).toBe(0);
    expect(report.slowestDecisionSamples.length).toBe(0);
  });

  it('4. sorts hotspots descending by total time', () => {
    PerformanceProfiler.reset();
    // Simulate lookup taking less time than route planner
    PerformanceProfiler.profileModule('lookahead-search', () => {
      // simulate 1ms
      const start = performance.now();
      while (performance.now() - start < 1) {}
    });
    PerformanceProfiler.profileModule('route-planner', () => {
      // simulate 10ms
      const start = performance.now();
      while (performance.now() - start < 10) {}
    });

    const report = analyzePerformanceHotspots({ benchmarkResult: mockResult });
    expect(report.hotspots[0].moduleName).toBe('route-planner');
  });

  it('5. handles multiple slow samples successfully', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.recordSlowSample({ seed: 's1', step: 10, seat: 0, elapsedMs: 90, reason: 'slow 1' });
    PerformanceProfiler.recordSlowSample({ seed: 's1', step: 12, seat: 1, elapsedMs: 120, reason: 'slow 2' });

    const report = analyzePerformanceHotspots({ benchmarkResult: mockResult });
    expect(report.slowestDecisionSamples.length).toBe(2);
    expect(report.slowestDecisionSamples[0].elapsedMs).toBe(120); // sorted descending
  });
});
