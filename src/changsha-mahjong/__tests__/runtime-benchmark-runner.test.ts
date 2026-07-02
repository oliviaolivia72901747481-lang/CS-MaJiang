import { describe, it, expect } from 'vitest';
import { runRuntimePerformanceBenchmark } from '../benchmark/runtime-benchmark-runner.js';

describe('Runtime Benchmark Runner Tests', () => {
  const seeds = ['runtime-seed-001', 'runtime-seed-002'];

  it('1. runs a 1-round measured benchmark and returns results', () => {
    const result = runRuntimePerformanceBenchmark({
      warmupRounds: 1,
      measuredRounds: 1,
      seeds,
      aiMode: 'lite',
    });

    expect(result.warmRunSamples.length).toBeGreaterThan(0);
    expect(result.coldStartSamples.length).toBeGreaterThan(0);
  });

  it('2. distinguishes cold start samples from warm run samples', () => {
    const result = runRuntimePerformanceBenchmark({
      warmupRounds: 1,
      measuredRounds: 1,
      seeds,
      aiMode: 'lite',
    });

    const hasCold = result.coldStartSamples.every((s: any) => s.coldStart);
    const hasWarm = result.warmRunSamples.every((s: any) => !s.coldStart);

    expect(hasCold).toBe(true);
    expect(hasWarm).toBe(true);
  });

  it('3. outputs valid distributions without NaN', () => {
    const result = runRuntimePerformanceBenchmark({
      warmupRounds: 1,
      measuredRounds: 1,
      seeds,
      aiMode: 'lite',
    });

    expect(result.aiDecisionDistribution.averageMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(result.aiDecisionDistribution.averageMs)).toBe(false);
  });

  it('4. outputs AI decision distribution with positive count', () => {
    const result = runRuntimePerformanceBenchmark({
      warmupRounds: 1,
      measuredRounds: 1,
      seeds,
      aiMode: 'lite',
    });

    expect(result.aiDecisionDistribution.count).toBeGreaterThan(0);
  });

  it('5. outputs total loop distribution with positive count', () => {
    const result = runRuntimePerformanceBenchmark({
      warmupRounds: 1,
      measuredRounds: 1,
      seeds,
      aiMode: 'lite',
    });

    expect(result.totalLoopDistribution.count).toBeGreaterThan(0);
  });
});
