import { describe, it, expect } from 'vitest';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { buildPlayerVisibleView, filterLogsForSeat } from '../server/server-visible-view.js';
import { GameLogEntry } from '../../changsha-mahjong/types/game.js';

describe('Server Visible View Tests', () => {
  it('1. self.hand contains own hand and opponents only have handCount', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');

    const connectionStatus = { 0: true, 1: true, 2: true, 3: true };
    const aiSeats: Array<0 | 1 | 2 | 3> = [1, 2, 3];
    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus,
      aiSeats,
    });

    expect(view0.self.seat).toBe(0);
    expect(view0.self.hand.length).toBeGreaterThan(0);

    const opponent1 = view0.opponents.find(o => o.seat === 1);
    expect(opponent1).toBeDefined();
    expect(opponent1?.handCount).toBeGreaterThan(0);
    expect((opponent1 as any).hand).toBeUndefined(); // Hand is hidden in active play
  });

  it('2. view does not expose game wall tiles', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');

    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    expect((view0 as any).wall).toBeUndefined();
    expect(view0.wallRemainingCount).toBe(state.wall.length);
  });

  it('3. pendingActions are filtered per seat', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');
    state.pendingActions = [
      { seat: 0, type: 'discard', priority: 1 },
      { seat: 1, type: 'peng', priority: 2 },
    ];

    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    expect(view0.pendingActions).toHaveLength(1);
    expect(view0.pendingActions[0].seat).toBe(0);
  });

  it('4. settlement stage reveals all hands', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');
    state.phase = 'ended';
    state.roundEnded = true;

    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    expect(view0.settlement).toBeDefined();
    const opp1 = view0.opponents.find(o => o.seat === 1);
    expect(opp1).toBeDefined();
    expect(opp1?.hand).toBeDefined(); // Revealed at the end of the round
    expect(opp1?.hand?.length).toBeGreaterThan(0);
  });

  it('5. logs filter does not leak secret opponent draw tiles', () => {
    const rawLogs: GameLogEntry[] = [
      { step: 1, phase: 'playing', seat: 0, action: '摸牌', detail: 'tong_2' },
      { step: 2, phase: 'playing', seat: 1, action: '摸牌', detail: 'wan_8' },
    ];

    const filteredFor0 = filterLogsForSeat(rawLogs, 0);
    expect(filteredFor0[0].detail).toBe('tong_2'); // own draw visible
    expect(filteredFor0[1].detail).toBeUndefined(); // opponent draw hidden

    const filteredFor1 = filterLogsForSeat(rawLogs, 1);
    expect(filteredFor1[0].detail).toBeUndefined();
    expect(filteredFor1[1].detail).toBe('wan_8');
  });

  it('6. logs filter does not leak opponent starting hands', () => {
    const rawLogs: GameLogEntry[] = [
      { step: 1, phase: 'dealing', seat: 0, action: '起始手牌', detail: 'wan_1, wan_2, wan_3' },
      { step: 2, phase: 'dealing', seat: 1, action: '起始手牌', detail: 'tong_4, tong_5' },
    ];

    const filteredFor0 = filterLogsForSeat(rawLogs, 0);
    expect(filteredFor0[0].detail).toBe('wan_1, wan_2, wan_3');
    expect(filteredFor0[1].detail).toBe('起始手牌已分发');
  });

  it('7. connectionStatus values are correctly mapped to opponents view', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');

    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: false, 2: true, 3: false },
      aiSeats: [],
    });

    const opp1 = view0.opponents.find(o => o.seat === 1);
    const opp2 = view0.opponents.find(o => o.seat === 2);
    expect(opp1?.connected).toBe(false);
    expect(opp2?.connected).toBe(true);
  });

  it('8. dealerSeat and currentSeat are preserved in view', () => {
    let state = createInitialGameState();
    state = startRound(state, 'test-seed-1');
    state.dealerSeat = 2;
    state.currentSeat = 3;

    const view0 = buildPlayerVisibleView({
      roomId: '123456',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    expect(view0.dealerSeat).toBe(2);
    expect(view0.currentSeat).toBe(3);
  });
});
