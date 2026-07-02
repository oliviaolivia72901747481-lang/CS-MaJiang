import { GameState } from '../types/game.js';
import { createInitialGameState, startRound, stepGame, isRoundEnded } from '../controller/game-engine.js';
import { buildSettlementSummary } from '../controller/settlement-controller.js';
import { formatLog } from '../controller/game-log.js';

export function simulateOneRound(options?: string | {
  seed?: string;
  aiProfiles?: string[];
}): {
  finalState: GameState;
  summary: string;
} {
  let seed: string | undefined;
  let aiProfiles: string[] | undefined;

  if (typeof options === 'string') {
    seed = options;
  } else if (options && typeof options === 'object') {
    seed = options.seed;
    aiProfiles = options.aiProfiles;
  }

  let state = createInitialGameState();

  if (aiProfiles && aiProfiles.length > 0) {
    state.players.forEach((p, idx) => {
      p.aiProfile = aiProfiles![idx % aiProfiles.length];
    });
  }

  state = startRound(state, seed);

  let steps = 0;
  const maxSteps = 500;

  // Track state transitions to ensure we don't loop endlessly
  while (!isRoundEnded(state) && state.phase !== 'ended' && steps < maxSteps) {
    state = stepGame(state);
    steps++;
  }

  if (steps >= maxSteps) {
    throw new Error(`Simulation exceeded maximum step limit of ${maxSteps} steps. Possible infinite loop.`);
  }

  // Format logs for printing
  const logLines = state.logs.map(formatLog).join('\n');
  console.log('=== 长沙麻将对局日志 ===');
  console.log(logLines);
  console.log('=======================\n');

  const summary = buildSettlementSummary(state);
  console.log(summary);

  return {
    finalState: state,
    summary,
  };
}
