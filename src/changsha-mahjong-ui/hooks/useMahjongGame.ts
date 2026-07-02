import { useState, useEffect, useRef } from 'react';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { GameState, PendingAction } from '../types/ui-types.js';
import { createInitialGameState, startRound, stepGame } from '../../changsha-mahjong/controller/game-engine.js';
import { discardTile } from '../../changsha-mahjong/controller/round-controller.js';
import { chooseAction } from '../../changsha-mahjong/controller/bot-controller.js';
import { resolvePendingActions } from '../../changsha-mahjong/controller/action-resolver.js';
import { getHumanAvailableActions, isWaitingForHuman, assertTileConservation } from '../adapters/ui-game-adapter.js';

export interface UseMahjongGameResult {
  state: GameState | null;
  selectedTileInstanceId?: string;
  availableHumanActions: PendingAction[];
  isWaitingForHumanUser: boolean;

  startNewRound: (seed?: string, customConfig?: any) => void;
  selectTile: (tile: Tile) => void;
  discardSelectedTile: () => void;
  performHumanAction: (action: PendingAction) => void;
  resetGame: () => void;
}

export function useMahjongGame(aiProfiles?: string[]): UseMahjongGameResult {
  const [state, setState] = useState<GameState | null>(null);
  const [selectedTileInstanceId, setSelectedTileInstanceId] = useState<string | undefined>(undefined);
  const isSteppingRef = useRef(false);
  const isActionBusyRef = useRef(false);

  // Auto-step AI turns when it is not the human's turn
  useEffect(() => {
    // If the game is ended, settled, or roundEnded is true, do not step AI
    if (!state || state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') {
      return;
    }

    const humanWaiting = isWaitingForHuman(state, 0);

    if (!humanWaiting && !isSteppingRef.current) {
      isSteppingRef.current = true;
      const timer = setTimeout(() => {
        try {
          let newState = stepGame(state);
          assertTileConservation(newState);
          setState(newState);
        } catch (e) {
          console.error("AI Step error:", e);
        } finally {
          isSteppingRef.current = false;
        }
      }, 500); // 500ms delay for readability
      
      // Cleanup: clear timeout AND reset ref to false so future ticks can reschedule if interrupted
      return () => {
        clearTimeout(timer);
        isSteppingRef.current = false;
      };
    }
  }, [state]);

  // Reset busy flag whenever state changes
  useEffect(() => {
    isActionBusyRef.current = false;
  }, [state]);

  const startNewRound = (seed?: string, customConfig?: any) => {
    let newState = createInitialGameState();
    if (aiProfiles && aiProfiles.length > 0) {
      newState.players.forEach((p, idx) => {
        p.aiProfile = aiProfiles![idx % aiProfiles.length];
      });
    }
    if (customConfig) {
      newState.config = {
        ...newState.config,
        ...customConfig,
      };
    }
    newState = startRound(newState, seed);
    assertTileConservation(newState);
    setSelectedTileInstanceId(undefined);
    isActionBusyRef.current = false;
    isSteppingRef.current = false;
    setState(newState);
  };

  const discardTileDirect = (tileToDiscard: Tile) => {
    if (!state || isActionBusyRef.current) return;
    
    // Lock: Prevent playing when game is over
    if (state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') return;

    // Protection: Can only discard in playing phase on player's turn
    if (state.phase !== 'playing' || state.currentSeat !== 0) return;

    isActionBusyRef.current = true;
    try {
      let newState = discardTile(state, 0, tileToDiscard);
      assertTileConservation(newState);
      setSelectedTileInstanceId(undefined);
      setState(newState);
    } catch (e) {
      console.error("Discard error:", e);
      isActionBusyRef.current = false;
    }
  };

  const selectTile = (tile: Tile) => {
    if (!state || state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') return;
    if (state.currentSeat !== 0 || state.phase !== 'playing') return;
    
    // Toggle selection / double-click to discard
    if (selectedTileInstanceId === tile.instanceId) {
      setSelectedTileInstanceId(undefined);
      discardTileDirect(tile);
    } else {
      setSelectedTileInstanceId(tile.instanceId);
    }
  };

  const discardSelectedTile = () => {
    if (!state || !selectedTileInstanceId) return;
    const player = state.players.find(p => p.seat === 0);
    if (!player) return;
    const tile = player.hand.find(t => t.instanceId === selectedTileInstanceId);
    if (!tile) return; // Cannot discard tile that doesn't exist in hand
    discardTileDirect(tile);
  };

  const performHumanAction = (humanAction: PendingAction) => {
    if (!state || isActionBusyRef.current) return;

    // Lock: Prevent actions when game is over
    if (state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') return;

    // Protection: verify action is valid in current state
    const availableActions = getHumanAvailableActions(state, 0);
    const isValidAction = availableActions.some(
      pa => pa.type === humanAction.type && 
            (humanAction.tile ? pa.tile?.instanceId === humanAction.tile.instanceId : true)
    );
    if (!isValidAction) return;

    isActionBusyRef.current = true;
    try {
      const seatsWithActions = Array.from(new Set(state.pendingActions.map(pa => pa.seat)));
      const selectedActions: PendingAction[] = [];

      for (const seat of seatsWithActions) {
        if (seat === 0) {
          selectedActions.push(humanAction);
        } else {
          const actionsForSeat = state.pendingActions.filter(pa => pa.seat === seat);
          const chosen = chooseAction(state, seat as 0 | 1 | 2 | 3, actionsForSeat);
          selectedActions.push(chosen);
        }
      }

      let newState = resolvePendingActions(state, selectedActions);
      assertTileConservation(newState);
      setSelectedTileInstanceId(undefined);
      setState(newState);
    } catch (e) {
      console.error("Action resolution error:", e);
      isActionBusyRef.current = false;
    }
  };

  const resetGame = () => {
    setState(null);
    setSelectedTileInstanceId(undefined);
    isActionBusyRef.current = false;
    isSteppingRef.current = false;
  };

  const availableHumanActions = state ? getHumanAvailableActions(state, 0) : [];
  const isWaitingForHumanUser = state ? isWaitingForHuman(state, 0) : false;

  return {
    state,
    selectedTileInstanceId,
    availableHumanActions,
    isWaitingForHumanUser,
    startNewRound,
    selectTile,
    discardSelectedTile,
    performHumanAction,
    resetGame,
  };
}
