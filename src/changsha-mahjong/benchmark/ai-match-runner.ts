import { GameState } from '../types/game.js';
import { createInitialGameState, startRound, stepGame, isRoundEnded } from '../controller/game-engine.js';
import { BenchmarkConfig, BenchmarkResult, PlayerRoundMetrics } from './benchmark-types.js';
import { collectRoundMetrics } from './ai-metrics-collector.js';
import { PerformanceProfiler } from './performance-profiler.js';

export function checkTileConservation(state: GameState): boolean {
  let total = 0;
  for (const p of state.players) {
    total += p.hand.length;
    for (const m of p.melds) {
      total += m.tiles.length;
    }
    const discards = state.discards[p.seat] || [];
    total += discards.length;
  }
  total += state.wall.length;
  if (state.birdTiles) {
    total += state.birdTiles.length;
  }
  return total === 108;
}

export function runAIMatch(config: BenchmarkConfig): BenchmarkResult {
  PerformanceProfiler.reset();

  let completedRounds = 0;
  let drawRounds = 0;

  const accumulatedMetrics: PlayerRoundMetrics[] = [0, 1, 2, 3].map(seat => ({
    seat: seat as 0 | 1 | 2 | 3,
    aiEngine: config.aiEngines[seat as 0 | 1 | 2 | 3],
    profile: config.aiProfiles[seat as 0 | 1 | 2 | 3],
    scoreDelta: 0,
    winCount: 0,
    dealInCount: 0,
    ziMoCount: 0,
    dianPaoWinCount: 0,
    bigHuCount: 0,
    smallHuCount: 0,
    gangCount: 0,
    chiCount: 0,
    pengCount: 0,
    discardCount: 0,
    riskyDiscardCount: 0,
  }));

  for (let r = 0; r < config.rounds; r++) {
    const seed = config.seeds[r % config.seeds.length];

    let state = createInitialGameState();
    
    // Assign AI engines and profiles to players
    state.players.forEach(p => {
      (p as any).aiEngine = config.aiEngines[p.seat];
      p.aiProfile = config.aiProfiles[p.seat];
    });
    (state as any).decisionTimeBudgetMs = config.decisionTimeBudgetMs;
    (state as any).currentSeed = seed;

    state = startRound(state, seed);

    let steps = 0;
    const maxSteps = config.maxStepsPerRound;

    while (!isRoundEnded(state) && state.phase !== 'ended' && steps < maxSteps) {
      state = stepGame(state);
      steps++;
      
      // Tile conservation check at each step
      if (!checkTileConservation(state)) {
        throw new Error(`Tile conservation violated at step ${steps} in seed ${seed}. Total tiles was not 108.`);
      }
    }

    if (steps >= maxSteps) {
      throw new Error(`Simulation exceeded maximum step limit of ${maxSteps} steps for seed ${seed}. Possible infinite loop.`);
    }

    // Check draw
    if (state.winnerSeats.length === 0) {
      drawRounds++;
    }

    // Collect round metrics
    const roundMetrics = collectRoundMetrics({
      finalState: state,
      aiEngines: config.aiEngines,
      aiProfiles: config.aiProfiles,
    });

    // Accumulate
    for (let seat = 0; seat < 4; seat++) {
      const rm = roundMetrics[seat];
      const am = accumulatedMetrics[seat];
      am.scoreDelta += rm.scoreDelta;
      am.winCount += rm.winCount;
      am.dealInCount += rm.dealInCount;
      am.ziMoCount += rm.ziMoCount;
      am.dianPaoWinCount += rm.dianPaoWinCount;
      am.bigHuCount += rm.bigHuCount;
      am.smallHuCount += rm.smallHuCount;
      am.gangCount += rm.gangCount;
      am.chiCount += rm.chiCount;
      am.pengCount += rm.pengCount;
      am.discardCount += rm.discardCount;
      am.riskyDiscardCount += rm.riskyDiscardCount;
    }

    completedRounds++;
  }

  const performanceMetrics = PerformanceProfiler.getMetrics();

  return {
    config,
    totalRounds: config.rounds,
    completedRounds,
    drawRounds,
    playerMetrics: accumulatedMetrics,
    performance: performanceMetrics,
    summary: `Benchmark completed ${completedRounds}/${config.rounds} rounds. Draws: ${drawRounds}.`,
  };
}
