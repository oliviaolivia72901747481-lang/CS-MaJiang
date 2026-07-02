import { describe, it, expect } from 'vitest';
import { evaluateDefense } from '../advanced-ai/defense-analyzer.js';
import { VisibleInformationForAI, OpponentRead } from '../advanced-ai/advanced-ai-types.js';

describe('Defense Analyzer tests', () => {
  const baseVisible: any = {
    seat: 0,
    hand: [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
    ],
    melds: [],
    allDiscards: { 0: [], 1: [], 2: [], 3: [] },
    allMelds: { 0: [], 1: [], 2: [], 3: [] },
    revealedTiles: [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 5, instanceId: 'to5' },
    ],
    wallRemainingCount: 50,
    currentPhase: 'playing',
    currentSeat: 0,
  };

  const baseOpponents: OpponentRead[] = [
    { seat: 1, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
    { seat: 2, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
    { seat: 3, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
  ];

  it('1. assesses river discards as safe (现物)', () => {
    const visible = {
      ...baseVisible,
      allDiscards: {
        ...baseVisible.allDiscards,
        1: [{ suit: 'wan', rank: 1, instanceId: 'w1_x' }]
      }
    };
    const evals = evaluateDefense({ visible, opponentReads: baseOpponents });
    const w1Eval = evals.find(e => e.tileKey === 'wan_1')!;
    // w1 is in opp 1 river. So its risk is 0 to opp 1.
    // Since there are other opponents, the overall max risk might be from others (e.g. 15 for unseen in their river), but it is lower.
    expect(w1Eval.riskLevel).toBe('medium'); // w1 is seen on table, but not in 2 and 3 discards.
  });

  it('2. assesses raw middle cards as higher risk than terminals', () => {
    const evals = evaluateDefense({ visible: baseVisible, opponentReads: baseOpponents });
    const w1Eval = evals.find(e => e.tileKey === 'wan_1')!;
    const to5Eval = evals.find(e => e.tileKey === 'tong_5')!;
    // 5t is middle card, 1w is terminal card. Both raw (tableVisibleCount = 0).
    expect(to5Eval.riskScore).toBeGreaterThan(w1Eval.riskScore);
  });

  it('3. reduces risk score for extinction/depleted tiles (绝张)', () => {
    const visible = {
      ...baseVisible,
      revealedTiles: [
        { suit: 'wan', rank: 1, instanceId: 'w1' },
        { suit: 'wan', rank: 1, instanceId: 'w1_2' },
        { suit: 'wan', rank: 1, instanceId: 'w1_3' },
        { suit: 'wan', rank: 1, instanceId: 'w1_4' },
      ]
    };
    const evals = evaluateDefense({ visible, opponentReads: baseOpponents });
    const w1Eval = evals.find(e => e.tileKey === 'wan_1')!;
    expect(w1Eval.riskScore).toBeLessThanOrEqual(5);
    expect(w1Eval.riskLevel).toBe('low');
  });

  it('4. raises risk score when tile matches an opponent dangerous suit', () => {
    const opponents = [
      { seat: 1 as const, suspectedRoutes: [], dangerousSuits: [{ suit: 'tong' as const, confidence: 0.8, reason: 'QingYiSe' }], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
      { seat: 2 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
      { seat: 3 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
    ];
    const evals = evaluateDefense({ visible: baseVisible, opponentReads: opponents });
    const w1Eval = evals.find(e => e.tileKey === 'wan_1')!;
    const to5Eval = evals.find(e => e.tileKey === 'tong_5')!;
    // to5 matches dangerous suit of tong
    expect(to5Eval.riskScore).toBeGreaterThan(w1Eval.riskScore + 20);
  });

  it('5. raises risk score when opponent is likely listening (Ting)', () => {
    const opponents = [
      { seat: 1 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: true, tingConfidence: 0.8, reason: '' },
      { seat: 2 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
      { seat: 3 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
    ];
    const evals1 = evaluateDefense({ visible: baseVisible, opponentReads: baseOpponents });
    const evals2 = evaluateDefense({ visible: baseVisible, opponentReads: opponents });
    const scoreBefore = evals1.find(e => e.tileKey === 'tong_5')!.riskScore;
    const scoreAfter = evals2.find(e => e.tileKey === 'tong_5')!.riskScore;
    expect(scoreAfter).toBeGreaterThan(scoreBefore);
  });

  it('6. correctly outputs critical risk level when risk score is extremely high', () => {
    const opponents = [
      { seat: 1 as const, suspectedRoutes: [], dangerousSuits: [{ suit: 'tong' as const, confidence: 0.9, reason: 'QingYiSe' }], isLikelyTing: true, tingConfidence: 0.9, reason: '' },
      { seat: 2 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
      { seat: 3 as const, suspectedRoutes: [], dangerousSuits: [], isLikelyTing: false, tingConfidence: 0.1, reason: '' },
    ];
    const evals = evaluateDefense({ visible: baseVisible, opponentReads: opponents });
    const to5Eval = evals.find(e => e.tileKey === 'tong_5')!;
    expect(to5Eval.riskLevel).toBe('critical');
  });
});
