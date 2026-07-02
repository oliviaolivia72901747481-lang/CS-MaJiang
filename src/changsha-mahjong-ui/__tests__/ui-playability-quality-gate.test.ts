import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

// Maps to store state between renders
let statesMap = new Map<string, any>();
let settersMap = new Map<string, (val: any) => void>();
let refsMap = new Map<string, { current: any }>();
let effectsList: Array<{ effect: () => any, deps: any[] }> = [];

let stateIndex = 0;
let refIndex = 0;

vi.mock('react', () => {
  return {
    useState: (initialValue: any) => {
      const key = `state_${stateIndex++}`;
      if (!statesMap.has(key)) {
        statesMap.set(key, initialValue);
      }
      const setter = (newValue: any) => {
        const currentVal = statesMap.get(key);
        const resolved = typeof newValue === 'function' ? newValue(currentVal) : newValue;
        statesMap.set(key, resolved);
      };
      settersMap.set(key, setter);
      return [statesMap.get(key), setter];
    },
    useRef: (initialValue: any) => {
      const key = `ref_${refIndex++}`;
      if (!refsMap.has(key)) {
        refsMap.set(key, { current: initialValue });
      }
      return refsMap.get(key);
    },
    useEffect: (effect: () => any, deps: any[]) => {
      effectsList.push({ effect, deps });
    },
  };
});

import { useMahjongGame } from '../hooks/useMahjongGame.js';
import { assertTileConservation } from '../adapters/ui-game-adapter.js';
import { addLog } from '../../changsha-mahjong/controller/game-log.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { PendingAction } from '../types/ui-types.js';

function renderHook() {
  stateIndex = 0;
  refIndex = 0;
  effectsList = [];
  return useMahjongGame(['balanced', 'fastHu', 'bigHu', 'defensive']);
}

describe('v0.4.1 Playability Quality Gate', () => {
  beforeEach(() => {
    statesMap.clear();
    settersMap.clear();
    refsMap.clear();
    effectsList = [];
    stateIndex = 0;
    refIndex = 0;
  });

  it('1. should protect against duplicate discard clicks', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-dup');
    hook = renderHook();

    const state = statesMap.get('state_0');
    // Ensure seat 0 is dealer and has 14 tiles to keep conservation after draw transitions
    state.dealerSeat = 0;
    state.currentSeat = 0;
    state.phase = 'playing';
    if (state.players[0].hand.length === 13) {
      const extraTile = state.players[1].hand.pop();
      state.players[0].hand.push(extraTile);
    }

    // Select the first tile in hand
    const tileToDiscard = state.players[0].hand[0];
    hook.selectTile(tileToDiscard);
    hook = renderHook();

    const initialHandLength = state.players[0].hand.length;

    hook.discardSelectedTile();
    hook.discardSelectedTile();

    hook = renderHook();
    const finalState = statesMap.get('state_0');
    
    // Check that it only discarded once
    expect(finalState.players[0].hand.length).toBe(initialHandLength - 1);
    expect(statesMap.get('state_1')).toBeUndefined(); // Selected tile cleared
    assertTileConservation(finalState);
  });

  it('2. should protect against illegal discards', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-illegal');
    hook = renderHook();

    const state = statesMap.get('state_0');
    const initialHand = [...state.players[0].hand];

    // Case A: Discarding when not human's turn (seat 1's turn)
    state.phase = 'playing';
    state.currentSeat = 1;
    
    const tile = initialHand[0];
    statesMap.set('state_1', tile.instanceId); // Select tile
    
    hook = renderHook();
    hook.discardSelectedTile();
    hook = renderHook();
    
    let finalState = statesMap.get('state_0');
    expect(finalState.players[0].hand.length).toBe(initialHand.length); // Hand unchanged

    // Case B: Discarding a tile that is not in player's hand
    finalState.currentSeat = 0;
    const fakeTile: Tile = { suit: 'wan', rank: 5, instanceId: 'fake_instance_id' };
    statesMap.set('state_1', fakeTile.instanceId);
    
    hook = renderHook();
    hook.discardSelectedTile();
    hook = renderHook();
    
    finalState = statesMap.get('state_0');
    expect(finalState.players[0].hand.length).toBe(initialHand.length); // Hand unchanged
  });

  it('3. should display and resolve valid actions correctly', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-actions');
    hook = renderHook();

    const state = statesMap.get('state_0');
    
    // Inject matching tiles into player 0's hand for Chi option
    state.players[0].hand.push(
      { suit: 'tiao', rank: 3, instanceId: 's3' },
      { suit: 'tiao', rank: 4, instanceId: 's4' }
    );
    
    // Slice 3 tiles from wall to compensate for s3, s4 and the discarded actionTile, keeping 108 conserved
    state.wall = state.wall.slice(3);

    const actionTile: Tile = { suit: 'tiao', rank: 2, instanceId: 'test_action_tile' };
    
    // Set seat 1 as discarder so resolvePendingActions can find the last discard source
    state.lastDiscard = {
      tile: actionTile,
      fromSeat: 1,
    };
    if (!state.discards[1]) state.discards[1] = [];
    state.discards[1].push(actionTile);
    state.players[1].discards.push(actionTile);

    const chiAction: PendingAction = {
      seat: 0,
      type: 'chi',
      priority: 1,
      tile: actionTile,
      options: [[{ suit: 'tiao', rank: 3, instanceId: 's3' }, { suit: 'tiao', rank: 4, instanceId: 's4' }]],
    };
    state.pendingActions = [chiAction];
    state.phase = 'waitingForResponses';

    hook = renderHook();
    expect(hook.availableHumanActions.length).toBe(1);
    expect(hook.availableHumanActions[0].type).toBe('chi');

    // Trigger action with a duplicate click safety check
    hook.performHumanAction(chiAction);
    hook.performHumanAction(chiAction); // duplicate click should be blocked/ignored

    hook = renderHook();
    const finalState = statesMap.get('state_0');
    expect(finalState.pendingActions.length).toBe(0); // resolved and cleared
  });

  it('4. should prevent re-entrant AI stepping and handle cleanup', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-ai');
    hook = renderHook();

    // Verify effects are registered
    expect(effectsList.length).toBe(2);

    const state = statesMap.get('state_0');
    state.phase = 'playing';
    state.currentSeat = 1; // AI player's turn

    // Run effect to simulate timeout trigger
    const aiEffect = effectsList[0];
    const cleanup = aiEffect.effect();
    
    // Cleanup should clear timer and reset stepping ref
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('5. should lock UI state during settlement', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-settle');
    hook = renderHook();

    const state = statesMap.get('state_0');
    state.phase = 'settlement';
    state.roundEnded = true;

    const tile = state.players[0].hand[0];
    statesMap.set('state_1', tile.instanceId);

    const initialCount = state.players[0].hand.length;

    hook = renderHook();
    hook.discardSelectedTile();
    hook = renderHook();

    const finalState = statesMap.get('state_0');
    // Hand count remains unchanged because UI is locked during settlement
    expect(finalState.players[0].hand.length).toBe(initialCount);
  });

  it('6. should reset all states correctly on reset and restart', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-reset');
    hook = renderHook();

    expect(statesMap.get('state_0')).not.toBeNull();

    // Call restart/reset
    hook.resetGame();
    hook = renderHook();

    expect(statesMap.get('state_0')).toBeNull();
    expect(statesMap.get('state_1')).toBeUndefined();
  });

  it('7. should assert conservation strictly and detect issues', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-conserv');
    hook = renderHook();

    const state = statesMap.get('state_0');
    expect(() => assertTileConservation(state)).not.toThrow();

    // Manually delete a tile from players hand to cause a conservation error
    const originalHand = state.players[0].hand;
    state.players[0].hand = originalHand.slice(1);
    
    expect(() => assertTileConservation(state)).toThrow(/Tile count not conserved/);
  });

  it('8. should deduplicate repeat log entries', () => {
    let hook = renderHook();
    hook.startNewRound('test-seed-logs');
    hook = renderHook();

    let state = statesMap.get('state_0');
    const initialLogCount = state.logs.length;

    // Add log
    state = addLog(state, '打出牌', 0, 'w5');
    // Add identical duplicate log
    state = addLog(state, '打出牌', 0, 'w5');

    expect(state.logs.length).toBe(initialLogCount + 1); // Only 1 added
  });
});
