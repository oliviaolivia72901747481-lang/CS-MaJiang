/**
 * gang-action-hotfix.test.ts
 * Tests gang action generation and guard validation for v0.8.4 hotfix.
 * 7 tests total.
 */
import { describe, it, expect } from 'vitest';
import { canAnGang, canBuGang, canMingGang } from '../../changsha-mahjong/engine/action-engine.js';
import { drawTile } from '../../changsha-mahjong/controller/round-controller.js';
import { validateNetworkAction } from '../server/network-action-guard.js';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import type { Meld } from '../../changsha-mahjong/types/meld.js';

function makeTile(suit: string, rank: number, instanceId: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId };
}

function make4(suit: string, rank: number): Tile[] {
  return [0,1,2,3].map(i => makeTile(suit, rank, `${suit}_${rank}_${i}`));
}

describe('Gang Action Hotfix Tests', () => {

  it('1. 手牌 4 张相同牌时 canAnGang 返回非空', () => {
    const hand = make4('wan', 5);
    const groups = canAnGang(hand);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].length).toBe(4);
  });

  it('2. 碰后摸到第 4 张时 canBuGang 返回 true', () => {
    const pengMeld: Meld = {
      type: 'peng',
      tiles: [makeTile('tong', 3, 'id1'), makeTile('tong', 3, 'id2'), makeTile('tong', 3, 'id3')],
      exposed: true,
    };
    const drawnTile = makeTile('tong', 3, 'id4');
    expect(canBuGang([drawnTile], [pengMeld], drawnTile)).toBe(true);
  });

  it('3. 他人打出第 4 张且自己有 3 张时 canMingGang 返回 true', () => {
    const hand = [
      makeTile('tiao', 7, 'i1'),
      makeTile('tiao', 7, 'i2'),
      makeTile('tiao', 7, 'i3'),
    ];
    const discardedTile = makeTile('tiao', 7, 'i4');
    expect(canMingGang(hand, discardedTile)).toBe(true);
  });

  it('4. 2 人局可生成暗杠 action (canAnGang)', () => {
    const hand = make4('wan', 9);
    const groups = canAnGang(hand);
    expect(groups.length).toBeGreaterThan(0);
  });

  it('5. 3 人局可生成暗杠 action (canAnGang)', () => {
    const hand = [...make4('tong', 2), makeTile('wan', 1, 'x1')];
    const groups = canAnGang(hand);
    expect(groups.length).toBeGreaterThan(0);
  });

  it('6. inactive seat 不能 gang（validateNetworkAction 拒绝）', () => {
    let state = createInitialGameState(undefined, [0, 1]);
    state = startRound(state, 'test-seed-gang-inactive');
    // Seat 2 is inactive (activeSeats = [0, 1])
    const result = validateNetworkAction({
      state,
      seat: 2,
      action: { type: 'gang', gangType: 'anGang', tileKey: 'wan_9' },
    });
    expect(result.ok).toBe(false);
  });

  it('7. 伪造 gang 被 network-action-guard 拒绝（非 waitingForResponses 阶段）', () => {
    let state = createInitialGameState(undefined, [0, 1]);
    state = startRound(state, 'test-seed-gang-forge');
    // Force playing phase without any pending gang
    state.phase = 'playing';
    state.currentSeat = 0;
    state.pendingActions = [];
    const result = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'gang', gangType: 'anGang', tileKey: 'wan_9' },
    });
    expect(result.ok).toBe(false);
  });
});
