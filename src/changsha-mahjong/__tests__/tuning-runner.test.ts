import { describe, it, expect } from 'vitest';
import { runTuningCandidates, recommendBestCandidate, CONSERVATIVE_DEFENSE_TUNING, BALANCED_DEFAULT_TUNING } from '../benchmark/tuning-runner.js';
import { TuningCandidate } from '../benchmark/benchmark-types.js';

describe('Tuning Runner Tests', () => {
  const candidates: TuningCandidate[] = [
    { name: 'conservative-defense', config: CONSERVATIVE_DEFENSE_TUNING },
    { name: 'balanced-default', config: BALANCED_DEFAULT_TUNING },
  ];

  it('1. runs tuning candidates and collects results under consistent seeds', () => {
    // Run 1 round benchmark for candidates
    const results = runTuningCandidates({
      candidates,
      seeds: ['benchmark-001'],
      rounds: 1,
    });

    expect(results.length).toBe(2);
    expect(results[0].candidateName).toBe('conservative-defense');
    expect(results[1].candidateName).toBe('balanced-default');
    expect(results[0].metrics.completedRounds).toBe(1);
  });

  it('2. recommends the best candidate with highest score lift', () => {
    const mockTuningResults = [
      {
        candidateName: 'c1',
        metrics: {
          basicAverageScore: 0,
          advancedAverageScore: 10,
          advancedScoreLift: 10,
          basicDealInRate: 0.1,
          advancedDealInRate: 0.1,
          basicWinRate: 0.2,
          advancedWinRate: 0.3,
          basicBigHuRate: 0,
          advancedBigHuRate: 0,
          advancedAverageDecisionMs: 5,
          advancedMaxDecisionMs: 50,
          advancedFallbackCount: 0,
          completedRounds: 5,
          drawRounds: 0,
          advancedTotalDecisionCount: 100,
          totalRounds: 5,
        },
        passedRegressionGate: true,
        reason: 'Passed',
      },
      {
        candidateName: 'c2',
        metrics: {
          basicAverageScore: 0,
          advancedAverageScore: 20,
          advancedScoreLift: 20,
          basicDealInRate: 0.1,
          advancedDealInRate: 0.1,
          basicWinRate: 0.2,
          advancedWinRate: 0.3,
          basicBigHuRate: 0,
          advancedBigHuRate: 0,
          advancedAverageDecisionMs: 5,
          advancedMaxDecisionMs: 50,
          advancedFallbackCount: 0,
          completedRounds: 5,
          drawRounds: 0,
          advancedTotalDecisionCount: 100,
          totalRounds: 5,
        },
        passedRegressionGate: true,
        reason: 'Passed',
      },
    ];

    const mockCandidates: TuningCandidate[] = [
      { name: 'c1', config: BALANCED_DEFAULT_TUNING },
      { name: 'c2', config: CONSERVATIVE_DEFENSE_TUNING },
    ];
    const recommendation = recommendBestCandidate(mockTuningResults, mockCandidates);
    expect(recommendation.candidateName).toBe('c2'); // c2 has higher score lift (20 vs 10)
  });

  it('3. recommends candidate with warning if regression gate is not passed', () => {
    const mockFailedResults = [
      {
        candidateName: 'c1',
        metrics: {
          basicAverageScore: 0,
          advancedAverageScore: -10,
          advancedScoreLift: -10,
          basicDealInRate: 0.1,
          advancedDealInRate: 0.1,
          basicWinRate: 0.2,
          advancedWinRate: 0.1,
          basicBigHuRate: 0,
          advancedBigHuRate: 0,
          advancedAverageDecisionMs: 5,
          advancedMaxDecisionMs: 50,
          advancedFallbackCount: 0,
          completedRounds: 5,
          drawRounds: 0,
          advancedTotalDecisionCount: 100,
          totalRounds: 5,
        },
        passedRegressionGate: false,
        reason: 'Failed',
      },
    ];

    const mockCandidates: TuningCandidate[] = [
      { name: 'c1', config: BALANCED_DEFAULT_TUNING },
    ];
    const recommendation = recommendBestCandidate(mockFailedResults, mockCandidates);
    expect(recommendation.reason).toContain('警告');
  });
});
