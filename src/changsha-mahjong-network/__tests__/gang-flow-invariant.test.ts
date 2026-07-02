import { describe, expect, it } from 'vitest';
import { resolvePendingActions } from '../../changsha-mahjong/controller/action-resolver.js';
import { createInitialGameState, startRound, stepGame } from '../../changsha-mahjong/controller/game-engine.js';
import { discardTile } from '../../changsha-mahjong/controller/round-controller.js';
import { tileKey } from '../../changsha-mahjong/engine/tile-engine.js';
import type { GameState, PendingAction } from '../../changsha-mahjong/types/game.js';
import type { Player } from '../../changsha-mahjong/types/player.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import {
  auditGameStateInvariants,
  auditVisibleViewInvariants,
  getPlayerKongCount,
  getPlayerPhysicalTileCount,
} from '../utils/state-invariant-audit.js';

type Seat = 0 | 1 | 2 | 3;

function getPlayer(state: GameState, seat: Seat): Player {
  const player = state.players.find(p => p.seat === seat);
  if (!player) throw new Error(`Missing player at seat ${seat}`);
  return player;
}

function matchingTileCount(player: Player, key: string): number {
  return player.hand.filter(tile => tileKey(tile) === key).length;
}

function swapTileFromSource(
  state: GameState,
  key: string,
  targetSeat: Seat,
  replacement: Tile,
  excludedIds = new Set<string>()
): Tile {
  const wallIndex = state.wall.findIndex(tile => tileKey(tile) === key && !excludedIds.has(tile.instanceId));
  if (wallIndex !== -1) {
    const tile = state.wall[wallIndex];
    state.wall[wallIndex] = replacement;
    return tile;
  }

  for (const player of state.players) {
    if (player.seat === targetSeat) continue;
    const index = player.hand.findIndex(tile => tileKey(tile) === key && !excludedIds.has(tile.instanceId));
    if (index !== -1) {
      const tile = player.hand[index];
      player.hand[index] = replacement;
      return tile;
    }
  }

  throw new Error(`Unable to find source tile ${key}`);
}

function moveTilesToHand(state: GameState, targetSeat: Seat, key: string, count: number, excludedIds = new Set<string>()): Tile[] {
  const target = getPlayer(state, targetSeat);
  const existing = target.hand.filter(tile => tileKey(tile) === key && !excludedIds.has(tile.instanceId));
  const needed = Math.max(0, count - existing.length);
  const moved: Tile[] = [];

  for (let i = 0; i < needed; i++) {
    const replacementIndex = target.hand.findIndex(tile => tileKey(tile) !== key);
    if (replacementIndex === -1) throw new Error(`No replaceable tile in seat ${targetSeat} hand`);
    const [replacement] = target.hand.splice(replacementIndex, 1);
    const tile = swapTileFromSource(state, key, targetSeat, replacement, excludedIds);
    target.hand.push(tile);
    moved.push(tile);
  }

  return [...existing, ...moved].slice(0, count);
}

function prepareDiscard(state: GameState, seat: Seat): Tile {
  state.phase = 'playing';
  state.currentSeat = seat;
  state.pendingActions = [];
  return getPlayer(state, seat).hand[0];
}

function resolveAction(state: GameState, seat: Seat, type: PendingAction['type']): GameState {
  const action = state.pendingActions.find(pending => pending.seat === seat && pending.type === type);
  if (!action) throw new Error(`Missing ${type} action for seat ${seat}`);
  return resolvePendingActions(state, [action]);
}

function expectNoErrorViolations(state: GameState): void {
  const audit = auditGameStateInvariants(state);
  expect(audit.violations.filter(v => v.severity === 'error')).toEqual([]);
}

function advanceReplacementDraw(state: GameState): GameState {
  expect(state.phase).toBe('gangReplacement');
  return stepGame(state);
}

describe('gang and claim flow invariants', () => {
  it('keeps state conserved when a chi claim removes the source discard and requires the claimer to discard', () => {
    let state = startRound(createInitialGameState(), 'flow-chi');
    const discard = prepareDiscard(state, 0);
    const optionRanks = discard.rank >= 3
      ? [discard.rank - 2, discard.rank - 1]
      : [discard.rank + 1, discard.rank + 2];
    const option = optionRanks.map(rank =>
      moveTilesToHand(state, 1, `${discard.suit}_${rank}`, 1, new Set([discard.instanceId]))[0]
    );
    const claimerHandBefore = getPlayer(state, 1).hand.length;

    state = discardTile(state, 0, discard);
    const chi = state.pendingActions.find(action => action.seat === 1 && action.type === 'chi');
    expect(chi).toBeDefined();
    chi!.options = [option];
    state = resolvePendingActions(state, [chi!]);

    const claimer = getPlayer(state, 1);
    expect(state.discards[0].some(tile => tile.instanceId === discard.instanceId)).toBe(false);
    expect(claimer.hand.length).toBe(claimerHandBefore - 2);
    expect(claimer.melds.at(-1)?.type).toBe('chi');
    expect(claimer.melds.at(-1)?.tiles).toHaveLength(3);
    expect(state.currentSeat).toBe(1);
    expect(state.phase).toBe('playing');
    expectNoErrorViolations(state);
  });

  it('keeps state conserved when a peng claim removes the source discard and requires the claimer to discard', () => {
    let state = startRound(createInitialGameState(), 'flow-peng');
    const discard = prepareDiscard(state, 0);
    const key = tileKey(discard);
    moveTilesToHand(state, 2, key, 2, new Set([discard.instanceId]));
    const claimerHandBefore = getPlayer(state, 2).hand.length;

    state = discardTile(state, 0, discard);
    state = resolveAction(state, 2, 'peng');

    const claimer = getPlayer(state, 2);
    expect(state.discards[0].some(tile => tile.instanceId === discard.instanceId)).toBe(false);
    expect(claimer.hand.length).toBe(claimerHandBefore - 2);
    expect(claimer.melds.at(-1)?.type).toBe('peng');
    expect(claimer.melds.at(-1)?.tiles).toHaveLength(3);
    expect(state.currentSeat).toBe(2);
    expect(state.phase).toBe('playing');
    expectNoErrorViolations(state);
  });

  it('keeps state conserved through mingGang, replacement draw, and required discard', () => {
    let state = startRound(createInitialGameState(), 'flow-ming-gang');
    const discard = prepareDiscard(state, 0);
    const key = tileKey(discard);
    moveTilesToHand(state, 1, key, 3, new Set([discard.instanceId]));
    const wallBeforeGang = state.wall.length;

    state = discardTile(state, 0, discard);
    state = resolveAction(state, 1, 'mingGang');

    const afterGang = getPlayer(state, 1);
    expect(state.discards[0].some(tile => tile.instanceId === discard.instanceId)).toBe(false);
    expect(afterGang.melds.at(-1)?.type).toBe('mingGang');
    expect(afterGang.melds.at(-1)?.tiles).toHaveLength(4);

    state = advanceReplacementDraw(state);
    expect(state.wall.length).toBe(wallBeforeGang - 1);
    expect(state.currentSeat).toBe(1);
    expect(state.phase).toBe('playing');
    expect(getPlayerPhysicalTileCount(afterGang)).toBe(14 + getPlayerKongCount(afterGang));
    expectNoErrorViolations(state);

    const discardAfterGang = getPlayer(state, 1).hand.at(-1)!;
    state = discardTile(state, 1, discardAfterGang);
    expect(getPlayerPhysicalTileCount(getPlayer(state, 1))).toBe(13 + getPlayerKongCount(getPlayer(state, 1)));
    expectNoErrorViolations(state);
  });

  it('keeps state conserved through anGang, replacement draw, and visible-view privacy audit', () => {
    let state = startRound(createInitialGameState(), 'flow-an-gang');
    const key = tileKey(getPlayer(state, 0).hand[0]);
    const option = moveTilesToHand(state, 0, key, 4);
    const wallBeforeGang = state.wall.length;
    state.phase = 'waitingForResponses';
    state.currentSeat = 0;
    state.pendingActions = [{ seat: 0, type: 'anGang', priority: 3, options: [option] }];

    state = resolveAction(state, 0, 'anGang');
    expect(getPlayer(state, 0).melds.at(-1)?.type).toBe('anGang');
    expect(getPlayer(state, 0).melds.at(-1)?.tiles).toHaveLength(4);

    state = advanceReplacementDraw(state);
    expect(state.wall.length).toBe(wallBeforeGang - 1);
    expect(state.currentSeat).toBe(0);
    expect(state.phase).toBe('playing');
    expect(getPlayerPhysicalTileCount(getPlayer(state, 0))).toBe(14 + getPlayerKongCount(getPlayer(state, 0)));
    expectNoErrorViolations(state);

    const ownView = buildPlayerVisibleView({
      roomId: 'flow-an-gang-own',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });
    const opponentView = buildPlayerVisibleView({
      roomId: 'flow-an-gang-opponent',
      state,
      seat: 1,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    expect(ownView.self.melds.at(-1)?.tiles).toHaveLength(4);
    expect(auditVisibleViewInvariants(opponentView, state).violations.map(v => v.code)).not.toContain(
      'VISIBLE_VIEW_LEAKS_HIDDEN_TILE'
    );
  });

  it('upgrades an existing peng meld for buGang without creating a duplicate meld', () => {
    let state = startRound(createInitialGameState(), 'flow-bu-gang');
    const discard = prepareDiscard(state, 0);
    const key = tileKey(discard);
    moveTilesToHand(state, 1, key, 2, new Set([discard.instanceId]));

    state = discardTile(state, 0, discard);
    state = resolveAction(state, 1, 'peng');
    const player = getPlayer(state, 1);
    const pengMeldCount = player.melds.length;

    const [buGangTile] = moveTilesToHand(state, 1, key, matchingTileCount(player, key) + 1);
    const wallBeforeGang = state.wall.length;
    state.phase = 'waitingForResponses';
    state.currentSeat = 1;
    state.pendingActions = [{ seat: 1, type: 'buGang', priority: 3, tile: buGangTile }];

    state = resolveAction(state, 1, 'buGang');
    const afterBuGang = getPlayer(state, 1);
    expect(afterBuGang.melds).toHaveLength(pengMeldCount);
    expect(afterBuGang.melds.at(-1)?.type).toBe('buGang');
    expect(afterBuGang.melds.at(-1)?.tiles).toHaveLength(4);

    state = advanceReplacementDraw(state);
    expect(state.wall.length).toBe(wallBeforeGang - 1);
    expect(state.currentSeat).toBe(1);
    expect(state.phase).toBe('playing');
    expect(getPlayerPhysicalTileCount(getPlayer(state, 1))).toBe(14 + getPlayerKongCount(getPlayer(state, 1)));
    expectNoErrorViolations(state);
  });
});
