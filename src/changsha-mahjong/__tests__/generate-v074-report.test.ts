import { describe, it } from 'vitest';
import { runAIMatch } from '../benchmark/ai-match-runner.js';
import { activeAdvancedAISettings, setActiveAdvancedAISettings, DEFAULT_ADVANCED_AI_TUNING, setActiveTuningConfig } from '../benchmark/tuning-config.js';
import { getDecisionTraces, clearDecisionTraces } from '../benchmark/decision-trace-profiler.js';
import { FAST_BALANCED_LITE_TUNING } from '../benchmark/v073-tuning-presets.js';
import { buildV074TuningReport } from '../benchmark/v074-report-builder.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Generate v0.7.4 Tuning Report', () => {
  it('runs lite vs full vs basic benchmarks and generates v0.7.4 report', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => `v074-seed-${String(i + 1).padStart(3, '0')}`);

    // 1. Run Lite Mode Benchmark
    console.log('Running Advanced Lite benchmark (20 rounds)...');
    clearDecisionTraces();
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });
    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);

    const liteResult = runAIMatch({
      rounds: 20,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    });

    const liteMetrics = {
      ...liteResult.performance,
      advancedAverageDecisionMs: liteResult.performance.averageDecisionMs,
      advancedMaxDecisionMs: liteResult.performance.maxDecisionMs,
      advancedScoreLift: (liteResult.playerMetrics.find(p => p.seat === 1)?.scoreDelta || 0) / 20,
      advancedAverageScore: (liteResult.playerMetrics.find(p => p.seat === 1)?.scoreDelta || 0) / 20,
      basicAverageScore: (liteResult.playerMetrics.find(p => p.seat === 0)?.scoreDelta || 0) / 20,
      advancedDealInRate: (liteResult.playerMetrics.find(p => p.seat === 1)?.dealInCount || 0) / Math.max(1, liteResult.playerMetrics.find(p => p.seat === 1)?.discardCount || 1),
      basicDealInRate: (liteResult.playerMetrics.find(p => p.seat === 0)?.dealInCount || 0) / Math.max(1, liteResult.playerMetrics.find(p => p.seat === 0)?.discardCount || 1),
      advancedWinRate: (liteResult.playerMetrics.find(p => p.seat === 1)?.winCount || 0) / 20,
      basicWinRate: (liteResult.playerMetrics.find(p => p.seat === 0)?.winCount || 0) / 20,
      advancedTotalDecisionCount: liteResult.performance.totalDecisionCount,
      advancedFallbackCount: liteResult.performance.fallbackCount,
      completedRounds: 20,
      totalRounds: 20,
    } as any;

    const traces = getDecisionTraces();

    // 2. Run Full Mode Benchmark
    console.log('Running Advanced Full benchmark (20 rounds)...');
    setActiveAdvancedAISettings({
      mode: 'full',
      enableLookahead: true,
      enableFullOpponentModeler: true,
      enableFullRoutePlanner: true,
    });
    setActiveTuningConfig(FAST_BALANCED_LITE_TUNING);

    const fullResult = runAIMatch({
      rounds: 20,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    });

    const fullMetrics = {
      ...fullResult.performance,
      advancedAverageDecisionMs: fullResult.performance.averageDecisionMs,
      advancedMaxDecisionMs: fullResult.performance.maxDecisionMs,
      advancedScoreLift: (fullResult.playerMetrics.find(p => p.seat === 1)?.scoreDelta || 0) / 20,
      advancedAverageScore: (fullResult.playerMetrics.find(p => p.seat === 1)?.scoreDelta || 0) / 20,
      basicAverageScore: (fullResult.playerMetrics.find(p => p.seat === 0)?.scoreDelta || 0) / 20,
      advancedDealInRate: (fullResult.playerMetrics.find(p => p.seat === 1)?.dealInCount || 0) / Math.max(1, fullResult.playerMetrics.find(p => p.seat === 1)?.discardCount || 1),
      basicDealInRate: (fullResult.playerMetrics.find(p => p.seat === 0)?.dealInCount || 0) / Math.max(1, fullResult.playerMetrics.find(p => p.seat === 0)?.discardCount || 1),
      advancedWinRate: (fullResult.playerMetrics.find(p => p.seat === 1)?.winCount || 0) / 20,
      basicWinRate: (fullResult.playerMetrics.find(p => p.seat === 0)?.winCount || 0) / 20,
      advancedTotalDecisionCount: fullResult.performance.totalDecisionCount,
      advancedFallbackCount: fullResult.performance.fallbackCount,
      completedRounds: 20,
      totalRounds: 20,
    } as any;

    // 3. Run Basic Mode Benchmark
    console.log('Running Basic AI benchmark (20 rounds)...');
    setActiveAdvancedAISettings({
      mode: 'basic',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });

    const basicResult = runAIMatch({
      rounds: 20,
      seeds,
      aiEngines: { 0: 'basic', 1: 'basic', 2: 'basic', 3: 'basic' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 20,
    });

    const basicMetrics = {
      ...basicResult.performance,
      advancedAverageDecisionMs: basicResult.performance.averageDecisionMs,
      advancedMaxDecisionMs: basicResult.performance.maxDecisionMs,
      advancedScoreLift: 0,
      advancedAverageScore: (basicResult.playerMetrics.find(p => p.seat === 1)?.scoreDelta || 0) / 20,
      basicAverageScore: (basicResult.playerMetrics.find(p => p.seat === 0)?.scoreDelta || 0) / 20,
      advancedDealInRate: (basicResult.playerMetrics.find(p => p.seat === 1)?.dealInCount || 0) / Math.max(1, basicResult.playerMetrics.find(p => p.seat === 1)?.discardCount || 1),
      basicDealInRate: (basicResult.playerMetrics.find(p => p.seat === 0)?.dealInCount || 0) / Math.max(1, basicResult.playerMetrics.find(p => p.seat === 0)?.discardCount || 1),
      advancedWinRate: (basicResult.playerMetrics.find(p => p.seat === 1)?.winCount || 0) / 20,
      basicWinRate: (basicResult.playerMetrics.find(p => p.seat === 0)?.winCount || 0) / 20,
      advancedTotalDecisionCount: basicResult.performance.totalDecisionCount,
      advancedFallbackCount: basicResult.performance.fallbackCount,
      completedRounds: 20,
      totalRounds: 20,
    } as any;

    // Clean up settings to default (Lite mode)
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });
    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);

    // 4. Compile Markdown report
    const reportText = buildV074TuningReport({
      liteMetrics,
      fullMetrics,
      basicMetrics,
      traces,
    });

    // 5. Write to docs/changsha-mahjong-ai-v074-lite-performance-report.md
    const destDir = path.resolve('docs');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, 'changsha-mahjong-ai-v074-lite-performance-report.md');
    fs.writeFileSync(destPath, reportText, 'utf8');
    console.log(`v0.7.4 Tuning report successfully written to ${destPath}`);
  });
});
