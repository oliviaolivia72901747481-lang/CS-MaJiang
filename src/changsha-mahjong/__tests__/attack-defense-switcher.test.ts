import { describe, it, expect } from 'vitest';
import { decideStrategyMode } from '../advanced-ai/attack-defense-switcher.js';
import { RouteEvaluation, DefenseEvaluation } from '../advanced-ai/advanced-ai-types.js';
import { AIProfile } from '../ai/ai-types.js';

describe('Attack-Defense Switcher tests', () => {
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

  const dummyRoutes: RouteEvaluation[] = [];
  const dummyDefense: DefenseEvaluation[] = [];

  it('1. forces win or attacks when best shanten is 0 (listening)', () => {
    const handEval = { bestShanten: 0, normalShanten: 0, qiXiaoDuiShanten: 99 };
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      wallRemainingCount: 40,
      currentScore: 100,
      profile: baseProfile,
    });
    expect(result.strategyMode).toBe('forceWin');
  });

  it('2. transitions to defense if hand is far from listening and there are high threat tiles', () => {
    const handEval = { bestShanten: 3, normalShanten: 3, qiXiaoDuiShanten: 99 };
    const defense: DefenseEvaluation[] = [
      { tileKey: 'wan_5', riskScore: 70, riskLevel: 'critical', dangerousToSeats: [1], reason: '高危生张' }
    ];
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: defense,
      wallRemainingCount: 30,
      currentScore: 100,
      profile: baseProfile,
    });
    expect(result.strategyMode).toBe('defense');
  });

  it('3. transitions to fold in very late game when hand is slow and high risk tiles are present', () => {
    const handEval = { bestShanten: 3, normalShanten: 3, qiXiaoDuiShanten: 99 };
    const defense: DefenseEvaluation[] = [
      { tileKey: 'wan_5', riskScore: 50, riskLevel: 'high', dangerousToSeats: [1], reason: '高危生张' }
    ];
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: defense,
      wallRemainingCount: 8, // Very late game
      currentScore: 100,
      profile: baseProfile,
    });
    expect(result.strategyMode).toBe('fold');
  });

  it('4. prefers attack in fastHu profile when shanten is 1', () => {
    const handEval = { bestShanten: 1, normalShanten: 1, qiXiaoDuiShanten: 99 };
    const fastHuProfile = { ...baseProfile, type: 'fastHu' as const };
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      wallRemainingCount: 35,
      currentScore: 100,
      profile: fastHuProfile,
    });
    expect(result.strategyMode).toBe('attack');
  });

  it('5. prefers defense in defensive profile when shanten is 1 and critical threat exists', () => {
    const handEval = { bestShanten: 1, normalShanten: 1, qiXiaoDuiShanten: 99 };
    const defensiveProfile = { ...baseProfile, type: 'defensive' as const };
    const defense: DefenseEvaluation[] = [
      { tileKey: 'wan_5', riskScore: 70, riskLevel: 'critical', dangerousToSeats: [1], reason: '高危' }
    ];
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: defense,
      wallRemainingCount: 35,
      currentScore: 100,
      profile: defensiveProfile,
    });
    expect(result.strategyMode).toBe('defense');
  });

  it('6. keeps balanced mode by default during normal early game progression', () => {
    const handEval = { bestShanten: 3, normalShanten: 3, qiXiaoDuiShanten: 99 };
    const result = decideStrategyMode({
      handEvaluation: handEval,
      routeEvaluations: dummyRoutes,
      defenseEvaluations: dummyDefense,
      wallRemainingCount: 50,
      currentScore: 100,
      profile: baseProfile,
    });
    expect(result.strategyMode).toBe('balanced');
  });
});
