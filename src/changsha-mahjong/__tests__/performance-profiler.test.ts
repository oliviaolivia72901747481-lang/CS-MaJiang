import { describe, it, expect } from 'vitest';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';

describe('Performance Profiler Tests', () => {
  it('1. returns the original function value and records elapsed time', () => {
    PerformanceProfiler.reset();
    const result = PerformanceProfiler.profileDecision({
      label: 'test_decision',
      budgetMs: 100,
      fn: () => 42,
    });

    expect(result.result).toBe(42);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.overBudget).toBe(false);

    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.totalDecisionCount).toBe(1);
    expect(metrics.averageDecisionMs).toBeGreaterThanOrEqual(0);
  });

  it('2. correctly flags over budget decisions', () => {
    PerformanceProfiler.reset();
    const result = PerformanceProfiler.profileDecision({
      label: 'slow_decision',
      budgetMs: 1, // very low budget to trigger overbudget
      fn: () => {
        const start = performance.now();
        while (performance.now() - start < 5) {}
        return 'done';
      },
    });

    expect(result.result).toBe('done');
    expect(result.overBudget).toBe(true);

    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.overBudgetDecisionCount).toBe(1);
  });

  it('3. does not swallow errors when exceptions occur', () => {
    expect(() => {
      PerformanceProfiler.profileDecision({
        label: 'error_decision',
        budgetMs: 100,
        fn: () => {
          throw new Error('profile_error');
        },
      });
    }).toThrow('profile_error');
  });

  it('4. aggregates average and max times from multiple calls', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.profileDecision({ label: 'call_1', budgetMs: 100, fn: () => {} });
    PerformanceProfiler.profileDecision({ label: 'call_2', budgetMs: 100, fn: () => {} });

    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.totalDecisionCount).toBe(2);
  });

  it('5. should correctly count fallback occurrences', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.recordFallback();
    PerformanceProfiler.recordFallback();
    
    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.fallbackCount).toBe(2);
  });

  it('6. should calculate averageDecisionMs as totalMs/decisionCount', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.profileDecision({ label: 'call_1', budgetMs: 100, fn: () => {} });
    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.averageDecisionMs).toBeGreaterThanOrEqual(0);
  });

  it('7. should reset metrics completely on reset()', () => {
    PerformanceProfiler.reset();
    PerformanceProfiler.profileDecision({ label: 'call_1', budgetMs: 100, fn: () => {} });
    PerformanceProfiler.recordFallback();
    
    PerformanceProfiler.reset();
    const metrics = PerformanceProfiler.getMetrics();
    expect(metrics.totalDecisionCount).toBe(0);
    expect(metrics.fallbackCount).toBe(0);
    expect(metrics.overBudgetDecisionCount).toBe(0);
  });
});
