import { describe, it, expect } from 'vitest';
import { recordHumanDecision, analyzeReplay } from '../coach/replay-analyzer.js';
import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';

function createMockState(hand: Tile[]): GameState {
  return {
    phase: 'playing',
    dealerSeat: 0,
    currentSeat: 0,
    players: [
      {
        seat: 0,
        id: 'player_0',
        name: '我',
        hand,
        melds: [],
        discards: [],
        score: 100,
        isHuman: true,
      },
      { seat: 1, id: 'player_1', name: 'AI 1', hand: [], melds: [], discards: [], score: 100 },
      { seat: 2, id: 'player_2', name: 'AI 2', hand: [], melds: [], discards: [], score: 100 },
      { seat: 3, id: 'player_3', name: 'AI 3', hand: [], melds: [], discards: [], score: 100 },
    ],
    wall: [],
    discards: { 0: [], 1: [], 2: [], 3: [] },
    pendingActions: [],
    scoreEvents: [],
    logs: [],
    config: {
      birdCount: 2,
      scoreMode: 'changsha_6_7',
      birdMode: 'all_birds',
      openDoor: { needOpenDoorForDianPaoHu: false },
    },
  } as any;
}

describe('replay-analyzer.ts tests', () => {
  it('1. should record player decision and compare with advice', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'tiao', rank: 9, instanceId: 't9' },
    ];
    const stateBefore = createMockState(hand);
    
    const record = recordHumanDecision({
      stateBefore,
      stateAfter: stateBefore,
      humanSeat: 0,
      actualAction: 'discard',
      actualTileKey: 'tiao_9',
    });

    expect(record.actualAction).toBe('discard');
    expect(record.actualTileKey).toBe('tiao_9');
    expect(record.recommendedTileKey).toBe('tiao_9');
    expect(record.matchedRecommendation).toBe(true);
  });

  it('2. should analyze multiple decision logs and output ReplayReport', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const finalState = createMockState(hand);
    
    const records = [
      {
        step: 1,
        phase: 'playing',
        seat: 0 as const,
        actualAction: 'discard',
        actualTileKey: 'wan_1',
        recommendedTileKey: 'wan_1',
        matchedRecommendation: true,
        reason: '打出孤张。',
      }
    ];

    const report = analyzeReplay({
      finalState,
      decisionRecords: records,
      humanSeat: 0,
    });

    expect(report.totalDecisions).toBe(1);
    expect(report.matchedRecommendationCount).toBe(1);
    expect(report.summary).toContain('匹配率');
  });

  it('3. should record mismatch when player selects non-recommended discard', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'tiao', rank: 9, instanceId: 't9' },
    ];
    const stateBefore = createMockState(hand);
    
    const record = recordHumanDecision({
      stateBefore,
      stateAfter: stateBefore,
      humanSeat: 0,
      actualAction: 'discard',
      actualTileKey: 'wan_1', // Player discards 1w instead of recommended 9t
    });

    expect(record.matchedRecommendation).toBe(false);
  });

  it('4. should calculate correct score delta from win events', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const finalState = createMockState(hand);
    finalState.winnerSeats = [0];
    finalState.scoreEvents = [
      { fromPlayerId: 'player_1', toPlayerId: 'player_0', score: 10, reason: '自摸' }
    ];

    const report = analyzeReplay({
      finalState,
      decisionRecords: [],
      humanSeat: 0,
    });

    expect(report.roundResult).toBe('win');
    expect(report.playerScoreDelta).toBe(10);
  });

  it('5. should calculate correct score delta from lose events', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const finalState = createMockState(hand);
    finalState.winnerSeats = [1];
    finalState.scoreEvents = [
      { fromPlayerId: 'player_0', toPlayerId: 'player_1', score: 5, reason: '点炮' }
    ];

    const report = analyzeReplay({
      finalState,
      decisionRecords: [],
      humanSeat: 0,
    });

    expect(report.roundResult).toBe('lose');
    expect(report.playerScoreDelta).toBe(-5);
  });

  it('6. should detect draw round result correctly', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const finalState = createMockState(hand);
    finalState.winnerSeats = []; // draw

    const report = analyzeReplay({
      finalState,
      decisionRecords: [],
      humanSeat: 0,
    });

    expect(report.roundResult).toBe('draw');
    expect(report.playerScoreDelta).toBe(0);
  });
});
