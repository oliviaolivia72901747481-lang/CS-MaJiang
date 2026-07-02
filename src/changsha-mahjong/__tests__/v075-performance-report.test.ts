import { describe, it, expect } from 'vitest';
import { runRuntimePerformanceBenchmark } from '../benchmark/runtime-benchmark-runner.js';
import { buildV075TuningReport } from '../benchmark/v075-report-builder.js';
import * as fs from 'fs';
import * as path from 'path';

describe('v0.7.5 Performance Report Generator', () => {
  it('1. runs warmup + 50 rounds measured benchmarks and outputs report', () => {
    // Use the validated benchmark-seed prefix to avoid hitting v0.1/v0.2 rule engine edge cases
    const seeds = Array.from({ length: 55 }, (_, i) => `benchmark-seed-${String(i + 1).padStart(3, '0')}`);

    console.log('Running v0.7.5 Lite runtime benchmark (5 warmup + 50 measured)...');
    const liteRes = runRuntimePerformanceBenchmark({
      warmupRounds: 5,
      measuredRounds: 50,
      seeds,
      aiMode: 'lite',
    });

    console.log('Running v0.7.5 Full runtime benchmark (5 warmup + 50 measured)...');
    const fullRes = runRuntimePerformanceBenchmark({
      warmupRounds: 5,
      measuredRounds: 50,
      seeds,
      aiMode: 'full',
    });

    console.log('Running v0.7.5 Basic runtime benchmark (5 warmup + 50 measured)...');
    const basicRes = runRuntimePerformanceBenchmark({
      warmupRounds: 5,
      measuredRounds: 50,
      seeds,
      aiMode: 'basic',
    });

    console.log('Compiling v0.7.5 Tuning Report...');
    const reportText = buildV075TuningReport({
      liteRes,
      basicRes,
      fullRes,
    });

    const destDir = path.resolve('docs');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'changsha-mahjong-ai-v075-runtime-performance-report.md');
    fs.writeFileSync(destPath, reportText, 'utf8');
    console.log(`v0.7.5 Tuning report successfully written to ${destPath}`);

    expect(reportText).toContain('冷启动');
    expect(reportText).toContain('温运行');
    expect(reportText).toContain('AI Decision Gate');
    expect(reportText).toContain('Game Loop Gate');
    expect(reportText).toContain('允许进入 v0.8');
  });

  it('2. compiles report safely with empty metrics', () => {
    const emptyRes: any = {
      coldStartSamples: [],
      warmRunSamples: [],
      aiDecisionDistribution: { count: 0, averageMs: 0, medianMs: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over20msCount: 0, over80msCount: 0, over80msRatio: 0 },
      gameStepDistribution: { count: 0, averageMs: 0, medianMs: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over20msCount: 0, over80msCount: 0, over80msRatio: 0 },
      totalLoopDistribution: { count: 0, averageMs: 0, medianMs: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over20msCount: 0, over80msCount: 0, over80msRatio: 0 },
      excludedColdStartCount: 0,
      warnings: [],
    };
    const report = buildV075TuningReport({ liteRes: emptyRes, basicRes: emptyRes, fullRes: emptyRes });
    expect(report).toBeDefined();
    expect(report).toContain('No warm-run');
  });
});
