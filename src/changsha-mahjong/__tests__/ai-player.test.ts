import { describe, it, expect } from 'vitest';
import { chooseAIDiscard, chooseAIAction } from '../ai/ai-player.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { createInitialGameState, startRound } from '../controller/game-engine.js';
import { simulateOneRound } from '../simulator/console-simulator.js';

describe('ai-player', () => {
  it('1-2. chooseAIDiscard should return a valid discard tile from hand', () => {
    let state = createInitialGameState();
    state = startRound(state, 'ai-discard-test');
    
    const decision = chooseAIDiscard({
      state,
      seat: 0,
      profile: AI_PROFILES.balanced,
    });
    
    expect(decision.action).toBe('discard');
    expect(decision.tileKey).toBeDefined();
    
    const player = state.players[0];
    const exists = player.hand.some(t => `${t.suit}_${t.rank}` === decision.tileKey);
    expect(exists).toBe(true);
  });

  it('3-4. chooseAIAction should handle simple actions', () => {
    let state = createInitialGameState();
    state = startRound(state, 'ai-action-test');
    
    const availableActions = [
      { seat: 0 as const, type: 'pass' as const, priority: 0 },
    ];

    const decision = chooseAIAction({
      state,
      seat: 0,
      availableActions,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('pass');
  });

  it('8. simulateOneRound should run to completion using AI profiles', () => {
    const { finalState, summary } = simulateOneRound({
      seed: 'ai-run-complete-test',
      aiProfiles: ['balanced', 'fastHu', 'bigHu', 'defensive'],
    });

    expect(finalState.roundEnded).toBe(true);
    expect(finalState.phase).toBe('ended');
    expect(summary).not.toBe('');
  });
});
