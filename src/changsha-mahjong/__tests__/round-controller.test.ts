import { describe, it, expect } from 'vitest';
import { createInitialGameState, startRound } from '../controller/game-engine.js';
import { drawTile, discardTile, moveToNextSeat } from '../controller/round-controller.js';
import { resolvePendingActions } from '../controller/action-resolver.js';
import { GameState } from '../types/game.js';
import { Tile } from '../types/tile.js';

function countAllTiles(state: GameState): number {
  let total = 0;
  for (const p of state.players) {
    total += p.hand.length;
    total += p.melds.reduce((sum, m) => sum + m.tiles.length, 0);
    total += p.discards.length;
  }
  total += state.wall.length;
  return total;
}

// Robust swap helper to give targetSeat two tiles matching matchTile to allow Peng
function setupPengOption(state: GameState, targetSeat: 0 | 1 | 2 | 3, matchTile: Tile) {
  const candidates: { tile: Tile; from: 'wall' | number; index: number }[] = [];
  
  // Search wall
  state.wall.forEach((tile, index) => {
    if (tile.suit === matchTile.suit && tile.rank === matchTile.rank) {
      candidates.push({ tile, from: 'wall', index });
    }
  });
  
  // Search other players (excluding discarder seat 0 and targetSeat)
  state.players.forEach(p => {
    if (p.seat !== 0 && p.seat !== targetSeat) {
      p.hand.forEach((tile, index) => {
        if (tile.suit === matchTile.suit && tile.rank === matchTile.rank) {
          candidates.push({ tile, from: p.seat, index });
        }
      });
    }
  });

  if (candidates.length < 2) {
    throw new Error(`Not enough matching tiles to setup Peng option for ${matchTile.suit}_${matchTile.rank}`);
  }

  const newTiles: Tile[] = [];
  for (let i = 0; i < 2; i++) {
    const cand = candidates[i];
    if (cand.from === 'wall') {
      const idx = state.wall.findIndex(t => t.instanceId === cand.tile.instanceId);
      state.wall.splice(idx, 1);
    } else {
      const p = state.players[cand.from as number];
      p.hand = p.hand.filter(t => t.instanceId !== cand.tile.instanceId);
    }
    // Pop a card from targetSeat's hand first (so we don't pop the newly added cards)
    const replaced = state.players[targetSeat].hand.pop()!;
    state.wall.push(replaced);
    newTiles.push(cand.tile);
  }
  
  // Add new tiles to hand at the end
  state.players[targetSeat].hand.push(...newTiles);
}

describe('round-controller', () => {
  it('1-2. should draw a card and increase hand count by 1', () => {
    let state = createInitialGameState();
    state = startRound(state, 'draw-tile-test');
    
    const initialHandSize = state.players[1].hand.length;
    const initialWallSize = state.wall.length;
    
    state = drawTile(state, 1);
    expect(state.players[1].hand.length).toBe(initialHandSize + 1);
    expect(state.wall.length).toBe(initialWallSize - 1);
    expect(countAllTiles(state)).toBe(108);
  });

  it('3-5. should discard card, decrease hand size, add card to discards, and enter waitingForResponses', () => {
    let state = createInitialGameState();
    state = startRound(state, 'discard-test');
    
    state.phase = 'playing';
    state.currentSeat = 0;
    
    const player = state.players[0];
    const discardCard = player.hand[0];
    const initialHandSize = player.hand.length;

    // Give player 1 a Peng option by swapping matching cards
    setupPengOption(state, 1, discardCard);
    
    state = discardTile(state, 0, discardCard);
    
    expect(player.hand.length).toBe(initialHandSize - 1);
    expect(state.discards[0]).toContain(discardCard);
    expect(player.discards).toContain(discardCard);
    expect(state.lastDiscard?.tile.instanceId).toBe(discardCard.instanceId);
    expect(state.phase).toBe('waitingForResponses');
    expect(countAllTiles(state)).toBe(108);
  });

  it('6. should move to the next seat if nobody responds', () => {
    let state = createInitialGameState();
    state = startRound(state, 'move-next-test');
    
    state.phase = 'playing';
    state.currentSeat = 0;
    
    const player = state.players[0];
    const discardCard = player.hand[0];
    
    // Give player 1 a Peng option so discardTile enters waitingForResponses
    setupPengOption(state, 1, discardCard);
    
    state = discardTile(state, 0, discardCard);
    expect(state.phase).toBe('waitingForResponses');

    // Now resolve actions with empty selections (meaning everyone passes)
    state = resolvePendingActions(state, []);
    
    expect(state.currentSeat).toBe(1);
    expect(state.players[1].hand.length).toBe(14);
    expect(state.phase).toBe('playing');
    expect(countAllTiles(state)).toBe(108);
  });

  it('7. should enter draw when wall is empty during drawTile', () => {
    let state = createInitialGameState();
    state = startRound(state, 'draw-empty-test');
    
    state.wall = [];
    state = drawTile(state, 1);
    
    expect(state.roundEnded).toBe(true);
    expect(state.phase).toBe('ended');
  });

  it('8. should enter haiDi phase when wall has exactly 1 tile during moveToNextSeat', () => {
    let state = createInitialGameState();
    state = startRound(state, 'haidi-test');
    
    state.currentSeat = 0;
    
    // Move extra wall tiles to player 0's discard pile to maintain exactly 108 cards
    const extraTiles = state.wall.slice(1);
    state.wall = [state.wall[0]];
    state.players[0].discards.push(...extraTiles);
    state.discards[0].push(...extraTiles);
    
    state = moveToNextSeat(state);
    
    expect(state.phase).toBe('haiDi');
    expect(state.currentSeat).toBe(1);
    expect(state.pendingActions.length).toBeGreaterThan(0);
    expect(countAllTiles(state)).toBe(108);
  });
});
