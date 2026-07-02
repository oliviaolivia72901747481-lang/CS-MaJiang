import { describe, it, expect } from 'vitest';
import { chooseAdvancedAIAction, chooseAdvancedAIDiscard } from '../advanced-ai/advanced-ai-player.js';
import { runLookaheadSearch } from '../advanced-ai/lookahead-search.js';
import { GameState, Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { setActiveTuningConfig, NO_LOOKAHEAD_FASTHU_TUNING, DEFAULT_ADVANCED_AI_TUNING } from '../index.js';

describe('v0.7.3 Performance Regression Tests', () => {
  function createMockState(): GameState {
    const pHand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
      { suit: 'tong', rank: 1, instanceId: 'to1' },
      { suit: 'tong', rank: 2, instanceId: 'to2' },
      { suit: 'tong', rank: 3, instanceId: 'to3' },
      { suit: 'tiao', rank: 5, instanceId: 'ti5' },
      { suit: 'tiao', rank: 6, instanceId: 'ti6' },
    ];
    return {
      phase: 'playing',
      dealerSeat: 0,
      currentSeat: 0,
      wall: [],
      discards: { 0: [], 1: [], 2: [], 3: [] },
      pendingActions: [],
      scoreEvents: [],
      logs: [],
      roundEnded: false,
      winnerSeats: [],
      players: [
        { seat: 0, hand: pHand, melds: [], score: 1000 },
        { seat: 1, hand: [], melds: [], score: 1000 },
        { seat: 2, hand: [], melds: [], score: 1000 },
        { seat: 3, hand: [], melds: [], score: 1000 },
      ],
      config: {
        maxStepsPerRound: 100,
        decisionTimeBudgetMs: 200,
        enableBirdScore: true,
      },
    } as any;
  }

  it('1. Fast Path - immediately returns win (hu/ziMo) action without entering advanced evaluation', () => {
    const state = createMockState();
    state.pendingActions = [
      { seat: 0, type: 'ziMo', priority: 1000 }
    ];

    const decision = chooseAdvancedAIAction({
      state,
      seat: 0,
      availableActions: state.pendingActions,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('ziMo');
    expect(decision.reason).toContain('极速通道');
  });

  it('2. Defense mode - skips lookahead search calculation to save latency', () => {
    const state = createMockState();
    state.discards[1].push({ suit: 'wan', rank: 4, instanceId: 'w4_river' });
    
    setActiveTuningConfig({
      ...DEFAULT_ADVANCED_AI_TUNING,
      lookaheadTrigger: {
        enabled: true,
        maxTopK: 2,
        depth: 1,
        budgetMs: 10,
        onlyWhenShantenAtMost: 1,
        skipInDefenseMode: true,
        scoreTieThreshold: 10,
      }
    });

    const decision = chooseAdvancedAIDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });

    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);
    expect(decision.action).toBe('discard');
  });

  it('3. lookahead search returns empty/minimal values if budget is exceeded', () => {
    const state = createMockState();
    const visible: any = {
      seat: 0,
      hand: state.players[0].hand,
      melds: [],
      revealedTiles: [],
      allDiscards: { 0: [], 1: [], 2: [], 3: [] },
      allMelds: { 0: [], 1: [], 2: [], 3: [] },
      wallRemainingCount: 20,
      currentPhase: 'playing',
      currentSeat: 0,
    };

    const results = runLookaheadSearch({
      visible,
      candidateTileKeys: ['wan_4'],
      depth: 1,
      profile: AI_PROFILES.balanced,
      startTime: performance.now() - 50,
      budgetMs: 10,
    });

    expect(results.length).toBe(1);
    expect(results[0].expectedValue).toBe(0);
    expect(results[0].reason).toContain('超时');
  });

  it('4. Fast Path 2 - isolates 1/9 tiles and discards them immediately', () => {
    const state = createMockState();
    const isolatedHand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'wan', rank: 3, instanceId: 'w3_2' },
      { suit: 'wan', rank: 4, instanceId: 'w4_2' },
      { suit: 'tiao', rank: 9, instanceId: 'ti9' },
    ];
    state.players[0].hand = isolatedHand;

    const decision = chooseAdvancedAIDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.tileKey).toBe('tiao_9');
    expect(decision.reason).toContain('极速通道：手牌中存在绝对孤张');
  });

  it('5. skips lookahead search if shanten is high (above trigger limit)', () => {
    const state = createMockState();
    state.players[0].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 4, instanceId: 'to4' },
      { suit: 'tiao', rank: 7, instanceId: 'ti7' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];

    setActiveTuningConfig({
      ...DEFAULT_ADVANCED_AI_TUNING,
      lookaheadTrigger: {
        enabled: true,
        maxTopK: 2,
        depth: 1,
        budgetMs: 10,
        onlyWhenShantenAtMost: 1,
        skipInDefenseMode: true,
        scoreTieThreshold: 10,
      }
    });

    const decision = chooseAdvancedAIDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });

    setActiveTuningConfig(DEFAULT_ADVANCED_AI_TUNING);
    expect(decision.action).toBe('discard');
  });
});
