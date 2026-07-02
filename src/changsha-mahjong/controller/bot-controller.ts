import { GameState, PendingAction } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { sortTiles } from '../engine/tile-engine.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { AIProfileType } from '../ai/ai-types.js';
import { chooseAIDiscard, chooseAIAction } from '../ai/ai-player.js';
import { chooseAdvancedAIDiscard, chooseAdvancedAIAction } from '../advanced-ai/advanced-ai-player.js';
import { chooseAdvancedLiteDiscard, chooseAdvancedLiteAction } from '../advanced-ai/advanced-lite-player.js';
import { activeAdvancedAISettings, AdvancedAIMode } from '../benchmark/tuning-config.js';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';
import { startDecisionTrace, finishDecisionTrace, traceSpan, DecisionTraceContext } from '../benchmark/decision-trace-profiler.js';
import { recordTimingSample, isColdStartPhase } from '../benchmark/performance-metrics-v2.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function chooseDiscard(state: GameState, seat: 0 | 1 | 2 | 3): Tile {
  const player = state.players.find(p => p.seat === seat);
  if (!player || player.hand.length === 0) {
    throw new Error(`Player at seat ${seat} has no tiles to discard.`);
  }

  // Load profile
  const profileType = (player.aiProfile || (seat === 0 ? 'balanced' : seat === 1 ? 'fastHu' : seat === 2 ? 'bigHu' : 'defensive')) as AIProfileType;
  const profile = AI_PROFILES[profileType];

  let aiEngine = (player as any).aiEngine || 'advanced';
  const budgetMs = (state as any).decisionTimeBudgetMs || 20;

  let effectiveMode: AdvancedAIMode = 'lite';
  if (aiEngine === 'advanced') {
    effectiveMode = activeAdvancedAISettings.mode;
    if (effectiveMode === 'basic') {
      aiEngine = 'basic';
    }
  }

  let decision: any;
  let elapsedMs = 0;
  let isFallback = false;

  const recordSample = (ms: number, isFallbackFlag: boolean, engineUsed: 'advanced' | 'basic') => {
    const modeStr: 'basic' | 'lite' | 'full' = engineUsed === 'basic' ? 'basic' : effectiveMode;
    recordTimingSample({
      seed: (state as any).currentSeed || 'unknown',
      roundIndex: 0,
      step: state.logs.length,
      seat,
      actionType: 'discard',
      aiMode: modeStr,
      coldStart: isColdStartPhase,
      aiDecisionMs: ms,
      over20ms: ms > 20,
      over80ms: ms > 80,
      source: 'runtime',
    });
  };

  let traceContext: DecisionTraceContext | undefined;
  if (aiEngine === 'advanced') {
    traceContext = startDecisionTrace({
      seed: (state as any).currentSeed || 'unknown',
      step: state.logs.length,
      seat,
      actionType: 'discard',
    });
  }

  if (aiEngine === 'advanced') {
    try {
      const startTime = performance.now();
      const profileResult = PerformanceProfiler.profileDecision({
        label: `seat_${seat}_chooseDiscard`,
        budgetMs,
        fn: () => {
          if (effectiveMode === 'lite') {
            return chooseAdvancedLiteDiscard({ state, seat, profile, traceContext });
          } else {
            return chooseAdvancedAIDiscard({ state, seat, profile, startTime, budgetMs, traceContext });
          }
        }
      });
      decision = profileResult.result;
      elapsedMs = profileResult.elapsedMs;

      if (elapsedMs > 80) {
        PerformanceProfiler.recordSlowSample({
          seed: (state as any).currentSeed || 'unknown',
          step: state.logs.length,
          seat,
          elapsedMs,
          reason: decision.reason || 'Advanced AI Discard Decision',
        });
      }

      if (traceContext) {
        finishDecisionTrace(traceContext);
      }
      
      // Save reason
      if (!(state as any).tempReasons) {
        (state as any).tempReasons = {};
      }
      (state as any).tempReasons[seat] = decision.reason;

      // Find matched tile
      const matched = player.hand.find(t => getTileKey(t) === decision.tileKey);
      if (matched) {
        // Record details for benchmark
        if (!(state as any).benchmarkMetrics) {
          (state as any).benchmarkMetrics = { decisions: [] };
        }
        (state as any).benchmarkMetrics.decisions.push({
          seat,
          engine: 'advanced',
          action: 'discard',
          riskScore: decision.riskScore || 0,
          elapsedMs,
          fallback: false
        });
        recordSample(elapsedMs, false, 'advanced');
        return matched;
      }
    } catch (e) {
      console.warn(`Advanced AI error at seat ${seat} in chooseDiscard, falling back to basic AI:`, e);
      isFallback = true;
      PerformanceProfiler.recordFallback();
      if (traceContext) {
        traceSpan(traceContext, 'fallback', () => {});
        finishDecisionTrace(traceContext);
      }
    }
  }

  // Fallback to basic AI or Basic AI directly
  try {
    const profileResult = PerformanceProfiler.profileDecision({
      label: `seat_${seat}_chooseDiscard_basic`,
      budgetMs,
      fn: () => chooseAIDiscard({ state, seat, profile })
    });
    decision = profileResult.result;
    elapsedMs = profileResult.elapsedMs;

    // Save reason
    if (!(state as any).tempReasons) {
      (state as any).tempReasons = {};
    }
    (state as any).tempReasons[seat] = isFallback 
      ? `Fallback: [降级备用] ${decision.reason}`
      : decision.reason;

    // Find matched tile
    const matched = player.hand.find(t => getTileKey(t) === decision.tileKey);
    if (matched) {
      // Record details for benchmark
      if (!(state as any).benchmarkMetrics) {
        (state as any).benchmarkMetrics = { decisions: [] };
      }
      (state as any).benchmarkMetrics.decisions.push({
        seat,
        engine: isFallback ? 'advanced' : 'basic',
        action: 'discard',
        riskScore: decision.riskScore || 0,
        elapsedMs,
        fallback: isFallback
      });
      recordSample(elapsedMs, isFallback, isFallback ? 'advanced' : 'basic');
      return matched;
    }
  } catch (err) {
    console.warn(`Basic AI error at seat ${seat} in chooseDiscard, falling back to minimal Bot:`, err);
    isFallback = true;
    PerformanceProfiler.recordFallback();
  }

  // Fallback to old minimal Bot
  const fallbackTile = sortTiles(player.hand)[0];
  if (!(state as any).tempReasons) {
    (state as any).tempReasons = {};
  }
  (state as any).tempReasons[seat] = 'Fallback: 降级备用: 最小出牌策略（孤张/末张）';

  // Record details for benchmark
  if (!(state as any).benchmarkMetrics) {
    (state as any).benchmarkMetrics = { decisions: [] };
  }
  (state as any).benchmarkMetrics.decisions.push({
    seat,
    engine: aiEngine,
    action: 'discard',
    riskScore: 0,
    elapsedMs: 0,
    fallback: true
  });

  recordSample(0, true, aiEngine === 'advanced' ? 'advanced' : 'basic');
  return fallbackTile;
}

export function chooseAction(
  state: GameState,
  seat: 0 | 1 | 2 | 3,
  actions: PendingAction[]
): PendingAction {
  const myActions = actions.filter(a => a.seat === seat);
  if (myActions.length === 0) {
    throw new Error(`No pending actions for player at seat ${seat}.`);
  }

  const player = state.players.find(p => p.seat === seat);
  const profileType = ((player && player.aiProfile) || (seat === 0 ? 'balanced' : seat === 1 ? 'fastHu' : seat === 2 ? 'bigHu' : 'defensive')) as AIProfileType;
  const profile = AI_PROFILES[profileType];

  let aiEngine = (player as any)?.aiEngine || 'advanced';
  const budgetMs = (state as any).decisionTimeBudgetMs || 20;

  let effectiveMode: AdvancedAIMode = 'lite';
  if (aiEngine === 'advanced') {
    effectiveMode = activeAdvancedAISettings.mode;
    if (effectiveMode === 'basic') {
      aiEngine = 'basic';
    }
  }

  let decision: any;
  let elapsedMs = 0;
  let isFallback = false;

  const recordSample = (ms: number, isFallbackFlag: boolean, engineUsed: 'advanced' | 'basic') => {
    const modeStr: 'basic' | 'lite' | 'full' = engineUsed === 'basic' ? 'basic' : effectiveMode;
    recordTimingSample({
      seed: (state as any).currentSeed || 'unknown',
      roundIndex: 0,
      step: state.logs.length,
      seat,
      actionType: 'action',
      aiMode: modeStr,
      coldStart: isColdStartPhase,
      aiDecisionMs: ms,
      over20ms: ms > 20,
      over80ms: ms > 80,
      source: 'runtime',
    });
  };

  let traceContext: DecisionTraceContext | undefined;
  if (aiEngine === 'advanced') {
    traceContext = startDecisionTrace({
      seed: (state as any).currentSeed || 'unknown',
      step: state.logs.length,
      seat,
      actionType: 'action',
    });
  }

  if (aiEngine === 'advanced') {
    try {
      const profileResult = PerformanceProfiler.profileDecision({
        label: `seat_${seat}_chooseAction`,
        budgetMs,
        fn: () => {
          if (effectiveMode === 'lite') {
            return chooseAdvancedLiteAction({ state, seat, availableActions: actions, profile, traceContext });
          } else {
            return chooseAdvancedAIAction({ state, seat, availableActions: actions, profile, traceContext });
          }
        }
      });
      decision = profileResult.result;
      elapsedMs = profileResult.elapsedMs;

      if (elapsedMs > 80) {
        PerformanceProfiler.recordSlowSample({
          seed: (state as any).currentSeed || 'unknown',
          step: state.logs.length,
          seat,
          elapsedMs,
          reason: decision.reason || 'Advanced AI Action Decision',
        });
      }

      if (traceContext) {
        finishDecisionTrace(traceContext);
      }

      // Save reason
      if (!(state as any).tempReasons) {
        (state as any).tempReasons = {};
      }
      (state as any).tempReasons[seat] = decision.reason;

      // Find matched action
      const matched = myActions.find(a => {
        if (a.type !== decision.action) return false;
        if (decision.tileKey && a.tile) {
          return getTileKey(a.tile) === decision.tileKey;
        }
        return true;
      });

      if (matched) {
        // Re-order Chi options if AI chose a specific one
        if (decision.action === 'chi' && decision.tiles && matched.options) {
          const targetStr = [...decision.tiles].sort().join(',');
          matched.options.sort((optA, optB) => {
            const strA = optA.map(t => getTileKey(t)).sort().join(',');
            const strB = optB.map(t => getTileKey(t)).sort().join(',');
            if (strA === targetStr) return -1;
            if (strB === targetStr) return 1;
            return 0;
          });
        }

        // Record details for benchmark
        if (!(state as any).benchmarkMetrics) {
          (state as any).benchmarkMetrics = { decisions: [] };
        }
        (state as any).benchmarkMetrics.decisions.push({
          seat,
          engine: 'advanced',
          action: decision.action,
          riskScore: 0,
          elapsedMs,
          fallback: false
        });

        recordSample(elapsedMs, false, 'advanced');
        return matched;
      }
    } catch (e) {
      console.warn(`Advanced AI error at seat ${seat} in chooseAction, falling back to basic AI:`, e);
      isFallback = true;
      PerformanceProfiler.recordFallback();
      if (traceContext) {
        traceSpan(traceContext, 'fallback', () => {});
        finishDecisionTrace(traceContext);
      }
    }
  }

  // Fallback to basic AI or Basic AI directly
  try {
    const profileResult = PerformanceProfiler.profileDecision({
      label: `seat_${seat}_chooseAction_basic`,
      budgetMs,
      fn: () => chooseAIAction({ state, seat, availableActions: actions, profile })
    });
    decision = profileResult.result;
    elapsedMs = profileResult.elapsedMs;

    // Save reason
    if (!(state as any).tempReasons) {
      (state as any).tempReasons = {};
    }
    (state as any).tempReasons[seat] = isFallback 
      ? `Fallback: [降级备用] ${decision.reason}`
      : decision.reason;

    // Find matched action
    const matched = myActions.find(a => {
      if (a.type !== decision.action) return false;
      if (decision.tileKey && a.tile) {
        return getTileKey(a.tile) === decision.tileKey;
      }
      return true;
    });

    if (matched) {
      // Record details for benchmark
      if (!(state as any).benchmarkMetrics) {
        (state as any).benchmarkMetrics = { decisions: [] };
      }
      (state as any).benchmarkMetrics.decisions.push({
        seat,
        engine: isFallback ? 'advanced' : 'basic',
        action: decision.action,
        riskScore: 0,
        elapsedMs,
        fallback: isFallback
      });

      recordSample(elapsedMs, isFallback, isFallback ? 'advanced' : 'basic');
      return matched;
    }
  } catch (err) {
    console.warn(`Basic AI error at seat ${seat} in chooseAction, falling back to minimal Bot:`, err);
    isFallback = true;
    PerformanceProfiler.recordFallback();
  }

  // Fallback to old Bot
  const huAction = myActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  if (huAction) {
    if (!(state as any).tempReasons) {
      (state as any).tempReasons = {};
    }
    (state as any).tempReasons[seat] = 'Fallback: 降级备用: 能胡就胡（最小策略胡）';
    
    if (!(state as any).benchmarkMetrics) {
      (state as any).benchmarkMetrics = { decisions: [] };
    }
    (state as any).benchmarkMetrics.decisions.push({
      seat,
      engine: aiEngine,
      action: huAction.type,
      riskScore: 0,
      elapsedMs: 0,
      fallback: true
    });

    recordSample(0, true, aiEngine === 'advanced' ? 'advanced' : 'basic');
    return huAction;
  }

  const passAction = myActions.find(a => a.type === 'pass');
  if (passAction) {
    if (!(state as any).tempReasons) {
      (state as any).tempReasons = {};
    }
    (state as any).tempReasons[seat] = 'Fallback: 降级备用: 过牌（最小策略过）';

    if (!(state as any).benchmarkMetrics) {
      (state as any).benchmarkMetrics = { decisions: [] };
    }
    (state as any).benchmarkMetrics.decisions.push({
      seat,
      engine: aiEngine,
      action: 'pass',
      riskScore: 0,
      elapsedMs: 0,
      fallback: true
    });

    recordSample(0, true, aiEngine === 'advanced' ? 'advanced' : 'basic');
    return passAction;
  }

  if (!(state as any).tempReasons) {
    (state as any).tempReasons = {};
  }
  (state as any).tempReasons[seat] = 'Fallback: 降级备用: 默认首个动作（最小策略）';

  if (!(state as any).benchmarkMetrics) {
    (state as any).benchmarkMetrics = { decisions: [] };
  }
  (state as any).benchmarkMetrics.decisions.push({
    seat,
    engine: aiEngine,
    action: myActions[0].type,
    riskScore: 0,
    elapsedMs: 0,
    fallback: true
  });

  recordSample(0, true, aiEngine === 'advanced' ? 'advanced' : 'basic');
  return myActions[0];
}
