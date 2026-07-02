import { Tile } from './tile.js';

export type MeldType = 'chi' | 'peng' | 'mingGang' | 'buGang' | 'anGang';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayerId?: string;
  exposed: boolean;
}
