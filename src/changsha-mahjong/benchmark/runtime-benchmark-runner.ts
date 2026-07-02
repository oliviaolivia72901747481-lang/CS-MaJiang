import { createInitialGameState, startRound, stepGame, isRoundEnded } from '../controller/game-engine.js';
import { checkTileConservation } from './ai-match-runner.js';
import { 
  DecisionTimingSample, 
  TimingDistribution, 
  PerformanceBenchmarkV2Result, 
  clearTimingSamples, 
  getTimingSamples, 
  setColdStartPhase, 
  calculateDistribution 
} from './performance-metrics-v2.js';
import { warmupAdvancedLite } from './warmup-runner.js';
import { activeAdvancedAISettings, setActiveAdvancedAISettings } from './tuning-config.js';

export { PerformanceBenchmarkV2Result };

export function runRuntimePerformanceBenchmark(input: {
  warmupRounds: number;
  measuredRounds: number;
  seeds: string[];
  aiMode: 'lite' | 'basic' | 'full';
}): PerformanceBenchmarkV2Result {
  const { warmupRounds, measuredRounds, seeds, aiMode } = input;

  clearTimingSamples();

  if (warmupRounds > 0) {
    const warmupSeeds = seeds.slice(0, Math.min(seeds.length, warmupRounds));
    warmupAdvancedLite({ rounds: warmupRounds, seeds: warmupSeeds });
  }

  const originalSettings = { ...activeAdvancedAISettings };
  if (aiMode === 'lite') {
    setActiveAdvancedAISettings({
      mode: 'lite',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });
  } else if (aiMode === 'full') {
    setActiveAdvancedAISettings({
      mode: 'full',
      enableLookahead: true,
      enableFullOpponentModeler: true,
      enableFullRoutePlanner: true,
    });
  } else {
    setActiveAdvancedAISettings({
      mode: 'basic',
      enableLookahead: false,
      enableFullOpponentModeler: false,
      enableFullRoutePlanner: false,
    });
  }

  setColdStartPhase(false);

  const maxSteps = 500;
  const targetEngine = aiMode === 'basic' ? 'basic' : 'advanced';

  for (let r = 0; r < measuredRounds; r++) {
    const seed = seeds[(warmupRounds + r) % seeds.length];

    let state = createInitialGameState();
    state.players.forEach(p => {
      (p as any).aiEngine = targetEngine;
      p.aiProfile = 'balanced';
    });
    (state as any).decisionTimeBudgetMs = 20;
    (state as any).currentSeed = seed;

    state = startRound(state, seed);
    let steps = 0;

    while (!isRoundEnded(state) && state.phase !== 'ended' && steps < maxSteps) {
      const loopStart = performance.now();
      const samplesCountBefore = getTimingSamples().length;

      const stepStart = performance.now();
      state = stepGame(state);
      const gameStepMs = performance.now() - stepStart;

      steps++;

      if (!checkTileConservation(state)) {
        throw new Error(`Tile conservation violated at step ${steps} in seed ${seed}. Total tiles was not 108.`);
      }

      const totalLoopMs = performance.now() - loopStart;

      const currentSamples = getTimingSamples();
      for (let i = samplesCountBefore; i < currentSamples.length; i++) {
        currentSamples[i].gameStepMs = gameStepMs;
        currentSamples[i].totalLoopMs = totalLoopMs;
        currentSamples[i].roundIndex = r;
      }
    }

    if (steps >= maxSteps) {
      throw new Error(`Simulation exceeded maximum step limit of ${maxSteps} steps for seed ${seed}. Possible infinite loop.`);
    }
  }

  setActiveAdvancedAISettings(originalSettings);

  const allSamples = getTimingSamples();
  const coldStartSamples = allSamples.filter(s => s.coldStart);
  const warmRunSamples = allSamples.filter(s => !s.coldStart);

  const aiDecisionMsList = warmRunSamples.map(s => s.aiDecisionMs);
  const gameStepMsList = warmRunSamples.map(s => s.gameStepMs || 0);
  const totalLoopMsList = warmRunSamples.map(s => s.totalLoopMs || 0);

  const aiDecisionDistribution = calculateDistribution(aiDecisionMsList);
  const gameStepDistribution = calculateDistribution(gameStepMsList);
  const totalLoopDistribution = calculateDistribution(totalLoopMsList);

  const warnings: string[] = [];
  const slowColdStart = coldStartSamples.find(s => s.aiDecisionMs > 300);
  if (slowColdStart) {
    warnings.push(`Cold start decision time exceeded 300ms (${slowColdStart.aiDecisionMs.toFixed(1)}ms). Production build pre-warming or initial game warmup is highly recommended.`);
  }

  return {
    coldStartSamples,
    warmRunSamples,
    aiDecisionDistribution,
    gameStepDistribution,
    totalLoopDistribution,
    excludedColdStartCount: coldStartSamples.length,
    warnings,
  };
}
