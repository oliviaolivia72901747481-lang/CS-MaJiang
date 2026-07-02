import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';

// Mock state storage
let mockState: any = null;
let mockSelectedTileInstanceId: any = undefined;

vi.mock('react', () => {
  return {
    useState: (initialValue: any) => {
      // Differentiate the state from the selectedTileInstanceId
      if (initialValue === null) {
        return [
          mockState, 
          (val: any) => {
            mockState = typeof val === 'function' ? val(mockState) : val;
          }
        ];
      }
      return [
        mockSelectedTileInstanceId, 
        (val: any) => {
          mockSelectedTileInstanceId = typeof val === 'function' ? val(mockSelectedTileInstanceId) : val;
        }
      ];
    },
    useEffect: vi.fn(),
    useRef: (initialValue: any) => ({ current: initialValue }),
  };
});

// Import hook after mock
import { useMahjongGame } from '../hooks/useMahjongGame.js';

describe('useMahjongGame hook', () => {
  it('1. should start a new round and setup player seats', () => {
    const { startNewRound } = useMahjongGame(['balanced', 'fastHu', 'bigHu', 'defensive']);
    
    // Start game
    startNewRound('hook-test-seed');

    expect(mockState).not.toBeNull();
    expect(mockState.players.length).toBe(4);
    expect(mockState.players[0].seat).toBe(0);
    expect(mockState.players[1].seat).toBe(1);
    expect(mockState.players[2].seat).toBe(2);
    expect(mockState.players[3].seat).toBe(3);

    // Verify AI profiles are assigned
    expect(mockState.players[0].aiProfile).toBe('balanced');
    expect(mockState.players[1].aiProfile).toBe('fastHu');
    expect(mockState.players[2].aiProfile).toBe('bigHu');
    expect(mockState.players[3].aiProfile).toBe('defensive');
  });

  it('2. should select hand tile', () => {
    const { selectTile } = useMahjongGame();
    mockState.currentSeat = 0;
    mockState.phase = 'playing';

    const sampleTile = mockState.players[0].hand[0];
    selectTile(sampleTile);

    expect(mockSelectedTileInstanceId).toBe(sampleTile.instanceId);
  });

  it('3. should handle discard of selected tile', () => {
    const { discardSelectedTile } = useMahjongGame();
    
    // Preset mockState to human discard turn
    mockState.currentSeat = 0;
    mockState.phase = 'playing';
    const initialHandLength = mockState.players[0].hand.length;

    // Discard the selected tile
    discardSelectedTile();

    expect(mockState.players[0].hand.length).toBe(initialHandLength - 1);
    expect(mockSelectedTileInstanceId).toBeUndefined(); // cleared
  });

  it('4. should reset game', () => {
    const { resetGame } = useMahjongGame();
    resetGame();

    expect(mockState).toBeNull();
    expect(mockSelectedTileInstanceId).toBeUndefined();
  });
});
