import { describe, it, expect } from 'vitest';
import { adviseHumanAction } from '../coach/action-advisor.js';
import { GameState, PendingAction } from '../types/game.js';
import { Tile } from '../types/tile.js';

function createMockState(hand: Tile[]): GameState {
  return {
    phase: 'waitingForResponses',
    dealerSeat: 0,
    currentSeat: 1,
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
    wall: new Array(20).fill({ suit: 'wan', rank: 1, instanceId: 'wall' }),
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

describe('action-advisor.ts tests', () => {
  it('1. should strongly recommend Hu/ZiMo', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'hu', priority: 3, tile: { suit: 'wan', rank: 1, instanceId: 'hu_tile' } },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    expect(advices[0].action).toBe('hu');
    expect(advices[0].recommend).toBe(true);
    expect(advices[0].score).toBe(10000);
  });

  it('2. should recommend Chi if it improves shanten', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'tong', rank: 9, instanceId: 'to9' },
    ];
    const state = createMockState(hand);
    const availableActions: PendingAction[] = [
      {
        seat: 0,
        type: 'chi',
        priority: 1,
        tile: { suit: 'wan', rank: 3, instanceId: 'w3' },
        options: [[
          { suit: 'wan', rank: 1, instanceId: 'w1' },
          { suit: 'wan', rank: 2, instanceId: 'w2' },
        ]],
      },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    const chiAdvice = advices.find(a => a.action === 'chi')!;
    expect(chiAdvice.recommend).toBe(true);
  });

  it('3. should recommend Peng if it improves shanten', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'tong', rank: 9, instanceId: 'to9' },
    ];
    const state = createMockState(hand);
    const availableActions: PendingAction[] = [
      {
        seat: 0,
        type: 'peng',
        priority: 2,
        tile: { suit: 'wan', rank: 1, instanceId: 'w1_3' },
      },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    const pengAdvice = advices.find(a => a.action === 'peng')!;
    expect(pengAdvice.recommend).toBe(true);
  });

  it('4. should not recommend Chi if it breaks QiXiaoDui structure', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_1' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_1' },
      { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
    ];
    const state = createMockState(hand);
    const availableActions: PendingAction[] = [
      {
        seat: 0,
        type: 'chi',
        priority: 1,
        tile: { suit: 'wan', rank: 6, instanceId: 'w6' },
        options: [[
          { suit: 'wan', rank: 4, instanceId: 'w4_1' },
          { suit: 'wan', rank: 5, instanceId: 'w5' },
        ]],
      },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    const chiAdvice = advices.find(a => a.action === 'chi')!;
    expect(chiAdvice.recommend).toBe(false);
    expect(chiAdvice.reason).toContain('七小对');
  });

  it('5. should caution against Gang in late game', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 1, instanceId: 'w1_3' },
    ];
    const state = createMockState(hand);
    state.wall = new Array(5).fill({ suit: 'wan', rank: 1, instanceId: 'wall' }); // < 10 remaining wall tiles
    const availableActions: PendingAction[] = [
      {
        seat: 0,
        type: 'mingGang',
        priority: 2,
        tile: { suit: 'wan', rank: 1, instanceId: 'w1_4' },
      },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    const gangAdvice = advices.find(a => a.action === 'gang')!;
    expect(gangAdvice.recommend).toBe(false);
    expect(gangAdvice.reason).toContain('尾声');
  });

  it('6. should recommend Pass by default', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    expect(advices[0].action).toBe('pass');
    expect(advices[0].recommend).toBe(true);
  });
});
