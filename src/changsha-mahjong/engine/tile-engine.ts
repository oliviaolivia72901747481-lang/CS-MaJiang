import { Tile, Suit, Rank } from '../types/tile.js';

export function createChangshaTiles(): Tile[] {
  const suits: Suit[] = ['wan', 'tong', 'tiao'];
  const tiles: Tile[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 9; rank++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          suit,
          rank: rank as Rank,
          instanceId: `${suit}_${rank}_${i}`,
        });
      }
    }
  }
  return tiles;
}

export function tileEquals(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function tileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<Suit, number> = { wan: 0, tong: 1, tiao: 2 };
  return [...tiles].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.rank - b.rank;
  });
}

export function countTiles(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tiles) {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
