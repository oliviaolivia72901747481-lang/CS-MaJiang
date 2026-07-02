import { GameState, PendingAction, PlayerDisplayState } from '../types/ui-types.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { Meld } from '../../changsha-mahjong/types/meld.js';

export function getHumanAvailableActions(state: GameState, humanSeat: number = 0): PendingAction[] {
  if (!state || !state.pendingActions) return [];
  return state.pendingActions.filter(a => a.seat === humanSeat);
}

export function isWaitingForHuman(state: GameState, humanSeat: number = 0): boolean {
  if (!state) return false;
  
  // 1. Waiting for human response in waitingForResponses phase
  if (state.phase === 'waitingForResponses') {
    return state.pendingActions.some(a => a.seat === humanSeat);
  }
  
  // 2. Waiting for human to discard in playing phase
  if (state.phase === 'playing' && state.currentSeat === humanSeat) {
    return true;
  }
  
  return false;
}

export function canHumanDiscard(state: GameState, humanSeat: number = 0): boolean {
  if (!state) return false;
  return state.phase === 'playing' && state.currentSeat === humanSeat;
}

export function getPlayerDisplayState(state: GameState, humanSeat: number = 0): PlayerDisplayState[] {
  if (!state || !state.players) return [];

  return state.players.map(p => {
    const isHuman = p.seat === humanSeat;
    const revealHand = isHuman || state.phase === 'ended';
    return {
      seat: p.seat,
      name: isHuman ? '玩家本人 (我)' : `机器人 ${p.seat} (AI)`,
      isHuman,
      isDealer: p.isDealer,
      handCount: p.hand.length,
      hand: revealHand ? p.hand : undefined,
      melds: p.melds,
      discards: state.discards[p.seat] || [],
      score: p.score,
      aiProfile: p.aiProfile,
    };
  });
}

export function assertTileConservation(state: GameState): void {
  if (!state) return;
  const hands = state.players.reduce((sum, p) => sum + p.hand.length, 0);
  const melds = state.players.reduce((sum, p) => sum + p.melds.reduce((mSum, m) => mSum + m.tiles.length, 0), 0);
  const discards = Object.values(state.discards).reduce((sum, d) => sum + d.length, 0);
  const wall = state.wall.length;
  const birds = state.birdTiles ? state.birdTiles.length : 0;
  
  const total = hands + melds + discards + wall + birds;
  if (total !== 108) {
    throw new Error(`Tile count not conserved! Total: ${total} (expected 108). hands=${hands}, melds=${melds}, discards=${discards}, wall=${wall}, birds=${birds}`);
  }
}
