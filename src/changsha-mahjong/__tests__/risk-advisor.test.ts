import { describe, it, expect } from 'vitest';
import { analyzeDiscardRisks } from '../coach/risk-advisor.js';
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

describe('risk-advisor.ts tests', () => {
  it('1. should evaluate risk level and sort by highest risk first', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 1, instanceId: 'w1' },
    ];
    const state = createMockState(hand);
    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(risks.length).toBe(2);
    expect(risks[0].riskScore).toBeGreaterThanOrEqual(risks[1].riskScore);
  });

  it('2. should map high risk values to high level', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 5, instanceId: 'w5' }];
    const state = createMockState(hand);
    // Add discards to increase turn count to 45 (progressFactor = 1.625)
    // Risk = 15 * 3.5 * 1.625 = 85 (high)
    state.discards[1] = new Array(15).fill({ suit: 'wan', rank: 9, instanceId: 'd1' });
    state.discards[2] = new Array(15).fill({ suit: 'wan', rank: 9, instanceId: 'd2' });
    state.discards[3] = new Array(15).fill({ suit: 'wan', rank: 9, instanceId: 'd3' });

    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(risks[0].riskLevel).toBe('high');
    expect(risks[0].reason).toContain('放铳风险可能极高');
  });

  it('3. should map low risk values to low level', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const state = createMockState(hand);
    // 3 copies visible -> unseenMultiplier is 0.5, baseRisk is 5. Risk = 5 * 0.5 * 0.5 = 1.25 (low)
    state.discards[1] = [
      { suit: 'wan', rank: 1, instanceId: 'o1' },
      { suit: 'wan', rank: 1, instanceId: 'o2' },
      { suit: 'wan', rank: 1, instanceId: 'o3' },
    ];
    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(risks[0].riskLevel).toBe('low');
    expect(risks[0].reason).toContain('安全');
  });

  it('4. should handle empty hands gracefully', () => {
    const state = createMockState([]);
    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(risks).toEqual([]);
  });

  it('5. should provide riskLevel as low/medium/high', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 2, instanceId: 'w2' }];
    const state = createMockState(hand);
    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(['low', 'medium', 'high']).toContain(risks[0].riskLevel);
  });

  it('6. should map medium risk level correctly', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 5, instanceId: 'w5' }];
    const state = createMockState(hand);
    // Add discards to increase turn count to 15 (progressFactor = 0.875)
    // 2 copies visible (1 in hand, 1 in discards) -> unseenMultiplier is 1.5, baseRisk is 15.
    // Risk = 15 * 1.5 * 0.875 = 19.68 (medium)
    state.discards[1] = [{ suit: 'wan', rank: 5, instanceId: 'o1' }];
    state.discards[2] = new Array(5).fill({ suit: 'wan', rank: 9, instanceId: 'd1' });
    state.discards[3] = new Array(9).fill({ suit: 'wan', rank: 9, instanceId: 'd2' });

    const risks = analyzeDiscardRisks({ state, humanSeat: 0 });
    expect(risks[0].riskLevel).toBe('medium');
    expect(risks[0].reason).toContain('虽不是纯生张');
  });
});
