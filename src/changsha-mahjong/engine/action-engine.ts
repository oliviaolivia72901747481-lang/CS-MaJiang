import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { tileEquals, tileKey } from './tile-engine.js';

import { getNextActiveSeat } from '../utils/active-seats.js';

export function canChi(
  hand: Tile[],
  discardedTile: Tile,
  fromSeat: number,
  selfSeat: number,
  activeSeats?: number[]
): boolean {
  return getChiOptions(hand, discardedTile, fromSeat, selfSeat, activeSeats).length > 0;
}

export function getChiOptions(
  hand: Tile[],
  discardedTile: Tile,
  fromSeat: number,
  selfSeat: number,
  activeSeats?: number[]
): Tile[][] {
  const finalActiveSeats = (activeSeats || [0, 1, 2, 3]) as any[];
  // Only allowed from the player directly to the left (upper house)
  if (getNextActiveSeat(finalActiveSeats, fromSeat as any) !== selfSeat) {
    return [];
  }

  const { suit, rank } = discardedTile;
  const options: Tile[][] = [];

  // Helper to find a tile in hand
  const findTile = (r: number) => hand.find(t => t.suit === suit && t.rank === r);

  // Option 1: [rank - 2, rank - 1]
  if (rank >= 3) {
    const t1 = findTile(rank - 2);
    const t2 = findTile(rank - 1);
    if (t1 && t2) {
      options.push([t1, t2]);
    }
  }

  // Option 2: [rank - 1, rank + 1]
  if (rank >= 2 && rank <= 8) {
    const t1 = findTile(rank - 1);
    const t2 = findTile(rank + 1);
    if (t1 && t2) {
      options.push([t1, t2]);
    }
  }

  // Option 3: [rank + 1, rank + 2]
  if (rank <= 7) {
    const t1 = findTile(rank + 1);
    const t2 = findTile(rank + 2);
    if (t1 && t2) {
      options.push([t1, t2]);
    }
  }

  return options;
}

export function canPeng(hand: Tile[], discardedTile: Tile): boolean {
  const matching = hand.filter(t => t.suit === discardedTile.suit && t.rank === discardedTile.rank);
  return matching.length >= 2;
}

export function canMingGang(hand: Tile[], discardedTile: Tile): boolean {
  const matching = hand.filter(t => t.suit === discardedTile.suit && t.rank === discardedTile.rank);
  return matching.length >= 3;
}

export function canBuGang(hand: Tile[], melds: Meld[], drawnTile: Tile): boolean {
  // Find PENG melds
  const pengMelds = melds.filter(m => m.type === 'peng');
  
  // Check if drawnTile matches any PENG meld
  const hasDrawnMatch = pengMelds.some(m => 
    m.tiles[0].suit === drawnTile.suit && m.tiles[0].rank === drawnTile.rank
  );
  if (hasDrawnMatch) {
    return true;
  }

  // Check if any tile in hand matches any PENG meld
  const hasHandMatch = hand.some(t =>
    pengMelds.some(m => m.tiles[0].suit === t.suit && m.tiles[0].rank === t.rank)
  );

  return hasHandMatch;
}

export function canAnGang(hand: Tile[]): Tile[][] {
  const groups: Record<string, Tile[]> = {};
  for (const tile of hand) {
    const key = tileKey(tile);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tile);
  }

  const anGangOptions: Tile[][] = [];
  for (const key in groups) {
    if (groups[key].length === 4) {
      anGangOptions.push(groups[key]);
    }
  }

  return anGangOptions;
}
