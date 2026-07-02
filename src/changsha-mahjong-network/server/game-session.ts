import { GameState, Tile, PendingAction } from '../../changsha-mahjong/index.js';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { discardTile } from '../../changsha-mahjong/controller/round-controller.js';
import { Room, GameSession, NetworkPlayerAction } from './network-types.js';
import { getRoom, fillEmptySeatsWithAI } from './room-manager.js';
import { validateNetworkAction } from './network-action-guard.js';
import { isDuplicateAction, recordAction } from './action-dedupe.js';
import { stepAIIfNeeded } from './ai-seat-runner.js';

export { stepAIIfNeeded };

export interface SubmitActionResult {
  success: boolean;
  error?: string;
  ignored?: boolean;
}

import { PlayerSession } from './network-types.js';
import { fillSeatsWithAITo } from './room-manager.js';

export function startOnlineRound(
  roomId: string,
  requestedPlayerCount?: 2 | 3 | 4,
  fillAIToPlayerCount?: 2 | 3 | 4
): GameSession {
  const room = getRoom(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found.`);
  }

  if (!requestedPlayerCount && !fillAIToPlayerCount) {
    const currentSeats = Object.values(room.seats).filter(s => s !== null);
    if (currentSeats.length < 2) {
      fillSeatsWithAITo(roomId, 4);
    }
  }

  if (fillAIToPlayerCount) {
    fillSeatsWithAITo(roomId, fillAIToPlayerCount);
  }

  const activeSeats = Object.values(room.seats)
    .filter((s): s is PlayerSession => s !== null)
    .map(s => s.seat)
    .sort((a, b) => a - b);

  if (requestedPlayerCount && activeSeats.length !== requestedPlayerCount) {
    throw new Error(`Room has ${activeSeats.length} players, but requested player count is ${requestedPlayerCount}`);
  }

  if (activeSeats.length < 2 || activeSeats.length > 4) {
    throw new Error(`Invalid active player count: ${activeSeats.length}`);
  }

  room.activeSeats = activeSeats;
  room.gamePlayerCount = activeSeats.length as any;
  room.hasAI = activeSeats.some(s => room.seats[s]?.isAI === true);

  let state = createInitialGameState(undefined, activeSeats);
  state.players.forEach((p: any) => {
    if (room.aiSeats.includes(p.seat as any)) {
      (p as any).aiEngine = 'advanced';
    } else {
      (p as any).aiEngine = 'human';
    }
    p.aiProfile = 'balanced';
  });

  const seed = 'online-round-' + Math.floor(Date.now() + Math.random() * 1000000);
  state = startRound(state, seed);

  const session: GameSession = {
    roomId,
    state,
    actionLock: false,
    lastUpdatedAt: Date.now(),
  };
  (session as any).submittedActions = {};

  room.gameSession = session;
  room.status = 'playing';

  // Record initial activity time
  (room as any).lastActiveAt = Date.now();

  return session;
}

export function submitPlayerAction(input: {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  action: NetworkPlayerAction;
}): SubmitActionResult {
  const room = getRoom(input.roomId);
  if (!room || !room.gameSession) {
    return { success: false, error: 'Room or game session not found.' };
  }

  const session = room.gameSession;
  if (session.actionLock) {
    return { success: false, error: 'Action is locked (processing).' };
  }

  // 1. Deduplication check
  if (input.action.actionId) {
    const dedupeKey = { roomId: input.roomId, seat: input.seat, actionId: input.action.actionId };
    if (isDuplicateAction(dedupeKey)) {
      return { success: true, ignored: true };
    }
  }

  // 2. Action validation
  const validation = validateNetworkAction({
    state: session.state,
    seat: input.seat,
    action: input.action
  });

  if (!validation.ok) {
    return { success: false, error: validation.reason || 'Action validation failed.' };
  }

  session.actionLock = true;
  try {
    const state = session.state;
    const seat = input.seat;
    const action = input.action;

    // Record the action to prevent double processing
    if (action.actionId) {
      recordAction({ roomId: input.roomId, seat, actionId: action.actionId });
    }

    // Update room activity timestamp
    (room as any).lastActiveAt = Date.now();

    if (action.type === 'discard') {
      const player = state.players.find((p: any) => p.seat === seat);
      if (!player) return { success: false, error: 'Player not found.' };

      const matchedTile = player.hand.find((t: any) => t.instanceId === action.tileInstanceId);
      if (!matchedTile) {
        return { success: false, error: 'You do not hold this tile.' };
      }

      session.state = discardTile(state, seat, matchedTile);
      session.lastUpdatedAt = Date.now();
      return { success: true };
    }

    // Response actions: chi, peng, gang, hu, pass
    const submitted = (session as any).submittedActions || {};
    (session as any).submittedActions = submitted;

    if (action.type === 'hu') {
      const pending = state.pendingActions.find((a: any) => a.seat === seat && (a.type === 'hu' || a.type === 'ziMo'));
      if (!pending) return { success: false, error: 'No pending hu/ziMo action available.' };
      submitted[seat] = pending;
    } else if (action.type === 'peng') {
      const pending = state.pendingActions.find((a: any) => a.seat === seat && a.type === 'peng');
      if (!pending) return { success: false, error: 'No pending peng action available.' };
      submitted[seat] = pending;
    } else if (action.type === 'pass') {
      const pending = state.pendingActions.find((a: any) => a.seat === seat && a.type === 'pass');
      if (!pending) return { success: false, error: 'No pending pass action available.' };
      submitted[seat] = pending;
    } else if (action.type === 'chi') {
      const pending = state.pendingActions.find((a: any) => a.seat === seat && a.type === 'chi');
      if (!pending) return { success: false, error: 'No pending chi action available.' };
      
      if (pending.options) {
        const optionId = action.optionId;
        const idx = pending.options.findIndex((opt: any) => 
          opt.map((t: any) => `${t.suit}_${t.rank}`).sort().join(',') === optionId
        );
        if (idx === -1) return { success: false, error: 'Invalid chi option.' };
        const chosen = pending.options[idx];
        pending.options.splice(idx, 1);
        pending.options.unshift(chosen);
      }
      submitted[seat] = pending;
    } else if (action.type === 'gang') {
      const pending = state.pendingActions.find((a: any) => 
        a.seat === seat && 
        (a.type === 'anGang' || a.type === 'mingGang' || a.type === 'buGang')
      );
      if (!pending) return { success: false, error: 'No pending gang action available.' };
      
      if (pending.options) {
        const tileKey = action.tileKey;
        const idx = pending.options.findIndex((opt: any) => {
          if (typeof opt === 'string') return opt === tileKey;
          if (Array.isArray(opt)) {
            return opt.map((t: any) => `${t.suit}_${t.rank}`).includes(tileKey);
          }
          return false;
        });
        if (idx === -1) return { success: false, error: 'Invalid gang option.' };
        const chosen = pending.options[idx];
        pending.options.splice(idx, 1);
        pending.options.unshift(chosen);
      }
      submitted[seat] = pending;
    } else {
      return { success: false, error: 'Invalid action type.' };
    }

    session.lastUpdatedAt = Date.now();
    return { success: true };
  } finally {
    session.actionLock = false;
  }
}
