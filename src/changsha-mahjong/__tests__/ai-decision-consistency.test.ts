import { describe, it, expect } from 'vitest';
import { chooseAIDiscard, chooseAIAction } from '../ai/ai-player.js';
import { decideAction } from '../ai/action-decision-engine.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { Tile } from '../types/tile.js';
import { PendingAction } from '../types/game.js';
import { createInitialGameState, startRound } from '../controller/game-engine.js';
import { chooseDiscard, chooseAction } from '../controller/bot-controller.js';
import { simulateOneRound } from '../simulator/console-simulator.js';

describe('ai-decision-consistency', () => {
  // 1. 吃牌一致性
  it('1. should show Chi consistency for different profiles', () => {
    // Valid 13-card hand: 1w 2w, 2s 2s, 1-9 tong melds, 9s.
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'tiao', rank: 2, instanceId: 's2_1' },
      { suit: 'tiao', rank: 2, instanceId: 's2_2' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tong', rank: 2, instanceId: 't2' },
      { suit: 'tong', rank: 3, instanceId: 't3' },
      { suit: 'tong', rank: 4, instanceId: 't4' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
      { suit: 'tong', rank: 6, instanceId: 't6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const discard: Tile = { suit: 'wan', rank: 3, instanceId: 'w3_d' };
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'chi', priority: 1, tile: discard, options: [[
        { suit: 'wan', rank: 1, instanceId: 'w1' },
        { suit: 'wan', rank: 2, instanceId: 'w2' },
      ]] },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    // fastHu profile should choose Chi
    const decisionFast = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.fastHu,
    });
    expect(decisionFast.action).toBe('chi');
    expect(decisionFast.reason).toMatch(/(吃|改善|听牌|快胡)/);
    expect(decisionFast.reason).not.toMatch(/(避免吃牌|不吃|门清)/);

    // bigHu profile should choose Pass
    const decisionBig = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.bigHu,
    });
    expect(decisionBig.action).toBe('pass');
    expect(decisionBig.reason).toMatch(/(避免吃牌|门清|不改善)/);
  });

  // 2. 碰牌一致性
  it('2. should show Peng consistency', () => {
    // Valid 13-card hand: two 5-wan, two 2-siao, 1-9 tong melds, one 9-siao
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tiao', rank: 2, instanceId: 's2_1' },
      { suit: 'tiao', rank: 2, instanceId: 's2_2' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tong', rank: 2, instanceId: 't2' },
      { suit: 'tong', rank: 3, instanceId: 't3' },
      { suit: 'tong', rank: 4, instanceId: 't4' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
      { suit: 'tong', rank: 6, instanceId: 't6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const discard: Tile = { suit: 'wan', rank: 5, instanceId: 'w5_d' };
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'peng', priority: 2, tile: discard },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    // balanced profile chooses Peng
    const decisionBal = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(decisionBal.action).toBe('peng');
    expect(decisionBal.reason).toMatch(/(碰|听牌|碰碰胡)/);
    expect(decisionBal.reason).not.toMatch(/(避免碰)/);

    // defensive profile with short hand chooses Pass (mocking a short hand of 4 cards)
    const shortHand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
    ];
    const decisionDef = decideAction({
      availableActions,
      hand: shortHand,
      melds: [],
      visibleTiles: [...shortHand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });
    expect(decisionDef.action).toBe('pass');
    expect(decisionDef.reason).toMatch(/(避免碰牌|过短手牌|防守)/);
  });

  // 3. 杠牌一致性
  it('3. should show Gang consistency', () => {
    const buGangTile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'buGang', priority: 3, tile: buGangTile },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    // balanced chooses Gang
    const decisionBal = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(decisionBal.action).toBe('buGang');
    expect(decisionBal.reason).toMatch(/(杠|补杠|得杠分)/);
    expect(decisionBal.reason).not.toMatch(/(不建议杠|避免杠)/);

    // defensive chooses Pass
    const decisionDef = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });
    expect(decisionDef.action).toBe('pass');
    expect(decisionDef.reason).toMatch(/(规避补杠风险|抢杠)/);
  });

  // 4. 出牌一致性
  it('4. should show Discard consistency', () => {
    let state = createInitialGameState();
    state = startRound(state, 'consistency-discard-seed');

    // balanced seat 0 chooses discard
    const player = state.players[0];
    const decision = chooseAIDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('discard');
    expect(decision.tileKey).toBeDefined();

    // Verify it is a valid positive reason for discarding
    expect(decision.reason).not.toContain('保留');
    expect(decision.reason).not.toContain('规避高风险牌'); // If risky but Safest, it says "避险打出"
  });

  // 5. 不同 profile reason 差异
  it('5. should show profile reasons differences on same hand', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const visibleTiles: Tile[] = [
      { suit: 'tong', rank: 9, instanceId: 'v1' },
      { suit: 'tong', rank: 9, instanceId: 'v2' },
      { suit: 'tong', rank: 9, instanceId: 'v3' },
      ...hand,
    ];

    const evalsDef = decideAction({
      availableActions: [
        { seat: 0, type: 'buGang', priority: 3, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
        { seat: 0, type: 'pass', priority: 0 },
      ],
      hand: [],
      melds: [],
      visibleTiles,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });
    // Defensive profile reason contains defensive risk avoidance
    expect(evalsDef.reason).toContain('规避补杠风险');

    const evalsFast = decideAction({
      availableActions: [
        { seat: 0, type: 'buGang', priority: 3, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
        { seat: 0, type: 'pass', priority: 0 },
      ],
      hand: [],
      melds: [],
      visibleTiles,
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.fastHu,
    });
    expect(evalsFast.action).toBe('buGang');
    expect(evalsFast.reason).toContain('杠');
  });

  // 6. fallback 一致性
  it('6. should prefix fallback reasons with Fallback label', () => {
    const state = createInitialGameState();
    // Forcing chooseAction to trigger fallback by passing seat without matching players (or empty players)
    state.players = [];
    const actions = [{ seat: 0 as const, type: 'pass' as const, priority: 0 }];
    
    // Call chooseAction, it should handle the error and fallback successfully
    const fallbackRes = chooseAction(state, 0, actions);
    expect(fallbackRes.type).toBe('pass');
    expect((state as any).tempReasons[0]).toContain('Fallback:');
  });

  // 7. 控制台模拟日志一致性
  it('7. should run simulateOneRound with custom profiles and verify logs semantic consistency', () => {
    const { finalState } = simulateOneRound({
      seed: 'ai-consistency-v031',
      aiProfiles: ['fastHu', 'bigHu', 'defensive', 'balanced'],
    });

    expect(finalState.roundEnded).toBe(true);
    expect(finalState.phase).toBe('ended');

    // Audit logs for contradictions
    for (const log of finalState.logs) {
      const seat = log.seat;
      const action = log.action;
      const detail = log.detail || '';

      if (action === '吃牌') {
        expect(detail).not.toMatch(/(避免吃牌|门清|不吃)/);
      }
      if (action === '碰牌') {
        expect(detail).not.toMatch(/(避免碰)/);
      }
      if (action === '直杠' || action === '暗杠' || action === '声明补杠') {
        expect(detail).not.toMatch(/(不建议杠|避免杠)/);
      }
      if (action === '打出牌') {
        expect(detail).not.toMatch(/(保留.*花色|保留.*将牌|保留对子)/);
      }
    }
  });
});
