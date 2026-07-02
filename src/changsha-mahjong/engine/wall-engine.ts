import { Tile } from '../types/tile.js';

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function shuffleTiles(tiles: Tile[], seed?: string): Tile[] {
  const result = [...tiles];
  let random = Math.random;
  if (seed !== undefined) {
    const seedGen = xmur3(seed);
    random = mulberry32(seedGen());
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export function dealInitialHands(wall: Tile[], dealerSeat: 0 | 1 | 2 | 3, activeSeats?: number[]): {
  hands: Record<0 | 1 | 2 | 3, Tile[]>;
  remainingWall: Tile[];
} {
  const hands: Record<0 | 1 | 2 | 3, Tile[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  const finalActiveSeats = activeSeats || [0, 1, 2, 3];
  let wallIndex = 0;
  // Deal to active seats in order. The dealer gets 14 tiles, others get 13.
  for (const seat of finalActiveSeats) {
    const count = seat === dealerSeat ? 14 : 13;
    hands[seat as 0 | 1 | 2 | 3] = wall.slice(wallIndex, wallIndex + count);
    wallIndex += count;
  }

  return {
    hands,
    remainingWall: wall.slice(wallIndex),
  };
}
