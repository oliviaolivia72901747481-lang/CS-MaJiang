import { describe, expect, it, beforeEach, vi } from 'vitest';
import { resolvePendingActions } from '../../changsha-mahjong/controller/action-resolver.js';
import { startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { tileKey } from '../../changsha-mahjong/engine/tile-engine.js';
import type { GameState, PendingAction } from '../../changsha-mahjong/types/game.js';
import type { Player } from '../../changsha-mahjong/types/player.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import { auditGameStateInvariants } from '../utils/state-invariant-audit.js';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';
import { stepAIIfNeeded } from '../server/ai-seat-runner.js';
import { clearAllDedupeCache } from '../server/action-dedupe.js';

type Seat = 0 | 1 | 2 | 3;

function getPlayer(state: GameState, seat: Seat): Player {
  const player = state.players.find(p => p.seat === seat);
  if (!player) throw new Error(`Missing player ${seat}`);
  return player;
}

function swapTileFromSource(state: GameState, key: string, targetSeat: Seat, replacement: Tile): Tile {
  const wallIndex = state.wall.findIndex(tile => tileKey(tile) === key);
  if (wallIndex !== -1) {
    const tile = state.wall[wallIndex];
    state.wall[wallIndex] = replacement;
    return tile;
  }

  for (const player of state.players) {
    if (player.seat === targetSeat) continue;
    const index = player.hand.findIndex(tile => tileKey(tile) === key);
    if (index !== -1) {
      const tile = player.hand[index];
      player.hand[index] = replacement;
      return tile;
    }
  }

  throw new Error(`Unable to find ${key}`);
}

function moveTilesToHand(state: GameState, targetSeat: Seat, key: string, count: number): Tile[] {
  const target = getPlayer(state, targetSeat);
  const existing = target.hand.filter(tile => tileKey(tile) === key);
  const needed = Math.max(0, count - existing.length);
  const moved: Tile[] = [];

  for (let i = 0; i < needed; i++) {
    const replacementIndex = target.hand.findIndex(tile => tileKey(tile) !== key);
    if (replacementIndex === -1) throw new Error('No replacement tile available');
    const [replacement] = target.hand.splice(replacementIndex, 1);
    const tile = swapTileFromSource(state, key, targetSeat, replacement);
    target.hand.push(tile);
    moved.push(tile);
  }

  return [...existing, ...moved].slice(0, count);
}

function errorCodes(state: GameState): string[] {
  return auditGameStateInvariants(state).violations.filter(v => v.severity === 'error').map(v => v.code);
}

describe('network stability playtest regressions', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllDedupeCache();
    vi.unstubAllEnvs();
  });

  it('duplicate discard with same actionId is reported as duplicate and changes state only once', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId);
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    session.state.pendingActions = [];

    const tile = session.state.players[0].hand[0];
    const first = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: tile.instanceId, actionId: 'dup-discard', stateVersion: session.stateVersion },
    });
    const duplicate = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: tile.instanceId, actionId: 'dup-discard', stateVersion: session.stateVersion },
    });

    expect(first.success).toBe(true);
    expect(duplicate.success).toBe(true);
    expect(duplicate.ignored).toBe(true);
    expect(duplicate.errorCode).toBe('DUPLICATE_ACTION');
    expect(session.duplicateActionCount).toBe(1);
    expect(session.state.discards[0].filter(discard => discard.instanceId === tile.instanceId)).toHaveLength(1);
    expect(errorCodes(session.state)).toEqual([]);
  });

  it('duplicate anGang request only records one pending choice and only draws one replacement tile', async () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId);
    const key = tileKey(session.state.players[0].hand[0]);
    const option = moveTilesToHand(session.state, 0, key, 4);
    session.state.phase = 'waitingForResponses';
    session.state.currentSeat = 0;
    session.state.pendingActions = [{ seat: 0, type: 'anGang', priority: 3, options: [option] }];
    const wallBefore = session.state.wall.length;
    const versionBefore = session.stateVersion;

    const first = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'gang', gangType: 'anGang', tileKey: key, actionId: 'dup-gang', stateVersion: versionBefore },
    });
    const duplicate = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'gang', gangType: 'anGang', tileKey: key, actionId: 'dup-gang', stateVersion: versionBefore },
    });

    expect(first.success).toBe(true);
    expect(duplicate.success).toBe(true);
    expect(duplicate.errorCode).toBe('DUPLICATE_ACTION');
    expect(Object.keys((session as any).submittedActions)).toEqual(['0']);

    await stepAIIfNeeded(room.roomId);

    expect(getPlayer(session.state, 0).melds.filter(meld => meld.type === 'anGang')).toHaveLength(1);
    expect(session.state.wall.length).toBe(wallBefore - 1);
    expect(errorCodes(session.state)).toEqual([]);
  });

  it('pass does not resolve the response window before another higher-priority player acts', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    const session = startOnlineRound(room.roomId);
    const sourceTile = session.state.players[0].hand[0];
    session.state.players[0].hand = session.state.players[0].hand.filter(tile => tile.instanceId !== sourceTile.instanceId);
    session.state.phase = 'waitingForResponses';
    session.state.lastDiscard = { fromSeat: 0, tile: sourceTile };
    session.state.discards[0] = [sourceTile];
    session.state.players[0].discards = [sourceTile];
    session.state.pendingActions = [
      { seat: 1, type: 'pass', priority: 0 },
      { seat: 2, type: 'peng', priority: 2, tile: sourceTile },
      { seat: 2, type: 'pass', priority: 0 },
    ];
    moveTilesToHand(session.state, 2, tileKey(sourceTile), 2);

    const pass = submitPlayerAction({
      roomId: room.roomId,
      seat: 1,
      action: { type: 'pass', actionId: 'pass-wait', stateVersion: session.stateVersion },
    });
    expect(pass.success).toBe(true);
    expect(session.state.phase).toBe('waitingForResponses');
    expect(session.state.pendingActions.some(action => action.seat === 2 && action.type === 'peng')).toBe(true);

    const pengAction = session.state.pendingActions.find(action => action.seat === 2 && action.type === 'peng')!;
    session.state = resolvePendingActions(session.state, [(session as any).submittedActions[1] as PendingAction, pengAction]);
    expect(getPlayer(session.state, 2).melds.at(-1)?.type).toBe('peng');
    expect(errorCodes(session.state)).toEqual([]);
  });

  it('dev-mode state audit logs structured violations after successful state changes', () => {
    vi.stubEnv('ENABLE_STATE_AUDIT', '1');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId);
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    session.state.pendingActions = [];
    session.state.players[0].hand.push({ ...session.state.players[0].hand[0], instanceId: 'audit-duplicate' });

    const tile = session.state.players[0].hand[0];
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: tile.instanceId, actionId: 'audit-discard', stateVersion: session.stateVersion },
    });

    expect(res.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[StateInvariantViolation]',
      expect.arrayContaining([expect.objectContaining({ code: 'TOTAL_TILE_COUNT_MISMATCH' })])
    );

    consoleSpy.mockRestore();
  });
});
