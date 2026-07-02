/**
 * visible-meld-security.test.ts (vitest)
 * Tests that melds are correctly visible/hidden per security rules.
 * 5 tests total.
 */
import { describe, it, expect } from 'vitest';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import type { Meld } from '../../changsha-mahjong/types/meld.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import { getRoom } from '../server/room-manager.js';

function makeTile(suit: string, rank: number, instanceId: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId };
}

const mockConnectionStatus: Record<0|1|2|3, boolean> = { 0: true, 1: true, 2: false, 3: false };

// Helper: create a state for the given active seats
function buildState(activeSeats: Array<0|1|2|3>) {
  let state = createInitialGameState(undefined, activeSeats);
  return startRound(state, 'test-visible-meld-' + activeSeats.join(''));
}

describe('Visible Meld Security Tests', () => {

  it('1. 自己的副露在 PlayerVisibleView.self.melds 中完整可见', () => {
    const state = buildState([0, 1]);
    const player0 = state.players.find(p => p.seat === 0)!;
    const chiMeld: Meld = {
      type: 'chi',
      tiles: [makeTile('wan', 3, 'c1'), makeTile('wan', 4, 'c2'), makeTile('wan', 5, 'c3')],
      exposed: true,
    };
    player0.melds = [chiMeld];
    (player0 as any).hasOpenedDoor = true;

    const view = buildPlayerVisibleView({
      roomId: 'test-vis-1',
      state,
      seat: 0,
      connectionStatus: mockConnectionStatus,
      aiSeats: [],
    });

    expect(view.self.melds).toHaveLength(1);
    expect(view.self.melds[0].type).toBe('chi');
    expect(view.self.melds[0].tiles).toHaveLength(3);
  });

  it('2. 对手公开副露在 opponent.melds 中可见', () => {
    const state = buildState([0, 1]);
    const player1 = state.players.find(p => p.seat === 1)!;
    const pengMeld: Meld = {
      type: 'peng',
      tiles: [makeTile('tong', 5, 'p1'), makeTile('tong', 5, 'p2'), makeTile('tong', 5, 'p3')],
      exposed: true,
    };
    player1.melds = [pengMeld];

    const view = buildPlayerVisibleView({
      roomId: 'test-vis-2',
      state,
      seat: 0,
      connectionStatus: mockConnectionStatus,
      aiSeats: [],
    });

    const opp = view.opponents.find(o => o.seat === 1);
    expect(opp).toBeDefined();
    expect(opp!.melds).toHaveLength(1);
    expect(opp!.melds[0].type).toBe('peng');
  });

  it('3. 对局中对手暗手牌在 PlayerVisibleView 中不可见', () => {
    const state = buildState([0, 1]);
    state.phase = 'playing';
    state.roundEnded = false;

    const view = buildPlayerVisibleView({
      roomId: 'test-vis-3',
      state,
      seat: 0,
      connectionStatus: mockConnectionStatus,
      aiSeats: [],
    });

    const opp = view.opponents.find(o => o.seat === 1);
    expect(opp).toBeDefined();
    expect(opp!.hand).toBeUndefined();
  });

  it('4. 副露数据中不包含牌墙信息（不泄露牌墙）', () => {
    const state = buildState([0, 1]);
    const player0 = state.players.find(p => p.seat === 0)!;
    player0.melds = [{
      type: 'anGang',
      tiles: [makeTile('tiao', 1, 'ag1'), makeTile('tiao', 1, 'ag2'), makeTile('tiao', 1, 'ag3'), makeTile('tiao', 1, 'ag4')],
      exposed: false,
    }];

    const view = buildPlayerVisibleView({
      roomId: 'test-vis-4',
      state,
      seat: 0,
      connectionStatus: mockConnectionStatus,
      aiSeats: [],
    });

    expect((view as any).wall).toBeUndefined();
  });

  it('5. inactive seat 不出现在 opponents 列表中（2 人局 seat2/3 不在列表）', () => {
    const state = buildState([0, 1]);

    const view = buildPlayerVisibleView({
      roomId: 'test-vis-5',
      state,
      seat: 0,
      connectionStatus: mockConnectionStatus,
      aiSeats: [],
    });

    const inactiveSeats = view.opponents.filter(o => o.seat === 2 || o.seat === 3);
    expect(inactiveSeats).toHaveLength(0);
  });
});
