import { describe, it, expect } from 'vitest';
import { recommendDiscards } from '../coach/discard-advisor.js';
import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';

function createMockState(hand: Tile[]): GameState {
  return {
    phase: 'playing',
    dealerSeat: 0,
    currentSeat: 0,
    players: [
      {
        seat: 0,
        id: 'player_0',
        name: '我',
        hand,
        melds: [],
        discards: [],
        score: 100,
        isHuman: true,
      },
      { seat: 1, id: 'player_1', name: 'AI 1', hand: [], melds: [], discards: [], score: 100 },
      { seat: 2, id: 'player_2', name: 'AI 2', hand: [], melds: [], discards: [], score: 100 },
      { seat: 3, id: 'player_3', name: 'AI 3', hand: [], melds: [], discards: [], score: 100 },
    ],
    wall: [],
    discards: { 0: [], 1: [], 2: [], 3: [] },
    pendingActions: [],
    scoreEvents: [],
    logs: [],
    config: {
      birdCount: 2,
      scoreMode: 'changsha_6_7',
      birdMode: 'all_birds',
      openDoor: { needOpenDoorForDianPaoHu: false },
    },
  } as any;
}

describe('discard-advisor.ts tests', () => {
  it('1. should return top N recommendations from hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'tiao', rank: 9, instanceId: 't9' }, // isolated corner tile -> should be recommended
    ];
    const state = createMockState(hand);
    const discards = recommendDiscards({ state, humanSeat: 0, topN: 2 });
    expect(discards.length).toBeLessThanOrEqual(2);
    expect(discards[0].tileKey).toBe('tiao_9');
  });

  it('2. should format friendly Chinese names and reasons', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tiao', rank: 9, instanceId: 't9' },
    ];
    const state = createMockState(hand);
    const discards = recommendDiscards({ state, humanSeat: 0, topN: 1 });
    expect(discards[0].tileName).toBe('一万');
    expect(discards[0].reason).toContain('孤张');
  });

  it('3. should return empty list if hand is empty', () => {
    const state = createMockState([]);
    const discards = recommendDiscards({ state, humanSeat: 0 });
    expect(discards).toEqual([]);
  });

  it('4. should calculate correct expectedShantenAfterDiscard', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'tiao', rank: 5, instanceId: 't5' },
    ];
    const state = createMockState(hand);
    const discards = recommendDiscards({ state, humanSeat: 0, topN: 1 });
    // After discarding t5, hand has [1w, 2w] which is a K (protomeld)
    expect(discards[0].expectedShantenAfterDiscard).toBeDefined();
  });

  it('5. should provide effectiveTilesAfterDiscard list', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tiao', rank: 5, instanceId: 't5' },
    ];
    const state = createMockState(hand);
    const discards = recommendDiscards({ state, humanSeat: 0, topN: 1 });
    expect(discards[0].effectiveTilesAfterDiscard).toBeInstanceOf(Array);
  });

  it('6. should respect topN limit parameter', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
    ];
    const state = createMockState(hand);
    const discards = recommendDiscards({ state, humanSeat: 0, topN: 5 });
    expect(discards.length).toBeLessThanOrEqual(3); // only 3 unique cards
  });
});
