import { describe, it, expect } from 'vitest';
import { runAIMatch, checkTileConservation } from '../benchmark/ai-match-runner.js';
import { chooseAdvancedAIDiscard, chooseAdvancedAIAction } from '../advanced-ai/advanced-ai-player.js';
import { GameState, Tile } from '../index.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';

describe('AI Strength and Sandbox Regression Tests', () => {
  it('1. can successfully simulate 10 complete Advanced AI rounds', () => {
    // Warm up the entire 10-round suite to load all ESM files and Vitest instrumentation
    runAIMatch({
      rounds: 10,
      seeds: ['benchmark-001', 'benchmark-002', 'benchmark-003', 'benchmark-004', 'benchmark-005', 'benchmark-006', 'benchmark-007', 'benchmark-008', 'benchmark-009', 'benchmark-010'],
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'advanced', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 300,
    });

    // Run the actual profiled benchmark (internally resets the PerformanceProfiler)
    const result = runAIMatch({
      rounds: 10,
      seeds: ['benchmark-001', 'benchmark-002', 'benchmark-003', 'benchmark-004', 'benchmark-005', 'benchmark-006', 'benchmark-007', 'benchmark-008', 'benchmark-009', 'benchmark-010'],
      aiEngines: { 0: 'advanced', 1: 'advanced', 2: 'advanced', 3: 'advanced' },
      aiProfiles: { 0: 'balanced', 1: 'balanced', 2: 'balanced', 3: 'balanced' },
      maxStepsPerRound: 500,
      decisionTimeBudgetMs: 300,
    });

    expect(result.completedRounds).toBe(10);
    expect(result.playerMetrics.length).toBe(4);
    // Budget checks
    expect(result.performance.averageDecisionMs).toBeLessThan(50);
    expect(result.performance.maxDecisionMs).toBeLessThan(500);
    // Fallback threshold check
    expect(result.performance.fallbackCount).toBeLessThanOrEqual(15);
  });

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
      config: {
        bird: { enabled: false }
      },
    } as any;
  }

  it('2. changing hidden wall card sequence does not alter Advanced AI decisions', () => {
    const state1 = createMockState();
    const dec1 = chooseAdvancedAIDiscard({ state: state1, seat: 0, profile: AI_PROFILES.balanced });

    // Reverse wall sequence
    const state2 = createMockState();
    state2.wall = [state2.wall[1], state2.wall[0]];
    const dec2 = chooseAdvancedAIDiscard({ state: state2, seat: 0, profile: AI_PROFILES.balanced });

    expect(dec1.tileKey).toEqual(dec2.tileKey);
    expect(dec1.expectedValue).toEqual(dec2.expectedValue);
  });

  it('3. changing opponent dark hands does not alter Advanced AI decisions', () => {
    const state1 = createMockState();
    const dec1 = chooseAdvancedAIDiscard({ state: state1, seat: 0, profile: AI_PROFILES.balanced });

    // Mutate seat 1 dark hand cards
    const state2 = createMockState();
    state2.players[1].hand = [{ suit: 'tiao', rank: 5, instanceId: 'ti5' }];
    const dec2 = chooseAdvancedAIDiscard({ state: state2, seat: 0, profile: AI_PROFILES.balanced });

    expect(dec1.tileKey).toEqual(dec2.tileKey);
    expect(dec1.expectedValue).toEqual(dec2.expectedValue);
  });

  it('4. checkTileConservation should return false if tile count is not 108', () => {
    const state = createMockState();
    // Initially mock state has very few cards, so it is not 108.
    expect(checkTileConservation(state)).toBe(false);
  });

  it('5. chooseAdvancedAIAction should execute without throw under simple actions', () => {
    const state = createMockState();
    const decision = chooseAdvancedAIAction({
      state,
      seat: 0,
      availableActions: [
        { seat: 0, type: 'pass', priority: 0 }
      ],
      profile: AI_PROFILES.balanced
    });
    expect(decision.action).toBe('pass');
  });
});
