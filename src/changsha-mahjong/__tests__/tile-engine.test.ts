import { describe, it, expect } from 'vitest';
import { createChangshaTiles, tileEquals, tileKey, sortTiles, countTiles } from '../engine/tile-engine.js';
import { Tile } from '../types/tile.js';

describe('tile-engine', () => {
  it('should create 108 tiles', () => {
    const tiles = createChangshaTiles();
    expect(tiles.length).toBe(108);
  });

  it('should only contain wan, tong, and tiao suits', () => {
    const tiles = createChangshaTiles();
    const suits = new Set(tiles.map(t => t.suit));
    expect(suits.size).toBe(3);
    expect(suits.has('wan')).toBe(true);
    expect(suits.has('tong')).toBe(true);
    expect(suits.has('tiao')).toBe(true);
  });

  it('should have exactly 4 copies of each suit and rank combination', () => {
    const tiles = createChangshaTiles();
    const counts = countTiles(tiles);
    expect(counts.size).toBe(27); // 3 suits * 9 ranks
    for (const count of counts.values()) {
      expect(count).toBe(4);
    }
  });

  it('should have unique instanceIds for all tiles', () => {
    const tiles = createChangshaTiles();
    const ids = new Set(tiles.map(t => t.instanceId));
    expect(ids.size).toBe(108);
  });

  it('should correctly determine tile equality', () => {
    const a: Tile = { suit: 'wan', rank: 1, instanceId: '1' };
    const b: Tile = { suit: 'wan', rank: 1, instanceId: '2' };
    const c: Tile = { suit: 'tong', rank: 1, instanceId: '3' };
    expect(tileEquals(a, b)).toBe(true);
    expect(tileEquals(a, c)).toBe(false);
  });

  it('should sort tiles correctly by suit order (wan -> tong -> tiao) and rank', () => {
    const tiles: Tile[] = [
      { suit: 'tiao', rank: 5, instanceId: '1' },
      { suit: 'wan', rank: 2, instanceId: '2' },
      { suit: 'tong', rank: 1, instanceId: '3' },
      { suit: 'wan', rank: 1, instanceId: '4' },
    ];
    const sorted = sortTiles(tiles);
    expect(sorted[0].suit).toBe('wan');
    expect(sorted[0].rank).toBe(1);
    expect(sorted[1].suit).toBe('wan');
    expect(sorted[1].rank).toBe(2);
    expect(sorted[2].suit).toBe('tong');
    expect(sorted[2].rank).toBe(1);
    expect(sorted[3].suit).toBe('tiao');
    expect(sorted[3].rank).toBe(5);
  });
});
