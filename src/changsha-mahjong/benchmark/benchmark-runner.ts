import { runAIMatch } from './ai-match-runner.js';
import { BENCHMARK_SEEDS } from './seed-scenarios.js';
import { BenchmarkResult } from './benchmark-types.js';

export function runBasicVsAdvancedBenchmark(rounds = 20): BenchmarkResult {
  return runAIMatch({
    rounds,
    seeds: BENCHMARK_SEEDS,
    aiEngines: {
      0: 'basic',
      1: 'advanced',
      2: 'basic',
      3: 'advanced',
    },
    aiProfiles: {
      0: 'balanced',
      1: 'balanced',
      2: 'balanced',
      3: 'balanced',
    },
    maxStepsPerRound: 500,
    decisionTimeBudgetMs: 20,
  });
}

export function runProfileComparisonBenchmark(rounds = 20): BenchmarkResult {
  return runAIMatch({
    rounds,
    seeds: BENCHMARK_SEEDS,
    aiEngines: {
      0: 'advanced',
      1: 'advanced',
      2: 'advanced',
      3: 'advanced',
    },
    aiProfiles: {
      0: 'fastHu',
      1: 'bigHu',
      2: 'defensive',
      3: 'balanced',
    },
    maxStepsPerRound: 500,
    decisionTimeBudgetMs: 20,
  });
}

export function runPerformanceBenchmark(rounds = 50): BenchmarkResult {
  return runAIMatch({
    rounds,
    seeds: BENCHMARK_SEEDS,
    aiEngines: {
      0: 'advanced',
      1: 'advanced',
      2: 'advanced',
      3: 'advanced',
    },
    aiProfiles: {
      0: 'balanced',
      1: 'balanced',
      2: 'balanced',
      3: 'balanced',
    },
    maxStepsPerRound: 500,
    decisionTimeBudgetMs: 20,
  });
}
