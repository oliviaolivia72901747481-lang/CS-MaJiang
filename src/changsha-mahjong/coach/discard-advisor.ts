import { GameState } from '../types/game.js';
import { DiscardAdvice } from './coach-types.js';
import { evaluateDiscardCandidates } from '../ai/tile-value-evaluator.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { getVisibleTiles, getEffectiveTilesForHand, getTileChineseName } from './hand-advisor.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { buildVisibleStateForCoach } from './visible-state.js';
import { analyzeDiscardRisks } from './risk-advisor.js';
import { VisibleInformationForAI } from '../advanced-ai/advanced-ai-types.js';
import { analyzeOpponents } from '../advanced-ai/opponent-modeler.js';
import { evaluateDefense } from '../advanced-ai/defense-analyzer.js';
import { evaluateRoutes } from '../advanced-ai/route-planner.js';
import { decideStrategyMode } from '../advanced-ai/attack-defense-switcher.js';
import { evaluateDiscardExpectedValues } from '../advanced-ai/expected-value-evaluator.js';
import { explainAdvancedDecision } from '../advanced-ai/advanced-ai-explainer.js';

export function recommendDiscards(input: {
  state: GameState;
  humanSeat: 0;
  topN?: number;
}): DiscardAdvice[] {
  const { state, humanSeat, topN = 3 } = input;
  const visibleState = buildVisibleStateForCoach(state, humanSeat);
  const hand = visibleState.humanHand;
  const melds = visibleState.humanMelds;

  if (hand.length === 0) return [];

  const visibleTiles = getVisibleTiles(visibleState);
  const discardsBySeat = visibleState.allDiscards;

  const evaluations = evaluateDiscardCandidates({
    hand,
    melds,
    visibleTiles,
    discardsBySeat,
    selfSeat: humanSeat,
    profile: AI_PROFILES.balanced,
  });

  // Ensure candidate keys are in hand
  const filteredEvaluations = evaluations.filter(e => hand.some(t => `${t.suit}_${t.rank}` === e.tileKey));

  // Sort by discardValue descending
  const sorted = [...filteredEvaluations].sort((a, b) => b.discardValue - a.discardValue);

  // Ensure unique candidates
  const seenKeys = new Set<string>();
  const uniqueCandidates: typeof sorted = [];
  for (const item of sorted) {
    if (!seenKeys.has(item.tileKey)) {
      seenKeys.add(item.tileKey);
      uniqueCandidates.push(item);
    }
  }

  const candidates = uniqueCandidates.slice(0, topN);

  // Advanced AI Coach evaluations using strictly public VisibleStateForCoach
  const visibleInfo: VisibleInformationForAI = {
    seat: 0,
    hand,
    melds,
    allDiscards: visibleState.allDiscards,
    allMelds: {
      0: melds,
      1: state.players.find(p => p.seat === 1)?.melds || [],
      2: state.players.find(p => p.seat === 2)?.melds || [],
      3: state.players.find(p => p.seat === 3)?.melds || [],
    },
    revealedTiles: visibleTiles,
    wallRemainingCount: visibleState.wallRemainingCount,
    currentPhase: state.phase,
    currentSeat: state.currentSeat,
    lastDiscard: state.lastDiscard ? { ...state.lastDiscard } : undefined,
  };

  const opponentReads = analyzeOpponents({ visible: visibleInfo });
  const defenseEvaluations = evaluateDefense({ visible: visibleInfo, opponentReads });
  const routeEvaluations = evaluateRoutes({
    hand,
    melds,
    visibleTiles,
    profile: AI_PROFILES.balanced,
  });
  const handEvaluation = calculateBestShanten(hand, melds);
  const switcherResult = decideStrategyMode({
    handEvaluation,
    routeEvaluations,
    defenseEvaluations,
    wallRemainingCount: visibleState.wallRemainingCount,
    currentScore: state.players[0].score,
    profile: AI_PROFILES.balanced,
  });
  const strategyMode = switcherResult.strategyMode;

  const evResults = evaluateDiscardExpectedValues({
    visible: visibleInfo,
    handEvaluation,
    routeEvaluations,
    defenseEvaluations,
    strategyMode,
    profile: AI_PROFILES.balanced,
  });

  const bestRoute = [...routeEvaluations].sort((a, b) => b.score - a.score)[0];
  const selectedRoute = bestRoute ? bestRoute.route : 'mixed';

  return candidates.map(candidate => {
    const match = hand.find(t => `${t.suit}_${t.rank}` === candidate.tileKey);
    const tileName = match ? getTileChineseName(candidate.tileKey) : candidate.tileKey;

    const handWithoutT = match 
      ? hand.filter(t => t.instanceId !== match.instanceId)
      : hand.filter(t => `${t.suit}_${t.rank}` !== candidate.tileKey);
      
    const shantenResult = calculateBestShanten(handWithoutT, melds);
    const effectiveTiles = getEffectiveTilesForHand(handWithoutT, melds);

    const evMatch = evResults.find(r => r.tileKey === candidate.tileKey);

    const advancedExplain = explainAdvancedDecision({
      action: 'discard',
      tileKey: candidate.tileKey,
      strategyMode,
      selectedRoute,
      expectedValue: evMatch ? evMatch.expectedScore : candidate.discardValue,
      riskScore: evMatch ? evMatch.defenseRisk : 10,
      reason: '',
    });

    const detailReason = `${advancedExplain} (基于公开牌估计) 推荐理由: ${candidate.reason}`;

    return {
      tileKey: candidate.tileKey,
      tileName,
      score: evMatch ? evMatch.expectedScore : candidate.discardValue,
      reason: detailReason,
      expectedShantenAfterDiscard: shantenResult.bestShanten,
      effectiveTilesAfterDiscard: effectiveTiles,
      riskLevel: evMatch && evMatch.defenseRisk > 60 ? 'high' : evMatch && evMatch.defenseRisk > 30 ? 'medium' : 'low',
    };
  });
}
