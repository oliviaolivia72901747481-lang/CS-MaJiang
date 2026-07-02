import { describe, it, expect } from 'vitest';
import { analyzeHumanHand, getVisibleTiles, getRemainingTileCount } from '../coach/hand-advisor.js';
import { buildVisibleStateForCoach } from '../coach/visible-state.js';
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

describe('hand-advisor.ts tests', () => {
  it('1. should calculate correct normal shanten', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
      { suit: 'tiao', rank: 2, instanceId: 't2_1' },
      { suit: 'tiao', rank: 2, instanceId: 't2_2' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
    ];
    const state = createMockState(hand);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.bestShanten).toBe(1);
    expect(advice.effectiveTileKeys).toContain('tong_5');
  });

  it('2. should calculate qi xiao dui shanten correctly', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' },
      { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' },
      { suit: 'wan', rank: 4, instanceId: 'w4_2' },
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tiao', rank: 9, instanceId: 't9' },
      { suit: 'tong', rank: 8, instanceId: 'to8' },
    ];
    const state = createMockState(hand);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.qiXiaoDuiShanten).toBe(1);
  });

  it('3. should return clean summary string', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
    ];
    const state = createMockState(hand);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.summary).toContain('向听');
  });

  it('4. should not mutate state', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    const copy = JSON.parse(JSON.stringify(state));
    analyzeHumanHand({ state, humanSeat: 0 });
    expect(state).toEqual(copy);
  });

  it('5. should return correct status for listening hand (0 shanten)', () => {
    // 3 runs, 1 pair, 1 protomeld:
    // 1-2-3w, 4-5-6w, 7-8-9w, 2-2t, 4-5t
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },

      { suit: 'tiao', rank: 2, instanceId: 't2_1' },
      { suit: 'tiao', rank: 2, instanceId: 't2_2' },

      { suit: 'tiao', rank: 4, instanceId: 't4' },
      { suit: 'tiao', rank: 5, instanceId: 't5' },
    ];
    const state = createMockState(hand);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.bestShanten).toBe(0);
    expect(advice.summary).toContain('已听牌');
  });

  it('6. should return correct status for completed hand (-1 shanten)', () => {
    // 4 runs + 1 pair
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },

      { suit: 'tiao', rank: 2, instanceId: 't2_1' },
      { suit: 'tiao', rank: 2, instanceId: 't2_2' },

      { suit: 'tiao', rank: 4, instanceId: 't4' },
      { suit: 'tiao', rank: 5, instanceId: 't5' },
      { suit: 'tiao', rank: 6, instanceId: 't6' },
    ];
    const state = createMockState(hand);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.bestShanten).toBe(-1);
    expect(advice.summary).toContain('胡牌');
  });

  it('7. should list all visible tiles including discards', () => {
    const state = createMockState([]);
    state.players[0].melds = [{ type: 'peng', tiles: [{ suit: 'wan', rank: 2, instanceId: 'm1' }], exposed: true }];
    state.discards[0] = [{ suit: 'tong', rank: 9, instanceId: 'd1' }];
    const visibleState = buildVisibleStateForCoach(state, 0);
    const visible = getVisibleTiles(visibleState);
    expect(visible.some(v => v.suit === 'wan' && v.rank === 2)).toBe(true);
    expect(visible.some(v => v.suit === 'tong' && v.rank === 9)).toBe(true);
  });

  it('8. should calculate remaining tile count correctly', () => {
    const state = createMockState([]);
    state.players[0].hand = [{ suit: 'wan', rank: 5, instanceId: 'h1' }];
    const visibleState = buildVisibleStateForCoach(state, 0);
    const remaining = getRemainingTileCount(visibleState, ['wan_5']);
    expect(remaining).toBe(3); // 4 - 1 = 3
  });

  it('9. should clamp remaining tile count to 0 if fully visible', () => {
    const state = createMockState([
      { suit: 'wan', rank: 5, instanceId: 'h1' },
      { suit: 'wan', rank: 5, instanceId: 'h2' },
      { suit: 'wan', rank: 5, instanceId: 'h3' },
      { suit: 'wan', rank: 5, instanceId: 'h4' },
    ]);
    const visibleState = buildVisibleStateForCoach(state, 0);
    const remaining = getRemainingTileCount(visibleState, ['wan_5']);
    expect(remaining).toBe(0);
  });

  it('10. should handle empty hand input gracefully', () => {
    const state = createMockState([]);
    const advice = analyzeHumanHand({ state, humanSeat: 0 });
    expect(advice.bestShanten).toBe(6); // QiXiaoDuiShanten = 6 for 0 pairs
  });
});
