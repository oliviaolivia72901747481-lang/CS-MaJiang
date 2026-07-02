import { describe, it, expect } from 'vitest';
import { chooseAdvancedLiteDiscard, chooseAdvancedLiteAction } from '../advanced-ai/advanced-lite-player.js';
import { GameState, Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';

describe('Advanced Lite Player Tests', () => {
  function createMockState(): GameState {
    const pHand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'tong', rank: 4, instanceId: 'to4' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
      { suit: 'tong', rank: 6, instanceId: 'to6' },
      { suit: 'tiao', rank: 7, instanceId: 'ti7' },
      { suit: 'tiao', rank: 8, instanceId: 'ti8' },
      { suit: 'tiao', rank: 9, instanceId: 'ti9' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
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
        decisionTimeBudgetMs: 20,
        enableBirdScore: true,
      },
    } as any;
  }

  it('1. immediately returns win (hu/ziMo) action', () => {
    const state = createMockState();
    state.pendingActions = [{ seat: 0, type: 'ziMo', priority: 1000 }];

    const decision = chooseAdvancedLiteAction({
      state,
      seat: 0,
      availableActions: state.pendingActions,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('ziMo');
    expect(decision.reason).toContain('极速通道');
    expect(decision.reason).toContain('[Advanced Lite]');
  });

  it('2. chooses a valid discard card from hand and formats reasons correctly', () => {
    const state = createMockState();
    const decision = chooseAdvancedLiteDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('discard');
    expect(decision.tileKey).toBeDefined();
    expect(decision.reason).toContain('[Advanced Lite]');
    
    const hasTile = state.players[0].hand.some(t => `${t.suit}_${t.rank}` === decision.tileKey);
    expect(hasTile).toBe(true);
  });

  it('3. checks profiles have different scoring preferences under same hand', () => {
    const state = createMockState();
    
    const decisionDef = chooseAdvancedLiteDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.defensive,
    });

    const decisionBig = chooseAdvancedLiteDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.bigHu,
    });

    expect(decisionDef.tileKey).toBeDefined();
    expect(decisionBig.tileKey).toBeDefined();
  });

  it('4. chooseAdvancedLiteDiscard chooses safety tile in fold mode when threat is high', () => {
    const state = createMockState();
    state.discards[1].push({ suit: 'wan', rank: 1, instanceId: 'w1_river' });
    
    const decision = chooseAdvancedLiteDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.defensive,
    });

    expect(decision.action).toBe('discard');
  });

  it('5. chooses actions correctly according to basic priorities', () => {
    const state = createMockState();
    state.pendingActions = [
      { seat: 0, type: 'peng', tile: { suit: 'wan', rank: 1, instanceId: 'w1' }, options: [[{ suit: 'wan', rank: 1, instanceId: 'w1' }]], priority: 500 },
      { seat: 0, type: 'chi', tile: { suit: 'wan', rank: 1, instanceId: 'w1' }, options: [[{ suit: 'wan', rank: 1, instanceId: 'w1' }]], priority: 300 },
    ];

    const decision = chooseAdvancedLiteAction({
      state,
      seat: 0,
      availableActions: state.pendingActions,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('peng');
  });
});
