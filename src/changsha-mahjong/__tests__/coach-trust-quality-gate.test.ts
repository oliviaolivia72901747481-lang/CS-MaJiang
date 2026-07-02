import { describe, it, expect } from 'vitest';
import { buildVisibleStateForCoach } from '../coach/visible-state.js';
import { analyzeHumanHand, getRemainingTileCount } from '../coach/hand-advisor.js';
import { recommendDiscards } from '../coach/discard-advisor.js';
import { analyzeDiscardRisks } from '../coach/risk-advisor.js';
import { adviseHumanAction } from '../coach/action-advisor.js';
import { recordHumanDecision, analyzeReplay } from '../coach/replay-analyzer.js';
import { buildReplayReportText } from '../coach/replay-report-builder.js';
import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';

function createMockBaseState(): GameState {
  const p0Hand: Tile[] = [
    { suit: 'wan', rank: 1, instanceId: 'w1' },
    { suit: 'wan', rank: 2, instanceId: 'w2' },
    { suit: 'wan', rank: 3, instanceId: 'w3' },
    { suit: 'tiao', rank: 9, instanceId: 't9' },
  ];

  const p1Hand: Tile[] = [
    { suit: 'tong', rank: 2, instanceId: 'to2_1' },
    { suit: 'tong', rank: 3, instanceId: 'to3_1' },
  ];

  return {
    phase: 'playing',
    dealerSeat: 0,
    currentSeat: 0,
    players: [
      { seat: 0, id: 'player_0', hand: p0Hand, melds: [], discards: [], score: 100, isDealer: true, hasOpenedDoor: false },
      { seat: 1, id: 'player_1', hand: p1Hand, melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
      { seat: 2, id: 'player_2', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
      { seat: 3, id: 'player_3', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
    ],
    wall: [
      { suit: 'wan', rank: 5, instanceId: 'wall_1' },
      { suit: 'wan', rank: 6, instanceId: 'wall_2' },
    ],
    discards: {
      0: [],
      1: [{ suit: 'wan', rank: 9, instanceId: 'd_w9' }],
      2: [],
      3: [],
    },
    pendingActions: [],
    scoreEvents: [],
    logs: [],
    config: {
      baseScore: 2,
      scoreMode: 'changsha_6_7',
      smallHu: { need258Jiang: true, dianPao: 1, ziMoEach: 1 },
      bigHu: { dianPao: 6, ziMoEach: 6, allowStacking: true },
      gang: { mingGang: 1, buGang: 1, anGang: 2, settleImmediately: true, refundOnDraw: false },
      bird: { enabled: true, count: 2 },
      openDoor: { needOpenDoorForDianPaoHu: false },
      startingHu: { enabled: true, scoreEach: 1, dealerBonusEach: 1 },
    },
  } as any;
}

describe('Coach Trust Quality Gate backend checks', () => {
  it('1. buildVisibleStateForCoach does not contain AI concealed cards', () => {
    const state = createMockBaseState();
    const vis = buildVisibleStateForCoach(state, 0);
    // Should contain seat 0 hand
    expect(vis.humanHand.length).toBe(4);
    // Should NOT expose seat 1 hand or allow access to it
    const exposedConcealed = (vis as any).playersConcealedHands || [];
    expect(exposedConcealed).toEqual([]);
  });

  it('2. buildVisibleStateForCoach does not expose wall concrete tiles', () => {
    const state = createMockBaseState();
    const vis = buildVisibleStateForCoach(state, 0);
    expect((vis as any).wall).toBeUndefined();
    expect(vis.wallRemainingCount).toBe(2);
  });

  it('3. remaining tile count estimates count based strictly on visible tiles', () => {
    const state = createMockBaseState();
    const vis = buildVisibleStateForCoach(state, 0);
    // 9w is in player 1 discards (visible). Hand has no 9w.
    // 9w count visible: 1. Remaining: 4 - 1 = 3.
    const count = getRemainingTileCount(vis, ['wan_9']);
    expect(count).toBe(3);
  });

  it('4. hand-advisor does not use hidden wall tile info', () => {
    const state = createMockBaseState();
    // 5w and 6w are in the wall. If hand advisor cheats, it might see 5w, 6w.
    // We change the wall tiles to 8w. Hand advisor results should remain exactly the same.
    const advBefore = analyzeHumanHand({ state, humanSeat: 0 });
    
    const state2 = createMockBaseState();
    state2.wall = [
      { suit: 'wan', rank: 8, instanceId: 'wall_1' },
      { suit: 'wan', rank: 8, instanceId: 'wall_2' },
    ];
    const advAfter = analyzeHumanHand({ state: state2, humanSeat: 0 });
    expect(advBefore.effectiveTileKeys).toEqual(advAfter.effectiveTileKeys);
    expect(advBefore.effectiveTileCount).toEqual(advAfter.effectiveTileCount);
  });

  it('5. discard-advisor recommendation must come from player actual hand', () => {
    const state = createMockBaseState();
    const discards = recommendDiscards({ state, humanSeat: 0 });
    discards.forEach(d => {
      const match = state.players[0].hand.some(t => `${t.suit}_${t.rank}` === d.tileKey);
      expect(match).toBe(true);
    });
  });

  it('6. discard-advisor Top 3 list has no duplicates', () => {
    const state = createMockBaseState();
    // Hand has [1w, 2w, 3w, 9t]
    const discards = recommendDiscards({ state, humanSeat: 0 });
    const keys = discards.map(d => d.tileKey);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('7. risk-advisor does not cheat on AI hands', () => {
    const state = createMockBaseState();
    // AI has [2t, 3t] concealed. If risk advisor cheats, it would increase/decrease risk based on it.
    const risksBefore = analyzeDiscardRisks({ state, humanSeat: 0 });

    const state2 = createMockBaseState();
    state2.players[1].hand = [
      { suit: 'tong', rank: 9, instanceId: 'to9' },
      { suit: 'tong', rank: 9, instanceId: 'to9_2' },
    ];
    const risksAfter = analyzeDiscardRisks({ state: state2, humanSeat: 0 });
    expect(risksBefore).toEqual(risksAfter);
  });

  it('8. risk-advisor does not cheat on wall contents', () => {
    const state = createMockBaseState();
    const risksBefore = analyzeDiscardRisks({ state, humanSeat: 0 });

    const state2 = createMockBaseState();
    state2.wall = [
      { suit: 'tong', rank: 8, instanceId: 'w8' },
    ];
    const risksAfter = analyzeDiscardRisks({ state: state2, humanSeat: 0 });
    expect(risksBefore).toEqual(risksAfter);
  });

  it('9. action-advisor only recommends availableActions', () => {
    const state = createMockBaseState();
    const availableActions = [
      { seat: 0 as const, type: 'pass' as const, priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    expect(advices.length).toBe(1);
    expect(advices[0].action).toBe('pass');
  });

  it('10. action-advisor filters out non-seat-0 actions', () => {
    const state = createMockBaseState();
    const availableActions = [
      { seat: 1 as const, type: 'hu' as const, priority: 3 },
      { seat: 0 as const, type: 'pass' as const, priority: 0 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    expect(advices.some(a => a.action === 'hu')).toBe(false);
  });

  it('11. replay-analyzer categorizes into realTimeKnown and afterTheFact', () => {
    const state = createMockBaseState();
    const records = [
      { step: 1, phase: 'playing', seat: 0 as const, actualAction: 'discard', actualTileKey: 'wan_1', recommendedTileKey: 'wan_1', matchedRecommendation: true, reason: 'ok' }
    ];
    const report = analyzeReplay({ finalState: state, decisionRecords: records, humanSeat: 0 });
    expect(report.insights?.some(i => i.type === 'realTimeKnown')).toBe(true);
    expect(report.insights?.some(i => i.type === 'afterTheFact')).toBe(true);
  });

  it('12. replay-report-builder outputs 【当时可知】 text', () => {
    const state = createMockBaseState();
    const report = analyzeReplay({ finalState: state, decisionRecords: [], humanSeat: 0 });
    const text = buildReplayReportText(report);
    expect(text).toContain('【当时可知】');
  });

  it('13. replay-report-builder outputs 【事后观察】 text', () => {
    const state = createMockBaseState();
    const report = analyzeReplay({ finalState: state, decisionRecords: [], humanSeat: 0 });
    const text = buildReplayReportText(report);
    expect(text).toContain('【事后观察】');
  });

  it('14. GameState is deep equal before and after Coach calculations', () => {
    const state = createMockBaseState();
    const copy = JSON.parse(JSON.stringify(state));

    analyzeHumanHand({ state, humanSeat: 0 });
    recommendDiscards({ state, humanSeat: 0 });
    analyzeDiscardRisks({ state, humanSeat: 0 });
    adviseHumanAction({ state, humanSeat: 0, availableActions: [] });

    expect(state).toEqual(copy);
  });

  it('15. exchanging hidden wall tiles order does not affect recommendations', () => {
    const state = createMockBaseState();
    const discBefore = recommendDiscards({ state, humanSeat: 0 });

    const state2 = createMockBaseState();
    state2.wall = [state2.wall[1], state2.wall[0]]; // reverse wall order
    const discAfter = recommendDiscards({ state: state2, humanSeat: 0 });
    expect(discBefore).toEqual(discAfter);
  });

  it('16. changing AI hand concealed cards does not affect discard suggestions', () => {
    const state = createMockBaseState();
    const discBefore = recommendDiscards({ state, humanSeat: 0 });

    const state2 = createMockBaseState();
    state2.players[1].hand = [
      { suit: 'tiao', rank: 1, instanceId: 't1_x' },
    ];
    const discAfter = recommendDiscards({ state: state2, humanSeat: 0 });
    expect(discBefore).toEqual(discAfter);
  });

  it('17. adding public discards changes risk-advisor scores', () => {
    const state = createMockBaseState();
    const risksBefore = analyzeDiscardRisks({ state, humanSeat: 0 });
    const targetRiskBefore = risksBefore.find(r => r.tileKey === 'wan_1')?.riskScore || 0;

    const state2 = createMockBaseState();
    // Add 1w to players discards (visible)
    state2.discards[1].push({ suit: 'wan', rank: 1, instanceId: 'dis_1w_1' });
    state2.discards[2].push({ suit: 'wan', rank: 1, instanceId: 'dis_1w_2' });

    const risksAfter = analyzeDiscardRisks({ state: state2, humanSeat: 0 });
    const targetRiskAfter = risksAfter.find(r => r.tileKey === 'wan_1')?.riskScore || 0;
    
    // Risk score should decrease because the tile is now safer (visible count increased)
    expect(targetRiskAfter).toBeLessThan(targetRiskBefore);
  });

  it('18. Hu/ZiMo action has highest priority recommendation score', () => {
    const state = createMockBaseState();
    const availableActions: any = [
      { seat: 0 as const, type: 'chi' as const, priority: 1, tile: { suit: 'wan', rank: 4, instanceId: 'w4' } },
      { seat: 0 as const, type: 'hu' as const, priority: 3 },
    ];
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions });
    expect(advices[0].action).toBe('hu');
    expect(advices[0].score).toBe(10000);
  });

  it('19. returns empty advices when availableActions list is empty', () => {
    const state = createMockBaseState();
    const advices = adviseHumanAction({ state, humanSeat: 0, availableActions: [] });
    expect(advices).toEqual([]);
  });

  it('20. risk reason texts contain only probabilistic words and no absolute words', () => {
    const state = createMockBaseState();
    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    
    const absoluteWords = ['一定', '必然', '绝对'];
    risks.forEach(r => {
      absoluteWords.forEach(w => {
        expect(r.reason).not.toContain(w);
      });
      expect(r.reason).toMatch(/(可能|风险|概率|推测|估计)/);
    });
  });
});
