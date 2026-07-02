import { GameState, PendingAction } from '../types/game.js';
import { AIProfile } from '../ai/ai-types.js';
import { AdvancedAIDecision, RouteEvaluation, DefenseEvaluation } from './advanced-ai-types.js';
import { buildVisibleInformationForAI } from './visible-information.js';
import { analyzeOpponents } from './opponent-modeler.js';
import { evaluateDefense } from './defense-analyzer.js';
import { evaluateRoutes } from './route-planner.js';
import { decideStrategyMode } from './attack-defense-switcher.js';
import { evaluateDiscardExpectedValues } from './expected-value-evaluator.js';
import { runLookaheadSearch } from './lookahead-search.js';
import { explainAdvancedDecision } from './advanced-ai-explainer.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { activeTuningConfig } from '../benchmark/tuning-config.js';
import { PerformanceProfiler } from '../benchmark/performance-profiler.js';
import { getTileChineseName } from '../coach/hand-advisor.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { DecisionTraceContext, traceSpan } from '../benchmark/decision-trace-profiler.js';

function getTileKey(tile: { suit: string; rank: number }): string {
  return `${tile.suit}_${tile.rank}`;
}

function findAbsoluteIsolatedTile(hand: Tile[]): Tile | null {
  const wanCount = hand.filter(t => t.suit === 'wan');
  const tongCount = hand.filter(t => t.suit === 'tong');
  const tiaoCount = hand.filter(t => t.suit === 'tiao');

  const isolatedTiles = hand.filter(t => {
    const suitCount = t.suit === 'wan' ? wanCount.length : t.suit === 'tong' ? tongCount.length : tiaoCount.length;
    return suitCount === 1 && (t.rank === 1 || t.rank === 9);
  });

  if (isolatedTiles.length === 1) {
    return isolatedTiles[0];
  }
  return null;
}

function checkHasBigHuPotential(hand: Tile[], melds: Meld[]): boolean {
  const suitCounts = { wan: 0, tong: 0, tiao: 0 };
  let pairCount = 0;
  const freq = new Map<string, number>();

  for (const t of hand) {
    suitCounts[t.suit]++;
    freq.set(`${t.suit}_${t.rank}`, (freq.get(`${t.suit}_${t.rank}`) || 0) + 1);
  }
  for (const c of freq.values()) {
    if (c >= 2) pairCount++;
  }

  const maxSuitCount = Math.max(suitCounts.wan, suitCounts.tong, suitCounts.tiao);
  const hasMelds = melds.length > 0;

  if (maxSuitCount >= 8) return true;
  if (!hasMelds && pairCount >= 3) return true;
  
  const hasChi = melds.some(m => m.type === 'chi');
  if (!hasChi && (pairCount + melds.length >= 3)) return true;

  return false;
}

export function chooseAdvancedAIDiscard(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  profile: AIProfile;
  startTime?: number;
  budgetMs?: number;
  traceContext?: DecisionTraceContext;
}): AdvancedAIDecision {
  const { state, seat, profile } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    throw new Error(`Player at seat ${seat} not found.`);
  }

  // Fast Path 2: 绝对孤张快出
  const isolatedTile = findAbsoluteIsolatedTile(player.hand);
  if (isolatedTile && player.hand.length >= 13) {
    const tileKey = getTileKey(isolatedTile);
    const tileCN = getTileChineseName(tileKey);
    return {
      action: 'discard',
      tileKey,
      strategyMode: 'attack',
      selectedRoute: 'mixed',
      expectedValue: 150,
      riskScore: 0,
      reason: `[Advanced Full] 极速通道：手牌中存在绝对孤张（${tileCN}，花色中仅此一张且为幺九牌），优先快速打出。`,
    };
  }

  // 1. Build visible sandbox info
  const visible = buildVisibleInformationForAI({ state, aiSeat: seat, traceContext: input.traceContext });

  // 2. Perform opponent analysis
  const opponentReads = traceSpan(input.traceContext, 'opponent-modeler', () =>
    PerformanceProfiler.profileModule('defense-analyzer', () => analyzeOpponents({ visible }))
  );

  // 3. Evaluate safety/defense risk for all tiles
  const defenseEvaluations = traceSpan(input.traceContext, 'defense-analyzer', () =>
    PerformanceProfiler.profileModule('defense-analyzer', () => evaluateDefense({ visible, opponentReads }))
  );

  // Fast Path 3: 强防守下且有现物安全牌时，快速打出现物
  const handEvaluation = calculateBestShanten(visible.hand, visible.melds);
  const wallCount = visible.wallRemainingCount;
  
  // Decide strategy mode preliminarily for Fast Path 3
  const tempRouteEvalsForMode = [
    { route: 'smallHu' as const, score: 100 - handEvaluation.normalShanten * 8, shanten: handEvaluation.normalShanten, potentialScore: 10, requiredTiles: [], reason: 'Temp' },
    { route: 'mixed' as const, score: 80 - handEvaluation.bestShanten * 10, shanten: handEvaluation.bestShanten, potentialScore: 20, requiredTiles: [], reason: 'Temp' }
  ];
  const tempStrategyModeResult = decideStrategyMode({
    handEvaluation,
    routeEvaluations: tempRouteEvalsForMode,
    defenseEvaluations,
    wallRemainingCount: wallCount,
    currentScore: player.score,
    profile,
  });
  const strategyMode = tempStrategyModeResult.strategyMode;

  if (strategyMode === 'fold' || (strategyMode === 'defense' && wallCount < 15)) {
    const safeTileEval = defenseEvaluations.find(d => d.riskScore === 0 && player.hand.some(h => getTileKey(h) === d.tileKey));
    if (safeTileEval) {
      const tileCN = getTileChineseName(safeTileEval.tileKey);
      return {
        action: 'discard',
        tileKey: safeTileEval.tileKey,
        strategyMode,
        selectedRoute: 'mixed',
        expectedValue: 500,
        riskScore: 0,
        reason: `[Advanced Full] 极速通道：当前处于强防守态势且手牌中有对手现物安全牌（${tileCN}），快速打出现物防点炮。`,
      };
    }
  }

  // Fast Path 4: 跳过 route-planner 评分
  const hasBigHuPotential = checkHasBigHuPotential(visible.hand, visible.melds);
  let routeEvaluations: RouteEvaluation[];
  if (hasBigHuPotential) {
    routeEvaluations = traceSpan(input.traceContext, 'route-planner', () =>
      PerformanceProfiler.profileModule('route-planner', () => evaluateRoutes({
        hand: visible.hand,
        melds: visible.melds,
        visibleTiles: visible.revealedTiles,
        profile,
      }))
    );
  } else {
    routeEvaluations = [
      { route: 'smallHu', score: 115 - handEvaluation.normalShanten * 8, shanten: handEvaluation.normalShanten, potentialScore: 10, requiredTiles: [], reason: 'Fast SmallHu' },
      { route: 'mixed', score: 80 - handEvaluation.bestShanten * 10, shanten: handEvaluation.bestShanten, potentialScore: 20, requiredTiles: [], reason: 'Fast Mixed' },
      { route: 'qingYiSe', score: 0, shanten: 99, potentialScore: 60, requiredTiles: [], reason: 'No potential' },
      { route: 'pengPengHu', score: 0, shanten: 99, potentialScore: 40, requiredTiles: [], reason: 'No potential' },
      { route: 'qiXiaoDui', score: 0, shanten: 99, potentialScore: 50, requiredTiles: [], reason: 'No potential' },
      { route: 'jiangJiangHu', score: 0, shanten: 99, potentialScore: 65, requiredTiles: [], reason: 'No potential' },
    ];
  }

  // 6. Expected Value estimation
  const evResults = traceSpan(input.traceContext, 'expected-value', () =>
    PerformanceProfiler.profileModule('expected-value', () => evaluateDiscardExpectedValues({
      visible,
      handEvaluation,
      routeEvaluations,
      defenseEvaluations,
      strategyMode,
      profile,
    }))
  );

  if (evResults.length === 0) {
    throw new Error('Expected value evaluation returned empty candidate discards.');
  }

  // 7. Lookahead search refinement (1-2 steps)
  const tConfig = activeTuningConfig.lookaheadTrigger || {
    enabled: true,
    maxTopK: 2,
    depth: 1,
    budgetMs: 10,
    onlyWhenShantenAtMost: 1,
    skipInDefenseMode: true,
    scoreTieThreshold: 10,
  };

  let lookaheadResults: any[] = [];
  const shanten = handEvaluation.bestShanten;

  const shouldRunLookahead =
    tConfig.enabled &&
    activeTuningConfig.lookaheadTopK > 0 &&
    !(tConfig.skipInDefenseMode && (strategyMode === 'defense' || strategyMode === 'fold')) &&
    shanten <= tConfig.onlyWhenShantenAtMost &&
    evResults.length > 1;

  if (shouldRunLookahead) {
    const bestScore = evResults[0].expectedScore;
    const topKLimit = Math.min(tConfig.maxTopK, activeTuningConfig.lookaheadTopK);
    const candidateKeys: string[] = [];

    for (let i = 0; i < Math.min(evResults.length, topKLimit); i++) {
      if (i === 0 || (bestScore - evResults[i].expectedScore <= tConfig.scoreTieThreshold)) {
        candidateKeys.push(evResults[i].tileKey);
      }
    }

    if (candidateKeys.length > 0) {
      lookaheadResults = traceSpan(input.traceContext, 'lookahead-search', () =>
        PerformanceProfiler.profileModule('lookahead-search', () =>
          runLookaheadSearch({
            visible,
            candidateTileKeys: candidateKeys,
            depth: tConfig.depth as 1 | 2,
            profile,
            startTime: performance.now(),
            budgetMs: tConfig.budgetMs,
          })
        )
      );
    }
  }

  // Merge expected score and lookahead values
  const finalCandidates = evResults.map(ev => {
    const lookRes = lookaheadResults.find(l => l.tileKey === ev.tileKey);
    const searchBonus = lookRes ? lookRes.expectedValue * activeTuningConfig.lookaheadWeight : 0;
    return {
      ...ev,
      finalScore: ev.expectedScore + searchBonus,
    };
  }).sort((a, b) => b.finalScore - a.finalScore);

  const bestCandidate = finalCandidates[0];
  const bestRoute = [...routeEvaluations].sort((a, b) => b.score - a.score)[0];
  const selectedRoute = bestRoute ? bestRoute.route : 'mixed';

  const decision: AdvancedAIDecision = {
    action: 'discard',
    tileKey: bestCandidate.tileKey,
    strategyMode,
    selectedRoute,
    expectedValue: bestCandidate.finalScore,
    riskScore: bestCandidate.defenseRisk,
    reason: '',
  };

  decision.reason = '[Advanced Full] ' + traceSpan(input.traceContext, 'advanced-ai-explainer', () => explainAdvancedDecision(decision));

  return decision;
}

export function chooseAdvancedAIAction(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  availableActions: PendingAction[];
  profile: AIProfile;
  traceContext?: DecisionTraceContext;
}): AdvancedAIDecision {
  const { state, seat, availableActions, profile } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    throw new Error(`Player at seat ${seat} not found.`);
  }

  const myActions = availableActions.filter(a => a.seat === seat);
  if (myActions.length === 0) {
    throw new Error(`No available actions for seat ${seat}.`);
  }

  // Fast Path 1: 能胡必胡
  const winAction = myActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  if (winAction) {
    return {
      action: winAction.type as any,
      tileKey: winAction.tile ? getTileKey(winAction.tile) : undefined,
      strategyMode: 'forceWin',
      selectedRoute: 'mixed',
      expectedValue: 10000,
      riskScore: 0,
      reason: `[Advanced Full] 极速通道：检测到可以直接胡牌（${winAction.type === 'ziMo' ? '自摸' : '点炮胡'}），能胡必胡，直接胡牌。`,
    };
  }

  // 1. Build visible sandbox info
  const visible = buildVisibleInformationForAI({ state, aiSeat: seat, traceContext: input.traceContext });
  
  const opponentReads = traceSpan(input.traceContext, 'opponent-modeler', () =>
    PerformanceProfiler.profileModule('defense-analyzer', () => analyzeOpponents({ visible }))
  );
  
  const defenseEvaluations = traceSpan(input.traceContext, 'defense-analyzer', () =>
    PerformanceProfiler.profileModule('defense-analyzer', () => evaluateDefense({ visible, opponentReads }))
  );
  
  const routeEvaluations = traceSpan(input.traceContext, 'route-planner', () =>
    PerformanceProfiler.profileModule('route-planner', () => evaluateRoutes({
      hand: visible.hand,
      melds: visible.melds,
      visibleTiles: visible.revealedTiles,
      profile,
    }))
  );

  const handEvaluation = calculateBestShanten(visible.hand, visible.melds);
  const switcherResult = decideStrategyMode({
    handEvaluation,
    routeEvaluations,
    defenseEvaluations,
    wallRemainingCount: visible.wallRemainingCount,
    currentScore: player.score,
    profile,
  });
  const strategyMode = switcherResult.strategyMode;
  const bestRoute = [...routeEvaluations].sort((a, b) => b.score - a.score)[0];
  const selectedRoute = bestRoute ? bestRoute.route : 'mixed';

  // Sort available actions by priority
  const actionPriorityMap: Record<string, number> = {
    hu: 10000,
    ziMo: 10000,
    anGang: 800,
    mingGang: 750,
    buGang: 700,
    peng: 500,
    chi: 300,
    pass: 10,
  };

  const scoredActions = myActions.map(act => {
    let baseScore = actionPriorityMap[act.type] || 0;
    
    if (act.type === 'chi' || act.type === 'peng') {
      if (profile.type === 'defensive') {
        baseScore -= 150;
      } else if (profile.type === 'fastHu') {
        baseScore += 100;
      }
    }

    if (act.type === 'pass') {
      if (strategyMode === 'defense' || strategyMode === 'fold') {
        baseScore += 600;
      }
    }

    return {
      action: act.type,
      tileKey: act.tile ? getTileKey(act.tile) : undefined,
      tiles: act.options && act.options[0] ? act.options[0].map(getTileKey) : undefined,
      score: baseScore,
    };
  }).sort((a, b) => b.score - a.score);

  const bestAction = scoredActions[0];

  const decision: AdvancedAIDecision = {
    action: bestAction.action as any,
    tileKey: bestAction.tileKey,
    tiles: bestAction.tiles,
    strategyMode,
    selectedRoute,
    expectedValue: bestAction.score,
    riskScore: 0,
    reason: '',
  };

  decision.reason = '[Advanced Full] ' + traceSpan(input.traceContext, 'advanced-ai-explainer', () => explainAdvancedDecision(decision));

  return decision;
}
