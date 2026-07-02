import { describe, it } from 'vitest';
import { runTuningCandidates, recommendBestCandidate, TUNING_CANDIDATES } from '../benchmark/tuning-runner.js';
import { evaluateAIRegressionGate } from '../benchmark/regression-gate.js';
import { buildTuningReport } from '../benchmark/tuning-report-builder.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Generate Tuning Report', () => {
  it('runs tuning experiment and generates v0.7.2 report', () => {
    // 1. Setup baseline v0.7.1 metrics
    const originalMetrics = {
      totalRounds: 50,
      basicAverageScore: 1.80,
      advancedAverageScore: -1.80,
      advancedWinRate: 0.02,
      advancedDealInRate: 0.10,
      basicWinRate: 0.24,
      basicDealInRate: 0.06,
      advancedAverageDecisionMs: 52.67,
      advancedMaxDecisionMs: 1634.17,
      advancedFallbackCount: 53,
    };

    // 2. Generate 20 seeds
    const seeds = Array.from({ length: 20 }, (_, i) => `tuning-seed-${String(i + 1).padStart(3, '0')}`);

    console.log('Running tuning runner for candidates (20 rounds)...');
    const results = runTuningCandidates({
      candidates: TUNING_CANDIDATES,
      seeds,
      rounds: 20,
    });

    console.log('Tuning results collected:');
    results.forEach(r => {
      console.log(`- ${r.candidateName}: Lift=${r.metrics.advancedScoreLift.toFixed(2)}, AdvScore=${r.metrics.advancedAverageScore.toFixed(2)}, BasicScore=${r.metrics.basicAverageScore.toFixed(2)}, Deal-In=${(r.metrics.advancedDealInRate * 100).toFixed(1)}%, Passed=${r.passedRegressionGate}`);
    });

    // 3. Select best recommended config
    const recommendation = recommendBestCandidate(results, TUNING_CANDIDATES);
    console.log(`Recommended Candidate: ${recommendation.candidateName}`);

    const bestResult = results.find(r => r.candidateName === recommendation.candidateName)!;
    const gateResult = evaluateAIRegressionGate(bestResult.metrics);

    // 4. Build markdown report
    const reportText = buildTuningReport({
      originalMetrics,
      results,
      recommendedName: recommendation.candidateName,
      recommendedConfig: recommendation.config,
      recommendedGatePassed: gateResult.passed,
      recommendedGateReasons: gateResult.reasons,
    });

    // 5. Write to docs/changsha-mahjong-ai-v072-tuning-report.md
    const destDir = path.resolve('docs');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'changsha-mahjong-ai-v072-tuning-report.md');
    fs.writeFileSync(destPath, reportText, 'utf8');
    console.log(`Tuning report successfully written to ${destPath}`);
  });
});
