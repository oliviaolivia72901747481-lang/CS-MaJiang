import { describe, it, expect } from 'vitest';
import { validateNetworkAction } from '../server/network-action-guard.js';
import { createInitialGameState } from '../../changsha-mahjong/controller/game-engine.js';
import { Tile } from '../../changsha-mahjong/index.js';

describe('Network Action Guard Tests', () => {
  it('1. valid discard action passes validation', () => {
    const state = createInitialGameState();
    state.phase = 'playing';
    state.currentSeat = 0;
    
    const tile: Tile = { suit: 'wan', rank: 1, instanceId: 'w1' };
    state.players[0].hand = [tile];

    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1' }
    });

    expect(res.ok).toBe(true);
  });

  it('2. discard action when not turn player is rejected', () => {
    const state = createInitialGameState();
    state.phase = 'playing';
    state.currentSeat = 0;

    const res = validateNetworkAction({
      state,
      seat: 1, // Bob tries to discard on Alice's turn
      action: { type: 'discard', tileInstanceId: 'any' }
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toContain('turn');
  });

  it('3. discard of non-existent tile is rejected', () => {
    const state = createInitialGameState();
    state.phase = 'playing';
    state.currentSeat = 0;
    state.players[0].hand = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];

    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'missing-id' }
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toContain('hold');
  });

  it('4. invalid chi option selection is rejected', () => {
    const state = createInitialGameState();
    state.phase = 'waitingForResponses';
    
    const tile1: Tile = { suit: 'wan', rank: 2, instanceId: 'w2' };
    const tile2: Tile = { suit: 'wan', rank: 3, instanceId: 'w3' };

    state.pendingActions = [
      {
        seat: 0,
        type: 'chi',
        priority: 2,
        options: [[tile1, tile2]]
      }
    ];

    // correct optionId is wan_2,wan_3 (sorted)
    // we submit a wrong one
    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'chi', optionId: 'wan_5,wan_6' }
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toContain('option');
  });

  it('5. response action when not in pending actions is rejected', () => {
    const state = createInitialGameState();
    state.phase = 'waitingForResponses';
    state.pendingActions = [];

    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'peng' }
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toContain('actions');
  });

  it('6. actions are rejected after round end', () => {
    const state = createInitialGameState();
    state.phase = 'ended';
    state.roundEnded = true;

    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'pass' }
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toContain('ended');
  });

  it('7. pass action with correct pending states passes', () => {
    const state = createInitialGameState();
    state.phase = 'waitingForResponses';
    state.pendingActions = [
      { seat: 0, type: 'pass', priority: 1 }
    ];

    const res = validateNetworkAction({
      state,
      seat: 0,
      action: { type: 'pass' }
    });

    expect(res.ok).toBe(true);
  });
});
