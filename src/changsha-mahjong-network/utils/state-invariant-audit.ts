import { createChangshaTiles, tileKey } from '../../changsha-mahjong/engine/tile-engine.js';
import type { GamePhase, GameState } from '../../changsha-mahjong/types/game.js';
import type { Meld, MeldType } from '../../changsha-mahjong/types/meld.js';
import type { Player } from '../../changsha-mahjong/types/player.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import type { PlayerVisibleView } from '../server/network-types.js';

export type InvariantViolation = {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  context?: Record<string, unknown>;
};

export type InvariantAuditResult = {
  ok: boolean;
  violations: InvariantViolation[];
};

type Seat = 0 | 1 | 2 | 3;

const GANG_TYPES = new Set<MeldType>(['mingGang', 'anGang', 'buGang']);

function result(violations: InvariantViolation[]): InvariantAuditResult {
  return {
    ok: violations.every(v => v.severity !== 'error'),
    violations,
  };
}

function error(code: string, message: string, context?: Record<string, unknown>): InvariantViolation {
  return { code, message, severity: 'error', context };
}

function warning(code: string, message: string, context?: Record<string, unknown>): InvariantViolation {
  return { code, message, severity: 'warning', context };
}

function seatKey(seat: number): Seat {
  return seat as Seat;
}

function allActiveSeats(state: GameState): Seat[] {
  return (state.activeSeats || [0, 1, 2, 3]) as Seat[];
}

function isTile(value: Tile | undefined | null): value is Tile {
  return !!value && typeof value.suit === 'string' && typeof value.rank === 'number' && typeof value.instanceId === 'string';
}

function sameTile(a: Tile, b: Tile): boolean {
  return a.instanceId === b.instanceId;
}

function collectPhysicalTiles(state: GameState): Tile[] {
  const tiles: Tile[] = [];
  for (const player of state.players) {
    tiles.push(...player.hand);
    for (const meld of player.melds) {
      tiles.push(...meld.tiles);
    }
  }
  for (const seat of [0, 1, 2, 3] as Seat[]) {
    tiles.push(...(state.discards[seat] || []));
  }
  tiles.push(...state.wall);
  return tiles;
}

function initialTileMultiplicity(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tile of createChangshaTiles()) {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function getPlayerKongCount(player: Player): number {
  return player.melds.filter(meld => GANG_TYPES.has(meld.type)).length;
}

export function getPlayerPhysicalTileCount(player: Player): number {
  return player.hand.length + player.melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
}

export function expectedPlayerTileCount(player: Player, phase: GamePhase | string, currentSeat: Seat): number {
  const base = phase === 'playing' && player.seat === currentSeat ? 14 : 13;
  return base + getPlayerKongCount(player);
}

function expectedPlayerTileCountForState(state: GameState, player: Player): number | undefined {
  if (state.roundEnded || state.phase === 'ended' || state.phase === 'settlement' || state.phase === 'draw') {
    return undefined;
  }

  const kongCount = getPlayerKongCount(player);

  if (state.phase === 'playing' || state.phase === 'gangReplacement') {
    return (player.seat === state.currentSeat ? 14 : 13) + kongCount;
  }

  if (state.phase === 'waitingForResponses') {
    const hasSelfAction = state.pendingActions.some(
      action =>
        action.seat === player.seat &&
        action.seat === state.currentSeat &&
        (action.type === 'ziMo' || action.type === 'anGang' || action.type === 'buGang')
    );
    const latestDiscardStillInRiver =
      !!state.lastDiscard &&
      (state.discards[state.lastDiscard.fromSeat] || []).some(tile => sameTile(tile, state.lastDiscard!.tile));

    if (player.seat === state.currentSeat && (hasSelfAction || (state.lastDiscard && !latestDiscardStillInRiver))) {
      return 14 + kongCount;
    }

    return 13 + kongCount;
  }

  if (state.phase === 'dealing' || state.phase === 'startingHu') {
    return (player.seat === state.dealerSeat ? 14 : 13) + kongCount;
  }

  return undefined;
}

export function auditPlayerTileCounts(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];

  for (const player of state.players) {
    const expected = expectedPlayerTileCountForState(state, player);
    if (expected === undefined) continue;

    const actual = getPlayerPhysicalTileCount(player);
    if (actual !== expected) {
      violations.push(
        error('PLAYER_TILE_COUNT_MISMATCH', 'Player physical tile count does not match the phase formula.', {
          seat: player.seat,
          phase: state.phase,
          currentSeat: state.currentSeat,
          actual,
          expected,
          kongCount: getPlayerKongCount(player),
        })
      );
    }
  }

  return result(violations);
}

function allSameKey(tiles: Tile[]): boolean {
  if (tiles.length === 0) return false;
  const first = tileKey(tiles[0]);
  return tiles.every(tile => tileKey(tile) === first);
}

function isChiShape(tiles: Tile[]): boolean {
  if (tiles.length !== 3) return false;
  if (!tiles.every(tile => tile.suit === tiles[0].suit)) return false;
  const ranks = tiles.map(tile => tile.rank).sort((a, b) => a - b);
  return ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2];
}

function auditMeldShape(meld: Meld, context: Record<string, unknown>): InvariantViolation | null {
  if (!meld.tiles || meld.tiles.length === 0) {
    return error('MELD_SHAPE_INVALID', 'Meld must contain tiles.', context);
  }

  if (!meld.tiles.every(isTile)) {
    return error('MELD_SHAPE_INVALID', 'Meld contains an invalid tile.', context);
  }

  if (meld.type === 'chi' && !isChiShape(meld.tiles)) {
    return error('MELD_SHAPE_INVALID', 'Chi meld must be a same-suit consecutive sequence of three tiles.', context);
  }

  if (meld.type === 'peng' && (meld.tiles.length !== 3 || !allSameKey(meld.tiles))) {
    return error('MELD_SHAPE_INVALID', 'Peng meld must be three identical tile faces.', context);
  }

  if (GANG_TYPES.has(meld.type) && (meld.tiles.length !== 4 || !allSameKey(meld.tiles))) {
    return error('MELD_SHAPE_INVALID', 'Gang meld must be four identical tile faces.', context);
  }

  return null;
}

export function auditMeldConsistency(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];

  for (const player of state.players) {
    player.melds.forEach((meld, meldIndex) => {
      const shapeViolation = auditMeldShape(meld, { seat: player.seat, meldIndex, meldType: meld.type });
      if (shapeViolation) {
        violations.push(shapeViolation);
      }
    });
  }

  return result(violations);
}

export function auditDiscardRiverConsistency(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];

  for (const seat of [0, 1, 2, 3] as Seat[]) {
    const river = state.discards[seat] || [];
    if (river.some(tile => !isTile(tile))) {
      violations.push(error('DISCARD_RIVER_INVALID_TILE', 'Discard river contains an invalid tile.', { seat }));
    }

    const player = state.players.find(p => p.seat === seat);
    if (player) {
      const riverIds = river.map(tile => tile.instanceId).join('|');
      const playerRiverIds = player.discards.map(tile => tile.instanceId).join('|');
      if (riverIds !== playerRiverIds) {
        violations.push(
          error('DISCARD_RIVER_MIRROR_MISMATCH', 'Global discard river and player discard mirror differ.', {
            seat,
            stateDiscardCount: river.length,
            playerDiscardCount: player.discards.length,
          })
        );
      }
    }
  }

  if (state.lastDiscard) {
    const latestRiver = state.discards[state.lastDiscard.fromSeat] || [];
    const latestStillInRiver = latestRiver.some(tile => sameTile(tile, state.lastDiscard!.tile));
    const isQiangGangPointer =
      state.pendingActions.some(action => action.type === 'hu' && !!action.options) &&
      state.lastDiscard.fromSeat === state.currentSeat;

    if (!latestStillInRiver && !isQiangGangPointer) {
      violations.push(
        error('LATEST_DISCARD_NOT_IN_RIVER', 'lastDiscard points to a tile that is not in the source discard river.', {
          fromSeat: state.lastDiscard.fromSeat,
          tile: tileKey(state.lastDiscard.tile),
          instanceId: state.lastDiscard.tile.instanceId,
        })
      );
    }
  }

  for (const player of state.players) {
    for (const meld of player.melds) {
      if (!meld.fromPlayerId) continue;
      const fromPlayer = state.players.find(p => p.id === meld.fromPlayerId);
      if (!fromPlayer) continue;
      const sourceRiver = state.discards[fromPlayer.seat] || [];
      for (const meldTile of meld.tiles) {
        if (sourceRiver.some(discard => sameTile(discard, meldTile))) {
          violations.push(
            error('CLAIMED_TILE_STILL_IN_DISCARD', 'A claimed meld tile is still present in the source discard river.', {
              claimantSeat: player.seat,
              sourceSeat: fromPlayer.seat,
              meldType: meld.type,
              instanceId: meldTile.instanceId,
            })
          );
        }
      }
    }
  }

  return result(violations);
}

export function auditTurnPhaseConsistency(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];
  const activeSeats = allActiveSeats(state);

  if (!activeSeats.includes(state.currentSeat)) {
    violations.push(
      error('CURRENT_PLAYER_INACTIVE', 'Current player must be one of the active seats.', {
        currentSeat: state.currentSeat,
        activeSeats,
      })
    );
  }

  if (state.phase === 'waitingForResponses') {
    const responseFromDiscard = state.pendingActions.some(action =>
      action.type === 'hu' || action.type === 'peng' || action.type === 'chi' || action.type === 'mingGang'
    );
    if (responseFromDiscard && !state.lastDiscard) {
      violations.push(
        error('PENDING_ACTION_SOURCE_MISSING', 'Response pending actions require a source discard pointer.', {
          pendingActionTypes: state.pendingActions.map(action => action.type),
        })
      );
    }
  }

  return result(violations);
}

export function auditWallCountConsistency(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];

  if (state.wall.length < 0) {
    violations.push(error('WALL_COUNT_NEGATIVE', 'Wall count cannot be negative.', { wallLength: state.wall.length }));
  }

  return result(violations);
}

export function auditTileUniverseConsistency(state: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];
  const baseline = createChangshaTiles();
  const expectedTotal = baseline.length;
  const actualTiles = collectPhysicalTiles(state);

  if (actualTiles.length !== expectedTotal) {
    violations.push(
      error('TOTAL_TILE_COUNT_MISMATCH', 'Total physical tile count does not match the generated Changsha tile set.', {
        actual: actualTiles.length,
        expected: expectedTotal,
      })
    );
  }

  const expectedMultiplicity = initialTileMultiplicity();
  const actualMultiplicity = new Map<string, number>();
  for (const tile of actualTiles) {
    const key = tileKey(tile);
    actualMultiplicity.set(key, (actualMultiplicity.get(key) || 0) + 1);
  }

  for (const [key, actual] of actualMultiplicity) {
    const expected = expectedMultiplicity.get(key) || 0;
    if (actual > expected) {
      violations.push(
        error('TILE_MULTIPLICITY_EXCEEDED', 'A tile face appears more often than the generated tile set allows.', {
          tileKey: key,
          actual,
          expected,
        })
      );
    }
  }

  return result(violations);
}

export function auditGameStateInvariants(state: GameState): InvariantAuditResult {
  const violations = [
    ...auditTileUniverseConsistency(state).violations,
    ...auditPlayerTileCounts(state).violations,
    ...auditMeldConsistency(state).violations,
    ...auditDiscardRiverConsistency(state).violations,
    ...auditTurnPhaseConsistency(state).violations,
    ...auditWallCountConsistency(state).violations,
  ];

  return result(violations);
}

function visibleTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

function visibleAnGangLeaksCompleteFace(meld: Meld, sourceMeld?: Meld): boolean {
  if (meld.type !== 'anGang') return false;
  if (meld.tiles.length !== 4) return true;

  const hiddenFlags = meld.tiles.map(tile => (tile as Tile & { hidden?: boolean }).hidden === true);
  if (hiddenFlags.every(Boolean)) return false;

  if (sourceMeld) {
    const sourceIds = new Set(sourceMeld.tiles.map(tile => tile.instanceId));
    const visibleIds = meld.tiles.filter(tile => sourceIds.has(tile.instanceId)).length;
    if (visibleIds === sourceMeld.tiles.length) return true;
  }

  return allSameKey(meld.tiles) && new Set(meld.tiles.map(visibleTileKey)).size === 1;
}

export function auditVisibleViewInvariants(view: PlayerVisibleView, state?: GameState): InvariantAuditResult {
  const violations: InvariantViolation[] = [];
  const isEnded = view.phase === 'ended' || !!view.settlement;

  if (state && view.wallRemainingCount !== state.wall.length) {
    violations.push(
      error('VISIBLE_WALL_COUNT_MISMATCH', 'Visible wall count does not match server wall length.', {
        visible: view.wallRemainingCount,
        actual: state.wall.length,
      })
    );
  }

  for (const opponent of view.opponents) {
    if (!isEnded && opponent.hand !== undefined) {
      violations.push(
        error('VISIBLE_VIEW_LEAKS_HIDDEN_TILE', 'Opponent hand is present in a non-ended visible view.', {
          viewerSeat: view.seat,
          opponentSeat: opponent.seat,
        })
      );
    }

    opponent.melds.forEach((meld, meldIndex) => {
      const sourceMeld = state?.players
        .find(player => player.seat === opponent.seat)
        ?.melds[meldIndex];
      if (!isEnded && visibleAnGangLeaksCompleteFace(meld, sourceMeld)) {
        violations.push(
          error('VISIBLE_VIEW_LEAKS_HIDDEN_TILE', 'Opponent anGang meld exposes complete hidden tile faces.', {
            viewerSeat: view.seat,
            opponentSeat: opponent.seat,
            meldIndex,
          })
        );
      }
    });
  }

  if ((view as unknown as { wall?: unknown }).wall !== undefined) {
    violations.push(warning('VISIBLE_VIEW_CONTAINS_WALL_OBJECT', 'Visible view should not include wall contents.'));
  }

  return result(violations);
}
