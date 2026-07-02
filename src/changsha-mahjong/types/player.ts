import { Tile } from './tile.js';
import { Meld } from './meld.js';

export interface Player {
  id: string;
  seat: 0 | 1 | 2 | 3;
  isDealer: boolean;
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  score: number;
  hasOpenedDoor: boolean;
  aiProfile?: string;
}
