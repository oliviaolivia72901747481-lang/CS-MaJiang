import { Tile } from '../../changsha-mahjong/types/tile.js';
import { Meld } from '../../changsha-mahjong/types/meld.js';
import { GameState as EngineGameState, PendingAction as EnginePendingAction } from '../../changsha-mahjong/types/game.js';

export type GameState = EngineGameState;
export type PendingAction = EnginePendingAction;

export interface PlayerDisplayState {
  seat: 0 | 1 | 2 | 3;
  name: string;
  isHuman: boolean;
  isDealer: boolean;
  handCount: number;
  hand?: Tile[];
  melds: Meld[];
  discards: Tile[];
  score: number;
  aiProfile?: string;
}
