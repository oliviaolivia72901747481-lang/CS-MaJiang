import { runAIMatch } from './ai-match-runner.js';
import { setColdStartPhase } from './performance-metrics-v2.js';
import { activeAdvancedAISettings, setActiveAdvancedAISettings } from './tuning-config.js';

export function warmupAdvancedLite(input: {
  rounds: number;
  seeds: string[];
}): void {
  setColdStartPhase(true);

  const originalSettings = { ...activeAdvancedAISettings };
  setActiveAdvancedAISettings({
    mode: 'lite',
    enableLookahead: false,
    enableFullOpponentModeler: false,
    enableFullRoutePlanner: false,
  });

  runAIMatch({
    rounds: input.rounds,
    seeds: input.seeds,
    aiEngines: { 0: 'basic', 1: 'advanced', 2: 'basic', 3: 'advanced' },
    aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
    maxStepsPerRound: 500,
    decisionTimeBudgetMs: 20,
  });

  setActiveAdvancedAISettings(originalSettings);
}
