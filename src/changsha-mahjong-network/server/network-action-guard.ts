import { GameState, Tile } from '../../changsha-mahjong/index.js';
import { NetworkPlayerAction } from './network-types.js';

export function validateNetworkAction(input: {
  state: GameState;
  seat: 0 | 1 | 2 | 3;
  action: NetworkPlayerAction;
}): {
  ok: boolean;
  reason?: string;
  errorCode?: string;
} {
  const { state, seat, action } = input;

  if (state.activeSeats && !state.activeSeats.includes(seat)) {
    return { ok: false, errorCode: 'PLAYER_NOT_IN_ROOM', reason: 'Inactive seat cannot submit actions.' };
  }

  if (state.phase === 'ended' || state.roundEnded) {
    return { ok: false, errorCode: 'INVALID_PHASE', reason: 'Game has already ended.' };
  }

  if (action.type === 'discard') {
    if (state.phase !== 'playing') {
      return { ok: false, errorCode: 'INVALID_PHASE', reason: `Cannot discard during phase: ${state.phase}` };
    }
    if (state.currentSeat !== seat) {
      return { ok: false, errorCode: 'NOT_YOUR_TURN', reason: `It is player ${state.currentSeat}'s turn, not yours.` };
    }

    const player = state.players.find((p: any) => p.seat === seat);
    if (!player) {
      return { ok: false, errorCode: 'PLAYER_NOT_IN_ROOM', reason: 'Player session not found in state.' };
    }

    const hasTile = player.hand.some((t: any) => t.instanceId === action.tileInstanceId);
    if (!hasTile) {
      return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'You do not hold this tile in hand.' };
    }

    return { ok: true };
  }

  // Response actions: chi, peng, gang, hu, pass
  if (state.phase !== 'waitingForResponses') {
    return { ok: false, errorCode: 'INVALID_PHASE', reason: 'Not currently waiting for response actions.' };
  }

  const actionsForSeat = state.pendingActions.filter((pa: any) => pa.seat === seat);
  if (actionsForSeat.length === 0) {
    return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending actions for your seat.' };
  }

  if (action.type === 'pass') {
    const hasPass = actionsForSeat.some((pa: any) => pa.type === 'pass');
    if (!hasPass) return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending pass action.' };
    return { ok: true };
  }

  if (action.type === 'hu') {
    const hasHu = actionsForSeat.some((pa: any) => pa.type === 'hu' || pa.type === 'ziMo');
    if (!hasHu) return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending hu or ziMo action.' };
    return { ok: true };
  }

  if (action.type === 'peng') {
    const hasPeng = actionsForSeat.some((pa: any) => pa.type === 'peng');
    if (!hasPeng) return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending peng action.' };
    return { ok: true };
  }

  if (action.type === 'chi') {
    const pendingChi = actionsForSeat.find((pa: any) => pa.type === 'chi');
    if (!pendingChi) return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending chi action.' };

    if (pendingChi.options) {
      const optionId = action.optionId;
      const optionValid = pendingChi.options.some((opt: Tile[]) =>
        opt.map((t: Tile) => `${t.suit}_${t.rank}`).sort().join(',') === optionId
      );
      if (!optionValid) {
        return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'Invalid chi option selected.' };
      }
    }
    return { ok: true };
  }

  if (action.type === 'gang') {
    const pendingGang = actionsForSeat.find((pa: any) =>
      pa.type === 'anGang' || pa.type === 'mingGang' || pa.type === 'buGang'
    );
    if (!pendingGang) return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'No pending gang action.' };

    if (pendingGang.options) {
      const tileKey = action.tileKey;
      const optionValid = pendingGang.options.some((opt: any) => {
        if (typeof opt === 'string') return opt === tileKey;
        if (Array.isArray(opt)) {
          return opt.map((t: Tile) => `${t.suit}_${t.rank}`).includes(tileKey);
        }
        return false;
      });
      if (!optionValid) {
        return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'Invalid gang option selected.' };
      }
    }
    return { ok: true };
  }

  return { ok: false, errorCode: 'ACTION_NOT_AVAILABLE', reason: 'Unknown action type.' };
}
