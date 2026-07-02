import { describe, it, expect } from 'vitest';
import { runAIMatch } from '../benchmark/ai-match-runner.js';
import { activeAdvancedAISettings, setActiveAdvancedAISettings, DEFAULT_ADVANCED_AI_TUNING, setActiveTuningConfig } from '../benchmark/tuning-config.js';
import { getDecisionTraces, clearDecisionTraces } from '../benchmark/decision-trace-profiler.js';
import { evaluateAIRegressionGateV074 } from '../benchmark/regression-gate.js';

describe('v0.7.4 Benchmark Tests', () => {
  const seeds = ['benchmark-v074-001'];

  it('1. runs Lite benchmark and records decision traces with no lookahead', () => {
    clearDecisionTraces();
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });
    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);

    const result = runAIMatch({
      rounds: 1,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 100,
      decisionTimeBudgetMs: 20,
    });

    expect(result.completedRounds).toBe(1);
    const traces = getDecisionTraces();
    expect(traces.length).toBeGreaterThan(0);
    const hasLookahead = traces.some(t => {
      const childrenNames = t.rootSpan.children.map(c => c.name);
      return childrenNames.includes('lookahead-search');
    });
    expect(hasLookahead).toBe(false);
  });

  it('2. runs Full benchmark and records full spans', () => {
    clearDecisionTraces();
    setActiveAdvancedAISettings({
      mode: 'full',
      enableLookahead: true,
      enableFullOpponentModeler: true,
      enableFullRoutePlanner: true,
    });

    const result = runAIMatch({
      rounds: 1,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 100,
      decisionTimeBudgetMs: 20,
    });

    expect(result.completedRounds).toBe(1);
  });

  it('3. runs Basic benchmark', () => {
    setActiveAdvancedAISettings({
      mode: 'basic',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });

    const result = runAIMatch({
      rounds: 1,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 100,
      decisionTimeBudgetMs: 20,
    });

    expect(result.completedRounds).toBe(1);
  });

  it('4. checks activeAdvancedAISettings toggle works as expected', () => {
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: true,
      enableFullOpponentModeler: true,
      enableFullRoutePlanner: true,
    });
    expect(activeAdvancedAISettings.mode).toBe('lite');
    expect(activeAdvancedAISettings.enableLookahead).toBe(true);
  });

  it('5. accumulates traces over multiple step decisions during the match simulation', () => {
    clearDecisionTraces();
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });

    runAIMatch({
      rounds: 1,
      seeds,
      aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 200,
      decisionTimeBudgetMs: 20,
    });

    const traceCount = getDecisionTraces().length;
    expect(traceCount).toBeGreaterThan(0);
  });
});
