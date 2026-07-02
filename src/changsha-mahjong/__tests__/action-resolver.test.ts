import { describe, it, expect } from 'vitest';
import { PendingAction } from '../types/game.js';
import { sortActionsByPriority, isMultiHu, resolvePendingActions, collectResponsesAfterDiscard } from '../controller/action-resolver.js';
import { createInitialGameState, startRound } from '../controller/game-engine.js';
import { Tile } from '../types/tile.js';

function countAllTiles(state: any): number {
  let total = 0;
  for (const p of state.players) {
    total += p.hand.length;
    total += p.melds.reduce((sum: number, m: any) => sum + m.tiles.length, 0);
    total += p.discards.length;
  }
  total += state.wall.length;
  return total;
}

function findAndRemoveTiles(wall: Tile[], suit: 'wan' | 'tong' | 'tiao', rank: number, count: number): Tile[] {
  const result: Tile[] = [];
  for (let i = 0; i < count; i++) {
    const idx = wall.findIndex(t => t.suit === suit && t.rank === rank);
    if (idx !== -1) {
      result.push(wall.splice(idx, 1)[0]);
    } else {
      throw new Error(`Could not find tile ${suit}_${rank} in wall`);
    }
  }
  return result;
}

describe('action-resolver', () => {
  it('1-3. should verify sorting actions by priority (hu > gang > peng > chi > pass)', () => {
    const actions: PendingAction[] = [
      { seat: 1, type: 'chi', priority: 1 },
      { seat: 2, type: 'hu', priority: 4 },
      { seat: 3, type: 'peng', priority: 2 },
      { seat: 0, type: 'mingGang', priority: 3 },
    ];
    
    const sorted = sortActionsByPriority(actions);
    expect(sorted[0].type).toBe('hu');
    expect(sorted[1].type).toBe('mingGang');
    expect(sorted[2].type).toBe('peng');
    expect(sorted[3].type).toBe('chi');
  });

  it('4. should verify eat (chi) is only allowed for the next seat', () => {
    let state = createInitialGameState();
    state = startRound(state, 'chi-priority-test');
    
    const tile: Tile = { suit: 'wan', rank: 2, instanceId: 'w2_test' };
    state.lastDiscard = { tile, fromSeat: 0 };
    state.discards[0] = [tile];
    state.players[0].discards = [tile];
    
    state.players[1].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1_x' },
      { suit: 'wan', rank: 3, instanceId: 'w3_x' },
    ];
    state.players[2].hand = [
      { suit: 'wan', rank: 1, instanceId: 'w1_y' },
      { suit: 'wan', rank: 3, instanceId: 'w3_y' },
    ];
    
    const responses = collectResponsesAfterDiscard(state);
    
    const chiActions = responses.filter(r => r.type === 'chi');
    expect(chiActions.length).toBe(1);
    expect(chiActions[0].seat).toBe(1);
  });

  it('5. should identify multiple Hu actions as MultiHu', () => {
    const actions: PendingAction[] = [
      { seat: 1, type: 'hu', priority: 4 },
      { seat: 2, type: 'hu', priority: 4 },
      { seat: 3, type: 'pass', priority: 0 },
    ];
    expect(isMultiHu(actions)).toBe(true);
    
    const singleHu: PendingAction[] = [
      { seat: 1, type: 'hu', priority: 4 },
      { seat: 2, type: 'peng', priority: 2 },
    ];
    expect(isMultiHu(singleHu)).toBe(false);
  });

  it('6. should execute only the highest priority action for non-hu choices', () => {
    let state = createInitialGameState();
    state = startRound(state, 'highest-non-hu');

    // Return all hand cards to wall
    const allTiles = [
      ...state.wall,
      ...state.players.flatMap(p => p.hand)
    ];
    state.wall = allTiles;
    for (const p of state.players) {
      p.hand = [];
    }

    // Pull correct tiles for a valid Peng vs Chi scenario
    const discardTile = findAndRemoveTiles(state.wall, 'wan', 3, 1)[0];
    const w3_1 = findAndRemoveTiles(state.wall, 'wan', 3, 1)[0];
    const w3_2 = findAndRemoveTiles(state.wall, 'wan', 3, 1)[0];
    const w1_1 = findAndRemoveTiles(state.wall, 'wan', 1, 1)[0];
    const w2_1 = findAndRemoveTiles(state.wall, 'wan', 2, 1)[0];

    // Player 2 has two 3-wans (can Peng)
    state.players[2].hand = [w3_1, w3_2];
    // Player 1 has 1-wan and 2-wan (can Chi from player 0)
    state.players[1].hand = [w1_1, w2_1];

    state.lastDiscard = { tile: discardTile, fromSeat: 0 };
    state.discards[0] = [discardTile];
    state.players[0].discards = [discardTile];

    state.phase = 'waitingForResponses';
    state.pendingActions = [
      { seat: 2, type: 'peng', priority: 2, tile: discardTile },
      { seat: 1, type: 'chi', priority: 1, tile: discardTile, options: [[w1_1, w2_1]] },
    ];

    const selected: PendingAction[] = [
      { seat: 2, type: 'peng', priority: 2, tile: discardTile },
      { seat: 1, type: 'chi', priority: 1, tile: discardTile, options: [[w1_1, w2_1]] },
    ];

    state = resolvePendingActions(state, selected);

    // Peng (priority 2) should win over Chi (priority 1)
    expect(state.players[2].melds.some(m => m.type === 'peng')).toBe(true);
    expect(state.players[1].melds.length).toBe(0);
    expect(state.currentSeat).toBe(2);
    expect(state.phase).toBe('playing');
    expect(countAllTiles(state)).toBe(108);
  });

  it('7. should transition to next seat when all selected actions are pass', () => {
    let state = createInitialGameState();
    state = startRound(state, 'all-pass-test');

    const allTiles = [
      ...state.wall,
      ...state.players.flatMap(p => p.hand)
    ];
    state.wall = allTiles;
    for (const p of state.players) {
      p.hand = [];
    }

    const w1 = findAndRemoveTiles(state.wall, 'wan', 1, 1)[0];
    const discardTile = findAndRemoveTiles(state.wall, 'wan', 3, 1)[0];

    state.players[1].hand = [w1];
    state.currentSeat = 0;
    state.lastDiscard = { tile: discardTile, fromSeat: 0 };
    state.discards[0] = [discardTile];
    state.players[0].discards = [discardTile];

    const selected: PendingAction[] = [
      { seat: 1, type: 'pass', priority: 0 },
      { seat: 2, type: 'pass', priority: 0 },
    ];

    state = resolvePendingActions(state, selected);
    expect(state.currentSeat).toBe(1);
    expect(state.phase).toBe('playing');
    expect(countAllTiles(state)).toBe(108);
  });
});
