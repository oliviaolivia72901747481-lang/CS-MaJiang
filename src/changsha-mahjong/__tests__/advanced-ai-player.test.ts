import { describe, it, expect } from 'vitest';
import { chooseAdvancedAIDiscard, chooseAdvancedAIAction } from '../advanced-ai/advanced-ai-player.js';
import { GameState, Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';

describe('Advanced AI Player tests', () => {
  function createMockState(hand: Tile[]): GameState {
    return {
      phase: 'playing',
      dealerSeat: 0,
      currentSeat: 1,
      players: [
        { seat: 0, id: 'p0', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
        { seat: 1, id: 'p1', hand, melds: [], discards: [], score: 100, isDealer: true, hasOpenedDoor: false },
        { seat: 2, id: 'p2', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
        { seat: 3, id: 'p3', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
      ],
      wall: [
        { suit: 'wan', rank: 5, instanceId: 'w5' }
      ],
      discards: { 0: [], 1: [], 2: [], 3: [] },
      pendingActions: [],
      scoreEvents: [],
      logs: [],
      config: {},
    } as any;
  }

  it('1. chooses a valid discard tile from player hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
    ];
    const state = createMockState(hand);
    const decision = chooseAdvancedAIDiscard({ state, seat: 1, profile: AI_PROFILES.balanced });
    expect(decision.action).toBe('discard');
    expect(hand.some(t => `${t.suit}_${t.rank}` === decision.tileKey)).toBe(true);
    expect(decision.reason).toContain('选择打出');
  });

  it('2. chooses a valid action from pending actions list', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    const pendingActions: any = [
      { seat: 1 as const, type: 'pass' as const, priority: 0 },
      { seat: 1 as const, type: 'peng' as const, priority: 1, tile: { suit: 'wan', rank: 1, instanceId: 'w1_2' } },
    ];
    const decision = chooseAdvancedAIAction({
      state,
      seat: 1,
      availableActions: pendingActions,
      profile: AI_PROFILES.balanced,
    });
    expect(['pass', 'peng']).toContain(decision.action);
  });

  it('3. applies defensive profile preference to avoid risk melds', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    const pendingActions: any = [
      { seat: 1 as const, type: 'pass' as const, priority: 0 },
      { seat: 1 as const, type: 'peng' as const, priority: 1, tile: { suit: 'wan', rank: 1, instanceId: 'w1_2' } },
    ];
    // Under defensive profile, peng priority is reduced by 150. Pass is preferred.
    const decision = chooseAdvancedAIAction({
      state,
      seat: 1,
      availableActions: pendingActions,
      profile: AI_PROFILES.defensive,
    });
    expect(decision.action).toBe('pass');
  });

  it('4. chooseAdvancedAIDiscard throws when hand is empty', () => {
    const state = createMockState([]);
    expect(() => chooseAdvancedAIDiscard({ state, seat: 1, profile: AI_PROFILES.balanced })).toThrow();
  });

  it('5. chooseAdvancedAIAction throws when no available actions match the player seat', () => {
    const state = createMockState([{ suit: 'wan', rank: 1, instanceId: 'w1' }]);
    const pendingActions = [
      { seat: 2 as const, type: 'hu' as const, priority: 3 }
    ];
    expect(() => chooseAdvancedAIAction({
      state,
      seat: 1,
      availableActions: pendingActions,
      profile: AI_PROFILES.balanced,
    })).toThrow();
  });
});
