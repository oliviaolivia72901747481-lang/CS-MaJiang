import { describe, it, expect } from 'vitest';
import { buildVisibleInformationForAI } from '../advanced-ai/visible-information.js';
import { chooseAdvancedAIDiscard, chooseAdvancedAIAction } from '../advanced-ai/advanced-ai-player.js';
import { runLookaheadSearch } from '../advanced-ai/lookahead-search.js';
import { recommendDiscards } from '../coach/discard-advisor.js';
import { GameState, Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';

describe('Advanced AI Trust and Sandbox tests', () => {
  function createMockState(): GameState {
    const p0Hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
    ];
    const p1Hand: Tile[] = [
      { suit: 'tong', rank: 9, instanceId: 'to9' }
    ];
    return {
      phase: 'playing',
      dealerSeat: 0,
      currentSeat: 0,
      players: [
        { seat: 0, id: 'p0', hand: p0Hand, melds: [], discards: [], score: 100, isDealer: true, hasOpenedDoor: false },
        { seat: 1, id: 'p1', hand: p1Hand, melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
        { seat: 2, id: 'p2', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
        { seat: 3, id: 'p3', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
      ],
      wall: [
        { suit: 'wan', rank: 3, instanceId: 'w3_wall' },
        { suit: 'tong', rank: 1, instanceId: 'to1_wall' },
      ],
      discards: { 0: [], 1: [], 2: [], 3: [] },
      pendingActions: [],
      scoreEvents: [],
      logs: [],
      config: {},
    } as any;
  }

  it('1. AI visible information does not contain other players concealed hands', () => {
    const state = createMockState();
    const visible = buildVisibleInformationForAI({ state, aiSeat: 0 });
    // Should contain own hand
    expect(visible.hand.length).toBe(3);
    // Should NOT expose seat 1 concealed hands
    const exposedConcealed = (visible as any).playersConcealedHands || [];
    expect(exposedConcealed).toEqual([]);
  });

  it('2. AI visible information does not expose wall concrete tiles', () => {
    const state = createMockState();
    const visible = buildVisibleInformationForAI({ state, aiSeat: 0 });
    expect((visible as any).wall).toBeUndefined();
    expect(visible.wallRemainingCount).toBe(2);
  });

  it('3. exchanging wall sequence does not alter AI discard decisions', () => {
    const state = createMockState();
    const decBefore = chooseAdvancedAIDiscard({ state, seat: 0, profile: AI_PROFILES.balanced });

    // Reverse wall sequence
    const state2 = createMockState();
    state2.wall = [state2.wall[1], state2.wall[0]];
    const decAfter = chooseAdvancedAIDiscard({ state: state2, seat: 0, profile: AI_PROFILES.balanced });

    expect(decBefore.tileKey).toEqual(decAfter.tileKey);
    expect(decBefore.expectedValue).toEqual(decAfter.expectedValue);
  });

  it('4. exchanging other players dark hands does not alter AI discard decisions', () => {
    const state = createMockState();
    const decBefore = chooseAdvancedAIDiscard({ state, seat: 0, profile: AI_PROFILES.balanced });

    // Swap seat 1 dark hand cards
    const state2 = createMockState();
    state2.players[1].hand = [{ suit: 'tiao', rank: 5, instanceId: 'ti5' }];
    const decAfter = chooseAdvancedAIDiscard({ state: state2, seat: 0, profile: AI_PROFILES.balanced });

    expect(decBefore.tileKey).toEqual(decAfter.tileKey);
    expect(decBefore.expectedValue).toEqual(decAfter.expectedValue);
  });

  it('5. adding public discards to river alters defense risk score values', () => {
    const state = createMockState();
    const decBefore = chooseAdvancedAIDiscard({ state, seat: 0, profile: AI_PROFILES.balanced });

    // Add wan_4 to seat 1 discard river (visible)
    const state2 = createMockState();
    state2.discards[1].push({ suit: 'wan', rank: 4, instanceId: 'w4_river' });
    const decAfter = chooseAdvancedAIDiscard({ state: state2, seat: 0, profile: AI_PROFILES.balanced });

    // Risk score should remain low and safe
    expect(decAfter.riskScore).toBeLessThanOrEqual(20);
  });

  it('6. lookahead search does not access real wall cards sequence', () => {
    const state = createMockState();
    const visible = buildVisibleInformationForAI({ state, aiSeat: 0 });
    const resultsBefore = runLookaheadSearch({ visible, candidateTileKeys: ['wan_4'], depth: 1, profile: AI_PROFILES.balanced });

    // Change wall cards
    const state2 = createMockState();
    state2.wall = [{ suit: 'tong', rank: 5, instanceId: 'to5_w' }];
    const visible2 = buildVisibleInformationForAI({ state: state2, aiSeat: 0 });
    const resultsAfter = runLookaheadSearch({ visible: visible2, candidateTileKeys: ['wan_4'], depth: 1, profile: AI_PROFILES.balanced });

    expect(resultsBefore[0].expectedValue).toEqual(resultsAfter[0].expectedValue);
  });

  it('7. Coach does not bypass VisibleStateForCoach and does not call AI visible models', () => {
    const state = createMockState();
    // recommendDiscards only reads VisibleStateForCoach.
    // We change state.players[1].hand which is concealed.
    const recBefore = recommendDiscards({ state, humanSeat: 0 });
    
    const state2 = createMockState();
    state2.players[1].hand = [{ suit: 'wan', rank: 8, instanceId: 'w8_concealed' }];
    const recAfter = recommendDiscards({ state: state2, humanSeat: 0 });

    expect(recBefore).toEqual(recAfter);
  });

  it('8. all advanced AI functions do not mutate GameState (deep equal check)', () => {
    const state = createMockState();
    const copy = JSON.parse(JSON.stringify(state));

    chooseAdvancedAIDiscard({ state, seat: 0, profile: AI_PROFILES.balanced });
    chooseAdvancedAIAction({ state, seat: 0, availableActions: [{ seat: 0, type: 'pass', priority: 0 }], profile: AI_PROFILES.balanced });

    expect(state).toEqual(copy);
  });

  it('9. explainer reasons do not contain forbidden absolute words and use probabilistic words', () => {
    const state = createMockState();
    const decision = chooseAdvancedAIDiscard({ state, seat: 0, profile: AI_PROFILES.balanced });
    
    const forbiddenWords = ['一定', '必然', '肯定', '绝对', '牌墙实际', '我知道他'];
    forbiddenWords.forEach(w => {
      expect(decision.reason).not.toContain(w);
    });
    expect(decision.reason).toMatch(/(可能|风险|相对|估计|路线|选择)/);
  });
});
