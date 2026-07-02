import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { VisibleInformationForAI } from './advanced-ai-types.js';
import { DecisionTraceContext, traceSpan } from '../benchmark/decision-trace-profiler.js';

export function buildVisibleInformationForAI(input: {
  state: GameState;
  aiSeat: 0 | 1 | 2 | 3;
  traceContext?: DecisionTraceContext;
}): VisibleInformationForAI {
  return traceSpan(input.traceContext, 'visible-information', () => {
    const { state, aiSeat } = input;
    const aiPlayer = state.players.find(p => p.seat === aiSeat);

    const allDiscards: Record<0 | 1 | 2 | 3, Tile[]> = {
      0: [...(state.discards[0] || [])],
      1: [...(state.discards[1] || [])],
      2: [...(state.discards[2] || [])],
      3: [...(state.discards[3] || [])],
    };

    const allMelds: Record<0 | 1 | 2 | 3, Meld[]> = {
      0: [...(state.players.find(p => p.seat === 0)?.melds || [])],
      1: [...(state.players.find(p => p.seat === 1)?.melds || [])],
      2: [...(state.players.find(p => p.seat === 2)?.melds || [])],
      3: [...(state.players.find(p => p.seat === 3)?.melds || [])],
    };

    const revealedTiles: Tile[] = [];
    if (aiPlayer) {
      revealedTiles.push(...aiPlayer.hand);
    }

    for (let seat = 0; seat < 4; seat++) {
      const melds = allMelds[seat as 0 | 1 | 2 | 3];
      for (const m of melds) {
        revealedTiles.push(...m.tiles);
      }
      revealedTiles.push(...allDiscards[seat as 0 | 1 | 2 | 3]);
    }

    if (state.lastDiscard) {
      const alreadyIncluded = revealedTiles.some(t => t.instanceId === state.lastDiscard?.tile.instanceId);
      if (!alreadyIncluded) {
        revealedTiles.push(state.lastDiscard.tile);
      }
    }

    return {
      seat: aiSeat,
      hand: aiPlayer ? [...aiPlayer.hand] : [],
      melds: aiPlayer ? [...aiPlayer.melds] : [],
      allDiscards,
      allMelds,
      revealedTiles,
      wallRemainingCount: state.wall.length,
      currentPhase: state.phase,
      currentSeat: state.currentSeat,
      lastDiscard: state.lastDiscard ? { ...state.lastDiscard } : undefined,
    };
  });
}
