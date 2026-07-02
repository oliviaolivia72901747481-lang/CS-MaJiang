export type Suit = 'wan' | 'tong' | 'tiao';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Tile {
  suit: Suit;
  rank: Rank;
  instanceId: string;
}
