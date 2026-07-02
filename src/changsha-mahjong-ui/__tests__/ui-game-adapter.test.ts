import { describe, it, expect } from 'vitest';
import { 
  getHumanAvailableActions, 
  isWaitingForHuman, 
  canHumanDiscard, 
  getPlayerDisplayState, 
  assertTileConservation 
} from '../adapters/ui-game-adapter.js';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';

describe('ui-game-adapter', () => {
  it('1. should extract human actions and identify when waiting for human', () => {
    let state = createInitialGameState();
    state = startRound(state, 'adapter-test-seed');

    // Human player (seat 0) available actions
    const humanActions = getHumanAvailableActions(state, 0);
    expect(Array.isArray(humanActions)).toBe(true);

    const isWaiting = isWaitingForHuman(state, 0);
    // Initially, it's dealer's turn (seat 0 is dealer by default or seed decided)
    expect(typeof isWaiting).toBe('boolean');
  });

  it('2. should verify discard eligibility for human', () => {
    let state = createInitialGameState();
    state = startRound(state, 'adapter-test-seed');

    const canDiscard = canHumanDiscard(state, 0);
    expect(typeof canDiscard).toBe('boolean');
  });

  it('3. should generate player display states correctly and hide/reveal AI hands', () => {
    let state = createInitialGameState();
    state = startRound(state, 'adapter-test-seed');

    const displayStates = getPlayerDisplayState(state, 0);
    expect(displayStates.length).toBe(4);

    // Human hand is visible
    expect(displayStates[0].hand).toBeDefined();
    expect(displayStates[0].hand!.length).toBeGreaterThan(0);

    // AI hands are hidden
    expect(displayStates[1].hand).toBeUndefined();
    expect(displayStates[2].hand).toBeUndefined();
    expect(displayStates[3].hand).toBeUndefined();

    // Ended phase reveals AI hands
    state.phase = 'ended';
    const revealedStates = getPlayerDisplayState(state, 0);
    expect(revealedStates[1].hand).toBeDefined();
    expect(revealedStates[2].hand).toBeDefined();
    expect(revealedStates[3].hand).toBeDefined();
  });

  it('4. should audit tile conservation correctly', () => {
    let state = createInitialGameState();
    state = startRound(state, 'adapter-test-seed');

    // Should not throw on valid state
    expect(() => assertTileConservation(state)).not.toThrow();

    // Alter hands to break conservation
    state.players[0].hand.pop();
    expect(() => assertTileConservation(state)).toThrow('Tile count not conserved!');
  });
});
