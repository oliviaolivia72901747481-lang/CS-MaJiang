import { getRoom } from './room-manager.js';
import { chooseAction } from '../../changsha-mahjong/controller/bot-controller.js';
import { stepGame } from '../../changsha-mahjong/controller/game-engine.js';
import { resolvePendingActions } from '../../changsha-mahjong/controller/action-resolver.js';
import { checkTileConservation } from '../../changsha-mahjong/benchmark/ai-match-runner.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { addLog } from '../../changsha-mahjong/controller/game-log.js';

let broadcastCallback: ((roomId: string) => void) | null = null;

export function setBroadcastCallback(cb: (roomId: string) => void): void {
  broadcastCallback = cb;
}

export function triggerBroadcast(roomId: string): void {
  if (broadcastCallback) {
    broadcastCallback(roomId);
  }
}

export function isSeatTrustee(roomId: string, seat: 0 | 1 | 2 | 3, now = Date.now()): boolean {
  const room = getRoom(roomId);
  if (!room) return false;

  const session = room.seats[seat];
  if (!session) return false;
  if (session.isAI || session.connectionState === 'ai') return true;
  if (session.connectionState === 'left') return true;
  if (session.connectionState === 'offline') return true;
  if (session.connectionState === 'reconnecting' && session.disconnectedAt) {
    const elapsed = now - session.disconnectedAt;
    if (elapsed >= 30000) { // AUTO_TRUSTEE_AFTER_MS = 30000
      return true;
    }
  }
  return false;
}

export async function stepAIIfNeeded(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || !room.gameSession) return;

  const now = Date.now();
  const session = room.gameSession;
  if (session.actionLock) return;

  session.actionLock = true;
  try {
    let state = session.state;
    let changed = true;
    const maxSteps = 500;
    let steps = 0;

    while (changed && steps < maxSteps) {
      changed = false;
      steps++;

      if (state.phase === 'ended' || state.roundEnded) {
        room.status = 'settlement';
        break;
      }

      // 1. Automated phases: dealing, startingHu, gangReplacement
      if (state.phase === 'dealing' || state.phase === 'startingHu' || state.phase === 'gangReplacement') {
        try {
          state = stepGame(state);
          changed = true;
        } catch (err) {
          console.error(`[AI Runner] Exception in stepGame automated phase:`, err);
          break;
        }
        continue;
      }

      // 2. Playing turn phase
      if (state.phase === 'playing') {
        const curSeat = state.currentSeat;
        const isAI = room.aiSeats.includes(curSeat) || isSeatTrustee(roomId, curSeat, now);
        if (isAI) {
          try {
            if (isSeatTrustee(roomId, curSeat, now)) {
              const playerName = room.seats[curSeat]?.playerName || `玩家 ${curSeat}`;
              state = addLog(state, `系统托管出牌`, curSeat, `${playerName}离线`);
            }
            state = stepGame(state);
            changed = true;
          } catch (err) {
            console.error(`[AI Runner] Exception in AI discard step at seat ${curSeat}:`, err);
            // Fallback discard first tile in hand
            const player = state.players.find((p: any) => p.seat === curSeat);
            if (player && player.hand.length > 0) {
              const discardTile = player.hand[0];
              const { discardTile: discardFn } = await import('../../changsha-mahjong/controller/round-controller.js');
              state = discardFn(state, curSeat, discardTile);
              changed = true;
            } else {
              break;
            }
          }
          continue;
        } else {
          break;
        }
      }

      // 3. Responses phase
      if (state.phase === 'waitingForResponses') {
        const seatsWithActions = Array.from(new Set(state.pendingActions.map((pa: any) => pa.seat))) as Array<0 | 1 | 2 | 3>;
        
        if (!(session as any).submittedActions) {
          (session as any).submittedActions = {};
        }
        const submitted = (session as any).submittedActions;

        // Auto-run AI choices
        for (const seat of seatsWithActions) {
          if (room.aiSeats.includes(seat) || isSeatTrustee(roomId, seat, now)) {
            if (submitted[seat] === undefined) {
              try {
                const actionsForSeat = state.pendingActions.filter((pa: any) => pa.seat === seat);
                const chosen = chooseAction(state, seat, actionsForSeat);
                submitted[seat] = chosen;
                if (isSeatTrustee(roomId, seat, now)) {
                  const playerName = room.seats[seat]?.playerName || `玩家 ${seat}`;
                  state = addLog(state, `系统托管响应`, seat, `${playerName}离线，执行动作: ${chosen.type}`);
                }
              } catch (err) {
                console.error(`[AI Runner] Exception in AI chooseAction at seat ${seat}:`, err);
                const actionsForSeat = state.pendingActions.filter((pa: any) => pa.seat === seat);
                const passAction = actionsForSeat.find(a => a.type === 'pass');
                submitted[seat] = passAction || actionsForSeat[0];
              }
            }
          }
        }

        const allSubmitted = seatsWithActions.every((seat: any) => submitted[seat] !== undefined);
        if (allSubmitted) {
          try {
            const choices = seatsWithActions.map((seat: any) => submitted[seat]);
            state = resolvePendingActions(state, choices);
            (session as any).submittedActions = {};
            changed = true;
          } catch (err) {
            console.error(`[AI Runner] Exception in resolvePendingActions:`, err);
            break;
          }
          continue;
        } else {
          break;
        }
      }
    }

    if (steps >= maxSteps) {
      console.warn(`[AI Runner] Simulation step budget exceeded in server game loop.`);
    }

    if (!checkTileConservation(state)) {
      console.error(`[AI Runner] Tile conservation violated during server game advance. Total tiles not 108.`);
    }

    session.state = state;
    session.lastUpdatedAt = Date.now();
  } finally {
    session.actionLock = false;
  }
}
