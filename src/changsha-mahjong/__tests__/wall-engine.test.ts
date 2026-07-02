import { describe, it, expect } from 'vitest';
import { createChangshaTiles } from '../engine/tile-engine.js';
import { shuffleTiles, dealInitialHands } from '../engine/wall-engine.js';

describe('wall-engine', () => {
  it('should shuffle tiles and maintain the same number of tiles', () => {
    const tiles = createChangshaTiles();
    const shuffled = shuffleTiles(tiles);
    expect(shuffled.length).toBe(108);
    
    // With seed, it should be deterministic
    const shuffled1 = shuffleTiles(tiles, 'test-seed');
    const shuffled2 = shuffleTiles(tiles, 'test-seed');
    expect(shuffled1).toEqual(shuffled2);
  });

  it('should deal initial hands correctly (dealer 14, others 13, remaining 55)', () => {
    const tiles = createChangshaTiles();
    const wall = shuffleTiles(tiles, 'another-seed');
    
    const { hands, remainingWall } = dealInitialHands(wall, 0); // seat 0 is dealer
    
    expect(hands[0].length).toBe(14);
    expect(hands[1].length).toBe(13);
    expect(hands[2].length).toBe(13);
    expect(hands[3].length).toBe(13);
    expect(remainingWall.length).toBe(55); // 108 - 14 - 13*3 = 55
  });

  it('should verify all dealt cards and remaining wall sum up to 108 unique cards', () => {
    const tiles = createChangshaTiles();
    const wall = shuffleTiles(tiles, 'unique-seed');
    
    const { hands, remainingWall } = dealInitialHands(wall, 2); // seat 2 is dealer
    
    expect(hands[2].length).toBe(14);
    expect(hands[0].length).toBe(13);
    expect(hands[1].length).toBe(13);
    expect(hands[3].length).toBe(13);

    const allTiles = [
      ...hands[0],
      ...hands[1],
      ...hands[2],
      ...hands[3],
      ...remainingWall
    ];
    
    expect(allTiles.length).toBe(108);
    const instanceIds = new Set(allTiles.map(t => t.instanceId));
    expect(instanceIds.size).toBe(108);
  });
});
