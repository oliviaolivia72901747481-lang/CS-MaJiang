import { describe, it, expect } from 'vitest';
import { runBasicVsAdvancedBenchmark, runProfileComparisonBenchmark, runPerformanceBenchmark } from '../benchmark/benchmark-runner.js';
import { runAIMatch } from '../benchmark/ai-match-runner.js';

describe('Benchmark Runner Tests', () => {
  it('1. can run a 1 round benchmark with basic vs advanced configuration', () => {
    const result = runBasicVsAdvancedBenchmark(1);
    expect(result.completedRounds).toBe(1);
    expect(result.playerMetrics.length).toBe(4);
    expect(result.playerMetrics[0].aiEngine).toBe('basic');
    expect(result.playerMetrics[1].aiEngine).toBe('advanced');
  });

  it('2. can run profile comparison benchmark and handle different seeds', () => {
    const result = runProfileComparisonBenchmark(2);
    expect(result.completedRounds).toBe(2);
    expect(result.playerMetrics[0].profile).toBe('fastHu');
    expect(result.playerMetrics[1].profile).toBe('bigHu');
    expect(result.playerMetrics[2].profile).toBe('defensive');
    expect(result.playerMetrics[3].profile).toBe('balanced');
  });

  it('3. safely fails/throws when maxStepsPerRound is exceeded', () => {
    expect(() => {
      runAIMatch({
        rounds: 1,
        seeds: ['benchmark-001'],
        aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'advanced', 3: 'advanced' },
        aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
        maxStepsPerRound: 5, // Extremely small steps to trigger failure
        decisionTimeBudgetMs: 20,
      });
    }).toThrow(/exceeded/);
  });

  it('4. should run runPerformanceBenchmark with default values', () => {
    const result = runPerformanceBenchmark(1);
    expect(result.completedRounds).toBe(1);
    expect(result.playerMetrics[0].aiEngine).toBe('advanced');
  });

  it('5. should check that seeds are used in a round-robin fashion', () => {
    const result = runAIMatch({
      rounds: 3,
      seeds: ['benchmark-001', 'benchmark-002'],
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'advanced', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 100,
    });
    expect(result.completedRounds).toBe(3);
  });
});
