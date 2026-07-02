import { GameState, PendingAction } from '../types/game.js';
import { AIDecision, AIProfile } from './ai-types.js';
import { chooseBestDiscard, evaluateDiscardCandidates } from './tile-value-evaluator.js';
import { decideAction } from './action-decision-engine.js';
import { Tile } from '../types/tile.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function chooseAIDiscard(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  profile: AIProfile;
}): AIDecision {
  const { state, seat, profile } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player || player.hand.length === 0) {
    throw new Error(`Player at seat ${seat} has no tiles to discard.`);
  }

  // Gather visible tiles from player's perspective
  const visibleTiles = [
    ...player.hand,
    ...state.players.flatMap(p => p.melds.flatMap(m => m.tiles)),
    ...Object.values(state.discards).flat()
  ];

  // Choose best discard tile
  const bestDiscard = chooseBestDiscard({
    hand: player.hand,
    melds: player.melds,
    visibleTiles,
    discardsBySeat: state.discards,
    selfSeat: seat,
    profile,
  });

  // Find candidate evaluation to get the exact reason
  const evals = evaluateDiscardCandidates({
    hand: player.hand,
    melds: player.melds,
    visibleTiles,
    discardsBySeat: state.discards,
    selfSeat: seat,
    profile,
  });
  const bestEval = evals.find(ev => ev.tileKey === getTileKey(bestDiscard));

  return {
    action: 'discard',
    tileKey: getTileKey(bestDiscard),
    score: bestEval ? bestEval.discardValue : 100,
    reason: bestEval ? bestEval.reason : 'AI最佳出牌选择',
  };
}

export function chooseAIAction(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  availableActions: PendingAction[];
  profile: AIProfile;
}): AIDecision {
  const { state, seat, availableActions, profile } = input;
  const player = state.players.find(p => p.seat === seat);
  if (!player) {
    throw new Error(`Player at seat ${seat} not found.`);
  }

  // Gather visible tiles from player's perspective
  const visibleTiles = [
    ...player.hand,
    ...state.players.flatMap(p => p.melds.flatMap(m => m.tiles)),
    ...Object.values(state.discards).flat()
  ];

  return decideAction({
    availableActions,
    hand: player.hand,
    melds: player.melds,
    visibleTiles,
    discardsBySeat: state.discards,
    selfSeat: seat,
    profile,
  });
}
