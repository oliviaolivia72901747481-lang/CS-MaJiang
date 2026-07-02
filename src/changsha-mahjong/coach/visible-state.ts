import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';

export interface VisibleStateForCoach {
  humanSeat: 0;
  humanHand: Tile[];
  humanMelds: Meld[];
  allDiscards: Record<0 | 1 | 2 | 3, Tile[]>;
  allMelds: Record<0 | 1 | 2 | 3, Meld[]>;
  revealedTiles: Tile[];
  wallRemainingCount: number;
  currentPhase: string;
  currentSeat: 0 | 1 | 2 | 3;
  lastDiscard?: {
    tile: Tile;
    fromSeat: 0 | 1 | 2 | 3;
  };
}

export function buildVisibleStateForCoach(
  state: GameState,
  humanSeat: 0
): VisibleStateForCoach {
  const humanPlayer = state.players.find(p => p.seat === humanSeat);
  
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
  if (humanPlayer) {
    revealedTiles.push(...humanPlayer.hand);
  }

  for (let seat = 0; seat < 4; seat++) {
    const melds = allMelds[seat as 0 | 1 | 2 | 3];
    for (const m of melds) {
      revealedTiles.push(...m.tiles);
    }
    revealedTiles.push(...allDiscards[seat as 0 | 1 | 2 | 3]);
  }

  if (state.lastDiscard) {
    // Check if the last discard is already in revealedTiles to prevent duplicates
    const alreadyIncluded = revealedTiles.some(t => t.instanceId === state.lastDiscard?.tile.instanceId);
    if (!alreadyIncluded) {
      revealedTiles.push(state.lastDiscard.tile);
    }
  }

  return {
    humanSeat,
    humanHand: humanPlayer ? [...humanPlayer.hand] : [],
    humanMelds: humanPlayer ? [...humanPlayer.melds] : [],
    allDiscards,
    allMelds,
    revealedTiles,
    wallRemainingCount: state.wall.length,
    currentPhase: state.phase,
    currentSeat: state.currentSeat,
    lastDiscard: state.lastDiscard ? { ...state.lastDiscard } : undefined,
  };
}
