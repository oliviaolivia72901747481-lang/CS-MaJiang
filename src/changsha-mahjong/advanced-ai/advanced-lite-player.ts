import { GameState, PendingAction } from '../types/game.js';
import { AIProfile } from '../ai/ai-types.js';
import { AdvancedAIDecision } from './advanced-ai-types.js';
import { buildVisibleInformationForAI } from './visible-information.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { evaluateRouteHintsLite } from './route-lite.js';
import { evaluateDefense } from './defense-analyzer.js';
import { analyzeOpponents } from './opponent-modeler.js';
import { decideStrategyMode } from './attack-defense-switcher.js';
import { getTileChineseName } from '../coach/hand-advisor.js';
import { Tile } from '../types/tile.js';
import { DecisionTraceContext, traceSpan } from '../benchmark/decision-trace-profiler.js';

function getTileKey(tile: { suit: string; rank: number }): string {
  return `${tile.suit}_${tile.rank}`;
}

function removeOneTile(hand: Tile[], tileKey: string): Tile[] {
  const [suit, rankStr] = tileKey.split('_');
  const rank = parseInt(rankStr, 10);
  let found = false;
  return hand.filter(t => {
    if (!found && t.suit === suit && t.rank === rank) {
      found = true;
      return false;
    }
    return true;
  });
}

export function chooseAdvancedLiteDiscard(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  profile: AIProfile;
  traceContext?: DecisionTraceContext;
}): AdvancedAIDecision {
  const { state, seat, profile } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player || player.hand.length === 0) {
    throw new Error(`Player at seat ${seat} has no hand tiles.`);
  }

  // 1. Build visible sandbox info
  const visible = buildVisibleInformationForAI({ state, aiSeat: seat, traceContext: input.traceContext });
  const hand = visible.hand;
  const melds = visible.melds;

  // 2. Evaluate defense (fast)
  const opponentReads = traceSpan(input.traceContext, 'opponent-modeler', () => 
    analyzeOpponents({ visible })
  );
  const defenseEvaluations = traceSpan(input.traceContext, 'defense-analyzer', () =>
    evaluateDefense({ visible, opponentReads })
  );

  // 3. Switcher strategy mode
  const handEvaluation = calculateBestShanten(hand, melds);
  
  // Lite route hints
  const hints = traceSpan(input.traceContext, 'route-planner', () =>
    evaluateRouteHintsLite({ hand, melds, profile })
  );
  
  // Decide strategy mode
  const tempRouteEvals = [
    { route: 'smallHu' as const, score: 100 - handEvaluation.normalShanten * 8, shanten: handEvaluation.normalShanten, potentialScore: 10, requiredTiles: [], reason: 'Temp' },
    { route: 'mixed' as const, score: 80 - handEvaluation.bestShanten * 10, shanten: handEvaluation.bestShanten, potentialScore: 20, requiredTiles: [], reason: 'Temp' }
  ];
  const switcherResult = decideStrategyMode({
    handEvaluation,
    routeEvaluations: tempRouteEvals,
    defenseEvaluations,
    wallRemainingCount: visible.wallRemainingCount,
    currentScore: player.score,
    profile,
  });
  const strategyMode = switcherResult.strategyMode;

  // Fast Path 3: 如果防守模式且有现物安全牌，打安全牌
  if (strategyMode === 'fold' || (strategyMode === 'defense' && visible.wallRemainingCount < 15)) {
    const safeTileEval = defenseEvaluations.find(d => d.riskScore === 0 && hand.some(h => getTileKey(h) === d.tileKey));
    if (safeTileEval) {
      return {
        action: 'discard',
        tileKey: safeTileEval.tileKey,
        strategyMode,
        selectedRoute: 'mixed',
        expectedValue: 500,
        riskScore: 0,
        reason: `[Advanced Lite] 极速防守现物：打出安全牌 ${getTileChineseName(safeTileEval.tileKey)}，避铳安全第一。`,
      };
    }
  }

  // Calculate suit counts for route hint
  const suitCounts = { wan: 0, tong: 0, tiao: 0 };
  for (const t of hand) {
    suitCounts[t.suit]++;
  }

  // Determine if we should pursue bigHu based on profile and route hints
  let targetBigHu: 'qingYiSe' | 'pengPengHu' | 'qiXiaoDui' | 'jiangJiangHu' | null = null;
  
  const isBigHuStrong = hints.qingYiSePotential === 'strong' || hints.pengPengHuPotential === 'strong' || hints.qiXiaoDuiPotential === 'strong' || hints.jiangJiangHuPotential === 'strong';
  const isBigHuWeak = hints.qingYiSePotential === 'weak' || hints.pengPengHuPotential === 'weak' || hints.qiXiaoDuiPotential === 'weak' || hints.jiangJiangHuPotential === 'weak';

  let pursueBigHu = false;
  if (profile.type === 'bigHu' && (isBigHuStrong || isBigHuWeak)) {
    pursueBigHu = true;
  } else if (profile.type === 'balanced' && isBigHuStrong) {
    pursueBigHu = true;
  } else if (profile.type === 'fastHu' && hints.qingYiSePotential === 'strong' && hand.filter(t => t.suit === 'wan').length >= 11) {
    pursueBigHu = true;
  }
  
  if (profile.type === 'defensive') {
    pursueBigHu = false;
  }

  if (pursueBigHu) {
    if (hints.qingYiSePotential === 'strong' || hints.qingYiSePotential === 'weak') targetBigHu = 'qingYiSe';
    else if (hints.jiangJiangHuPotential === 'strong' || hints.jiangJiangHuPotential === 'weak') targetBigHu = 'jiangJiangHu';
    else if (hints.qiXiaoDuiPotential === 'strong' || hints.qiXiaoDuiPotential === 'weak') targetBigHu = 'qiXiaoDui';
    else if (hints.pengPengHuPotential === 'strong' || hints.pengPengHuPotential === 'weak') targetBigHu = 'pengPengHu';
  }

  // Evaluate candidate discards
  const uniqueKeys = Array.from(new Set(hand.map(getTileKey)));
  const candidates = traceSpan(input.traceContext, 'expected-value', () => {
    return uniqueKeys.map(tileKey => {
      const handWithoutT = removeOneTile(hand, tileKey);
      const shantenAfter = calculateBestShanten(handWithoutT, melds).bestShanten;

      let baseScore = (8 - shantenAfter) * 15;
      const defEval = defenseEvaluations.find(d => d.tileKey === tileKey);
      const risk = defEval ? defEval.riskScore : 10;

      let defenseFactor = 0.6;
      if (strategyMode === 'forceWin' || strategyMode === 'attack') defenseFactor = 0.15;
      else if (strategyMode === 'defense') defenseFactor = 1.8;
      else if (strategyMode === 'fold') defenseFactor = 2.5;

      let score = baseScore - (risk * defenseFactor);

      if (targetBigHu === 'qingYiSe') {
        const dominatingSuit = Object.keys(suitCounts).reduce((a, b) => 
          suitCounts[a as keyof typeof suitCounts] > suitCounts[b as keyof typeof suitCounts] ? a : b
        ) as 'wan' | 'tong' | 'tiao';
        const [suit] = tileKey.split('_');
        if (suit !== dominatingSuit) {
          score += 40;
        } else {
          score -= 20;
        }
      } else if (targetBigHu === 'jiangJiangHu') {
        const [_, rankStr] = tileKey.split('_');
        const rank = parseInt(rankStr, 10);
        const isJiang = rank === 2 || rank === 5 || rank === 8;
        if (!isJiang) {
          score += 35;
        } else {
          score -= 15;
        }
      } else if (targetBigHu === 'qiXiaoDui' || targetBigHu === 'pengPengHu') {
        const count = hand.filter(t => getTileKey(t) === tileKey).length;
        if (count === 1) {
          score += 30;
        } else if (count >= 2) {
          score -= 20;
        }
      }

      return {
        tileKey,
        score,
        risk,
        shantenAfter,
      };
    }).sort((a, b) => b.score - a.score);
  });

  const best = candidates[0];

  const decisionReason = traceSpan(input.traceContext, 'advanced-ai-explainer', () =>
    `[Advanced Lite] 选择打出 ${getTileChineseName(best.tileKey)}。当前向听数 ${best.shantenAfter}，安全威胁分 ${best.risk.toFixed(0)}。决策依据: 模式 ${strategyMode}，大胡判定 ${targetBigHu || '无'}。`
  );

  return {
    action: 'discard',
    tileKey: best.tileKey,
    strategyMode,
    selectedRoute: targetBigHu || 'mixed',
    expectedValue: best.score,
    riskScore: best.risk,
    reason: decisionReason,
  };
}

export function chooseAdvancedLiteAction(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  availableActions: PendingAction[];
  profile: AIProfile;
  traceContext?: DecisionTraceContext;
}): AdvancedAIDecision {
  const { state, seat, availableActions } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    throw new Error(`Player at seat ${seat} not found.`);
  }

  const myActions = availableActions.filter(a => a.seat === seat);
  if (myActions.length === 0) {
    throw new Error(`No pending actions for seat ${seat}.`);
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
      reason: `[Advanced Lite] 极速通道：检测到可以直接和牌，直接胡牌。`,
    };
  }

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

  const scoredActions = traceSpan(input.traceContext, 'expected-value', () => {
    return myActions.map(act => {
      const baseScore = actionPriorityMap[act.type] || 0;
      return {
        action: act.type,
        tileKey: act.tile ? getTileKey(act.tile) : undefined,
        tiles: act.options && act.options[0] ? act.options[0].map(getTileKey) : undefined,
        score: baseScore,
      };
    }).sort((a, b) => b.score - a.score);
  });

  const bestAction = scoredActions[0];

  const decisionReason = traceSpan(input.traceContext, 'advanced-ai-explainer', () =>
    `[Advanced Lite] 选择动作 ${bestAction.action}，决策期望评分为 ${bestAction.score}。`
  );

  return {
    action: bestAction.action as any,
    tileKey: bestAction.tileKey,
    tiles: bestAction.tiles,
    strategyMode: 'balanced',
    selectedRoute: 'mixed',
    expectedValue: bestAction.score,
    riskScore: 0,
    reason: decisionReason,
  };
}
