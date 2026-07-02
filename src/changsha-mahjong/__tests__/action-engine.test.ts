import { describe, it, expect } from 'vitest';
import { canChi, getChiOptions, canPeng, canMingGang, canBuGang, canAnGang } from '../engine/action-engine.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';

describe('action-engine', () => {
  const hand: Tile[] = [
    { suit: 'wan', rank: 1, instanceId: 'w1_1' },
    { suit: 'wan', rank: 2, instanceId: 'w2_1' },
    { suit: 'wan', rank: 3, instanceId: 'w3_1' },
    { suit: 'tong', rank: 5, instanceId: 't5_1' },
    { suit: 'tong', rank: 5, instanceId: 't5_2' },
    { suit: 'tong', rank: 5, instanceId: 't5_3' },
    { suit: 'tiao', rank: 8, instanceId: 'ti8_1' },
    { suit: 'tiao', rank: 8, instanceId: 'ti8_2' },
    { suit: 'tiao', rank: 8, instanceId: 'ti8_3' },
    { suit: 'tiao', rank: 8, instanceId: 'ti8_4' },
  ];

  it('1. should allow Chi from upper player (fromSeat=0, selfSeat=1)', () => {
    const discard: Tile = { suit: 'wan', rank: 3, instanceId: 'w3_2' };
    expect(canChi(hand, discard, 0, 1)).toBe(true);
    const options = getChiOptions(hand, discard, 0, 1);
    expect(options.length).toBe(1);
    expect(options[0].map(t => t.rank)).toEqual([1, 2]);
  });

  it('2. should not allow Chi from non-upper player (fromSeat=0, selfSeat=2)', () => {
    const discard: Tile = { suit: 'wan', rank: 3, instanceId: 'w3_2' };
    expect(canChi(hand, discard, 0, 2)).toBe(false);
  });

  it('3. should allow Chi to form consecutive sequence of the same suit', () => {
    const discard: Tile = { suit: 'wan', rank: 2, instanceId: 'w2_2' };
    expect(canChi(hand, discard, 0, 1)).toBe(true);
    const options = getChiOptions(hand, discard, 0, 1);
    expect(options.length).toBe(1);
    expect(options[0].map(t => t.rank)).toEqual([1, 3]);
  });

  it('4. should not allow Chi with different suits', () => {
    const discard: Tile = { suit: 'tong', rank: 2, instanceId: 't2_2' };
    expect(canChi(hand, discard, 0, 1)).toBe(false);
  });

  it('5. should allow Peng if hand has two identical tiles', () => {
    const discard: Tile = { suit: 'tong', rank: 5, instanceId: 't5_4' };
    expect(canPeng(hand, discard)).toBe(true);

    const discardNoMatch: Tile = { suit: 'wan', rank: 8, instanceId: 'w8_1' };
    expect(canPeng(hand, discardNoMatch)).toBe(false);
  });

  it('6. should allow MingGang if hand has three identical tiles', () => {
    const discard: Tile = { suit: 'tong', rank: 5, instanceId: 't5_4' };
    expect(canMingGang(hand, discard)).toBe(true);
    
    const discardNoMatch: Tile = { suit: 'tiao', rank: 5, instanceId: 'ti5_1' };
    expect(canMingGang(hand, discardNoMatch)).toBe(false);
  });

  it('7. should allow BuGang if player already has a Peng meld and draws the fourth tile', () => {
    const melds: Meld[] = [
      {
        type: 'peng',
        tiles: [
          { suit: 'tong', rank: 5, instanceId: 't5_1' },
          { suit: 'tong', rank: 5, instanceId: 't5_2' },
          { suit: 'tong', rank: 5, instanceId: 't5_3' },
        ],
        exposed: true
      }
    ];
    const drawnTile: Tile = { suit: 'tong', rank: 5, instanceId: 't5_4' };
    expect(canBuGang(hand, melds, drawnTile)).toBe(true);
  });

  it('8. should allow AnGang if hand has four identical tiles', () => {
    const options = canAnGang(hand);
    expect(options.length).toBe(1);
    expect(options[0][0].suit).toBe('tiao');
    expect(options[0][0].rank).toBe(8);
  });
});
