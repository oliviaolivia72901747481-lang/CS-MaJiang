import { describe, expect, it } from 'vitest';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { createChangshaTiles } from '../../changsha-mahjong/engine/tile-engine.js';
import type { Meld } from '../../changsha-mahjong/types/meld.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import {
  auditGameStateInvariants,
  auditVisibleViewInvariants,
  expectedPlayerTileCount,
  getPlayerKongCount,
  getPlayerPhysicalTileCount,
} from '../utils/state-invariant-audit.js';

function makeTile(suit: Tile['suit'], rank: Tile['rank'], instanceId: string): Tile {
  return { suit, rank, instanceId };
}

function violationCodes(result: { violations: Array<{ code: string }> }): string[] {
  return result.violations.map(v => v.code);
}

describe('state-invariant-audit', () => {
  it('passes a started round with conserved initial tile count and active current player', () => {
    const state = startRound(createInitialGameState(), 'state-audit-initial');

    const result = auditGameStateInvariants(state);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('derives initial tile count from the Changsha tile generator', () => {
    const state = startRound(createInitialGameState(), 'state-audit-generator-source');

    const physicalTiles =
      state.players.reduce(
        (sum, player) =>
          sum +
          player.hand.length +
          player.melds.reduce((meldSum, meld) => meldSum + meld.tiles.length, 0) +
          player.discards.length,
        0
      ) + state.wall.length;

    expect(physicalTiles).toBe(createChangshaTiles().length);
  });

  it('reports structured violations for impossible total count, multiplicity, and latest discard pointer', () => {
    const state = startRound(createInitialGameState(), 'state-audit-corrupt');
    const duplicate = { ...state.players[0].hand[0], instanceId: 'impossible-duplicate' };

    state.players[0].hand.push(duplicate);
    state.lastDiscard = {
      fromSeat: 1,
      tile: makeTile('wan', 9, 'missing-latest-discard'),
    };

    const result = auditGameStateInvariants(state);

    expect(result.ok).toBe(false);
    expect(violationCodes(result)).toContain('TOTAL_TILE_COUNT_MISMATCH');
    expect(violationCodes(result)).toContain('TILE_MULTIPLICITY_EXCEEDED');
    expect(violationCodes(result)).toContain('LATEST_DISCARD_NOT_IN_RIVER');
    expect(result.violations.every(v => v.code && v.message && v.severity)).toBe(true);
  });

  it('uses 14 plus kong count for the current discard player and 13 plus kong count for others', () => {
    const meld: Meld = {
      type: 'anGang',
      tiles: [
        makeTile('tong', 2, 'ag-1'),
        makeTile('tong', 2, 'ag-2'),
        makeTile('tong', 2, 'ag-3'),
        makeTile('tong', 2, 'ag-4'),
      ],
      exposed: false,
    };
    const player = {
      id: 'player_0',
      seat: 0 as const,
      isDealer: true,
      hand: Array.from({ length: 11 }, (_, idx) => makeTile('wan', ((idx % 9) + 1) as Tile['rank'], `h-${idx}`)),
      melds: [meld],
      discards: [],
      score: 1000,
      hasOpenedDoor: false,
    };

    expect(getPlayerKongCount(player)).toBe(1);
    expect(getPlayerPhysicalTileCount(player)).toBe(15);
    expect(expectedPlayerTileCount(player, 'playing', 0)).toBe(15);
    expect(expectedPlayerTileCount(player, 'waitingForResponses', 1)).toBe(14);
  });

  it('audits visible views for wall count consistency and opponent hidden-hand boundaries', () => {
    const state = startRound(createInitialGameState(), 'state-audit-visible');
    const view = buildPlayerVisibleView({
      roomId: 'state-audit-visible-room',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    const result = auditVisibleViewInvariants(view, state);

    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags opponent anGang melds that expose complete tile faces in a non-ended visible view', () => {
    const state = startRound(createInitialGameState(), 'state-audit-visible-angang');
    state.phase = 'playing';
    state.roundEnded = false;
    state.players[1].melds = [
      {
        type: 'anGang',
        tiles: [
          makeTile('tiao', 7, 'leak-1'),
          makeTile('tiao', 7, 'leak-2'),
          makeTile('tiao', 7, 'leak-3'),
          makeTile('tiao', 7, 'leak-4'),
        ],
        exposed: false,
      },
    ];

    const view = buildPlayerVisibleView({
      roomId: 'state-audit-visible-angang-room',
      state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: [],
    });

    const leakyView = {
      ...view,
      opponents: view.opponents.map(opponent =>
        opponent.seat === 1
          ? {
              ...opponent,
              melds: state.players[1].melds,
            }
          : opponent
      ),
    };

    const result = auditVisibleViewInvariants(leakyView, state);

    expect(result.ok).toBe(false);
    expect(violationCodes(result)).toContain('VISIBLE_VIEW_LEAKS_HIDDEN_TILE');
  });
});
