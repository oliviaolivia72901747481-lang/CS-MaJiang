import { describe, it } from 'vitest';
import { runV073TuningRunner } from '../benchmark/v073-benchmark-runner.js';
import { recommendBestCandidate } from '../benchmark/tuning-runner.js';
import { V073_PRESETS } from '../benchmark/v073-tuning-presets.js';
import { analyzePerformanceHotspots } from '../benchmark/performance-hotspot-analyzer.js';
import { evaluateAIRegressionGateV073 } from '../benchmark/regression-gate.js';
import { buildV073TuningReport } from '../benchmark/v073-report-builder.js';
import { runAIMatch } from '../benchmark/ai-match-runner.js';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';
import { setActiveTuningConfig, DEFAULT_ADVANCED_AI_TUNING } from '../benchmark/tuning-config.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Generate v0.7.3 Tuning Report', () => {
  it('runs tuning experiment and generates v0.7.3 report', () => {
    // 1. Generate 20 seeds
    const seeds = Array.from({ length: 20 }, (_, i) => `v073-seed-${String(i + 1).padStart(3, '0')}`);

    console.log('Running v0.7.3 tuning runner (20 rounds per candidate)...');
    const results = runV073TuningRunner({
      seeds,
      rounds: 20,
    });

    console.log('v0.7.3 tuning results collected:');
    results.forEach(r => {
      console.log(`- ${r.candidateName}: Lift=${r.metrics.advancedScoreLift.toFixed(2)}, AdvScore=${r.metrics.advancedAverageScore.toFixed(2)}, BasicScore=${r.metrics.basicAverageScore.toFixed(2)}, Deal-In=${(r.metrics.advancedDealInRate * 100).toFixed(1)}%, AverageMs=${r.metrics.advancedAverageDecisionMs.toFixed(2)}ms`);
    });

    // 2. Select best recommended preset
    const recommendation = recommendBestCandidate(results, V073_PRESETS);
    console.log(`Recommended Candidate: ${recommendation.candidateName}`);

    // 3. Apply recommended config and run a final profiled match to collect module hotspot data
    console.log(`Profiling hotspots under recommended configuration: ${recommendation.candidateName}...`);
    setActiveTuningConfig(recommendation.config);
    PerformanceProfiler.reset();

    // Run 20 rounds to collect profile statistics
    const finalBenchmarkResult = runAIMatch({
      rounds: 20,
      seeds,
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
      decisionTimeBudgetMs: recommendation.config.lookaheadBudgetMs || 20,
    });

    const hotspotReport = analyzePerformanceHotspots({ benchmarkResult: finalBenchmarkResult });

    // Restore default tuning config
    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);

    // 4. Build markdown report
    const reportText = buildV073TuningReport({
      results,
      hotspotReport,
      recommendedName: recommendation.candidateName,
      recommendedConfig: recommendation.config,
    });

    // 5. Write to docs/changsha-mahjong-ai-v073-performance-tuning-report.md
    const destDir = path.resolve('docs');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'changsha-mahjong-ai-v073-performance-tuning-report.md');
    fs.writeFileSync(destPath, reportText, 'utf8');
    console.log(`v0.7.3 Tuning report successfully written to ${destPath}`);
  });
});
