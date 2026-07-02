import { describe, it, expect } from 'vitest';
import { evaluateDiscardExpectedValues } from '../advanced-ai/expected-value-evaluator.js';
import { VisibleInformationForAI, RouteEvaluation, DefenseEvaluation } from '../advanced-ai/advanced-ai-types.js';
import { AIProfile } from '../ai/ai-types.js';

describe('Expected Value Evaluator tests', () => {
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

  const baseVisible: VisibleInformationForAI = {
    seat: 0,
    hand: [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
    ],
    melds: [],
    allDiscards: { 0: [], 1: [], 2: [], 3: [] },
    allMelds: { 0: [], 1: [], 2: [], 3: [] },
    revealedTiles: [],
    wallRemainingCount: 50,
    currentPhase: 'playing',
    currentSeat: 0,
  };

  const dummyRoutes: RouteEvaluation[] = [
    { route: 'smallHu', score: 80, shanten: 2, potentialScore: 10, requiredTiles: [], reason: '' },
    { route: 'qingYiSe', score: 10, shanten: 99, potentialScore: 60, requiredTiles: [], reason: '' },
  ];

  const dummyDefense: DefenseEvaluation[] = [
    { tileKey: 'wan_1', riskScore: 10, riskLevel: 'low', dangerousToSeats: [], reason: '' },
    { tileKey: 'tong_5', riskScore: 50, riskLevel: 'high', dangerousToSeats: [1], reason: '' },
  ];

  it('1. returns expected scores for all unique hand tiles', () => {
    const evs = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      strategyMode: 'balanced',
      profile: baseProfile,
    });
    expect(evs.length).toBe(2);
    expect(evs.some(e => e.tileKey === 'wan_1')).toBe(true);
    expect(evs.some(e => e.tileKey === 'tong_5')).toBe(true);
  });

  it('2. heavily penalizes high risk tiles in defense mode', () => {
    const evBalanced = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      strategyMode: 'balanced',
      profile: baseProfile,
    });

    const evDefense = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      strategyMode: 'defense',
      profile: baseProfile,
    });

    const to5Balanced = evBalanced.find(e => e.tileKey === 'tong_5')!.expectedScore;
    const to5Defense = evDefense.find(e => e.tileKey === 'tong_5')!.expectedScore;
    // in defense mode, 50 risk * 1.8 = 90 penalty. in balanced mode, 50 * 0.6 = 30 penalty.
    expect(to5Defense).toBeLessThan(to5Balanced);
  });

  it('3. prefers safer tile first in fold mode', () => {
    const evs = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      strategyMode: 'fold',
      profile: baseProfile,
    });
    // Safest tile is wan_1 (risk 10), tong_5 is risk 50.
    expect(evs[0].tileKey).toBe('wan_1');
  });

  it('4. applies route bonus when throwing mismatching suit for qingYiSe', () => {
    const routesQing: RouteEvaluation[] = [
      { route: 'qingYiSe', score: 90, shanten: 2, potentialScore: 60, requiredTiles: [], reason: '清一色（万字）' },
      { route: 'smallHu', score: 80, shanten: 2, potentialScore: 10, requiredTiles: [], reason: '' },
    ];
    const evs = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: routesQing,
      defenseEvaluations: dummyDefense,
      strategyMode: 'attack',
      profile: baseProfile,
    });
    const w1 = evs.find(e => e.tileKey === 'wan_1')!; // Target suit
    const to5 = evs.find(e => e.tileKey === 'tong_5')!; // Mismatching suit
    // to5 has mismatching suit, so routeValue is +50. w1 has target suit, so routeValue is -50.
    expect(to5.routeValue).toBe(50);
    expect(w1.routeValue).toBe(-50);
  });

  it('5. applies jiangJiangHu route rules to discard non-258 tiles first', () => {
    const routesJiang: RouteEvaluation[] = [
      { route: 'jiangJiangHu', score: 95, shanten: 1, potentialScore: 65, requiredTiles: [], reason: '将将胡' },
    ];
    const evs = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: routesJiang,
      defenseEvaluations: dummyDefense,
      strategyMode: 'attack',
      profile: baseProfile,
    });
    const w1 = evs.find(e => e.tileKey === 'wan_1')!; // Non-258 gets routeValue = +40
    const to5 = evs.find(e => e.tileKey === 'tong_5')!; // 5 is 258, gets routeValue = -40
    expect(w1.routeValue).toBe(40);
    expect(to5.routeValue).toBe(-40);
  });

  it('6. reason contains explanation of attack value and defense risk', () => {
    const evs = evaluateDiscardExpectedValues({
      visible: baseVisible,
      handEvaluation: { bestShanten: 2, normalShanten: 2, qiXiaoDuiShanten: 99 },
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      strategyMode: 'balanced',
      profile: baseProfile,
    });
    evs.forEach(e => {
      expect(e.reason).toContain('防守危险分');
      expect(e.reason).toContain('期望分');
    });
  });
});
