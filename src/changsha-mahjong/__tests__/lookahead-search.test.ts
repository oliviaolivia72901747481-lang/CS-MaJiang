import { describe, it, expect } from 'vitest';
import { runLookaheadSearch } from '../advanced-ai/lookahead-search.js';
import { VisibleInformationForAI } from '../advanced-ai/advanced-ai-types.js';
import { AIProfile } from '../ai/ai-types.js';

describe('Lookahead Search tests', () => {
  const baseProfile: any = {
    type: 'balanced',
    weights: {
      shanten: 1.0,
      effectiveTiles: 1.0,
      sequenceValue: 1.0,
      pairValue: 1.0,
      qiXiaoDuiPotential: 1.0,
      pengPengHuPotential: 1.0,
      jiangJiangHuPotential: 1.0,
      defenseFactor: 1.0,
    },
    riskThreshold: 30,
  };

  const baseVisible: any = {
    seat: 0,
    hand: [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 4, instanceId: 'w4' }, // forms sequence with 1w, 2w if we draw 3w
    ],
    melds: [],
    allDiscards: { 0: [], 1: [], 2: [], 3: [] },
    allMelds: { 0: [], 1: [], 2: [], 3: [] },
    revealedTiles: [],
    wallRemainingCount: 50,
    currentPhase: 'playing',
    currentSeat: 0,
  };

  it('1. runs successfully with depth=1 and returns EV scores', () => {
    const results = runLookaheadSearch({
      visible: baseVisible,
      candidateTileKeys: ['wan_4'],
      depth: 1,
      profile: baseProfile,
    });
    expect(results.length).toBe(1);
    expect(results[0].depth).toBe(1);
    expect(results[0].expectedValue).toBeGreaterThanOrEqual(0);
  });

  it('2. runs successfully with depth=2 and outputs EV scores', () => {
    const results = runLookaheadSearch({
      visible: baseVisible,
      candidateTileKeys: ['wan_4'],
      depth: 2,
      profile: baseProfile,
    });
    expect(results.length).toBe(1);
    expect(results[0].depth).toBe(2);
  });

  it('3. does not read or mutate state.wall order, strictly uses visible remaining counts', () => {
    // If 1w, 2w, 3w are fully visible (all 4 copies of each visible on table), drawing them is impossible
    const visibleWith3wSeen = {
      ...baseVisible,
      revealedTiles: [
        { suit: 'wan', rank: 1, instanceId: 'w1_1' },
        { suit: 'wan', rank: 1, instanceId: 'w1_2' },
        { suit: 'wan', rank: 1, instanceId: 'w1_3' },
        { suit: 'wan', rank: 1, instanceId: 'w1_4' },
        { suit: 'wan', rank: 2, instanceId: 'w2_1' },
        { suit: 'wan', rank: 2, instanceId: 'w2_2' },
        { suit: 'wan', rank: 2, instanceId: 'w2_3' },
        { suit: 'wan', rank: 2, instanceId: 'w2_4' },
        { suit: 'wan', rank: 3, instanceId: 'w3_1' },
        { suit: 'wan', rank: 3, instanceId: 'w3_2' },
        { suit: 'wan', rank: 3, instanceId: 'w3_3' },
        { suit: 'wan', rank: 3, instanceId: 'w3_4' },
      ]
    };
    const results = runLookaheadSearch({
      visible: visibleWith3wSeen,
      candidateTileKeys: ['wan_4'], // discarding 4w leaves 1w-2w which cannot draw 1w, 2w, 3w
      depth: 1,
      profile: baseProfile,
    });
    // EV score should be 0 because all improving tiles are depleted
    expect(results[0].expectedValue).toBe(0);
  });

  it('4. outputs bestFutureTiles list containing effective tiles that improve shanten', () => {
    const visibleWithMeld = {
      ...baseVisible,
      melds: [
        { type: 'peng' as const, tiles: [{ suit: 'tong', rank: 9, instanceId: 't9' }], exposed: true }
      ]
    };
    const results = runLookaheadSearch({
      visible: visibleWithMeld,
      candidateTileKeys: ['wan_4'], // Discarding 4w leaves 1w-2w. Effective tile is 3w.
      depth: 1,
      profile: baseProfile,
    });
    expect(results[0].bestFutureTiles).toContain('wan_3');
  });

  it('5. is pure and does not mutate visible state input', () => {
    const copy = JSON.parse(JSON.stringify(baseVisible));
    runLookaheadSearch({
      visible: baseVisible,
      candidateTileKeys: ['wan_4'],
      depth: 1,
      profile: baseProfile,
    });
    expect(baseVisible).toEqual(copy);
  });
});
