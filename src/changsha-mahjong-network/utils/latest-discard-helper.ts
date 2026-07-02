import { Tile } from '../../changsha-mahjong/types/tile.js';
import { PlayerVisibleView } from '../server/network-types.js';

export interface LatestDiscardEvent {
  seat: number;
  playerLabel: string;
  tile: Tile;
  tileKey: string;
  logIndex?: number;
  stillInRiver: boolean;
}

export interface ActionSourceEvent {
  seat: number;
  playerLabel: string;
  tile: Tile;
  tileKey: string;
}

export function getPlayerLabelBySeat(view: PlayerVisibleView, targetSeat: number, selfSeat: number): string {
  if (targetSeat === selfSeat) {
    return '我';
  }
  const opp = view.opponents.find(o => o.seat === targetSeat);
  return opp?.playerName || `玩家 ${targetSeat}`;
}

export function getPlayerDiscardsBySeat(view: PlayerVisibleView, targetSeat: number): Tile[] {
  if (targetSeat === view.seat) {
    return view.self.discards || [];
  }
  const opp = view.opponents.find(o => o.seat === targetSeat);
  return opp?.discards || [];
}

/**
 * Gets the globally latest discard event from logs.
 * It scans logs backward for the most recent "打出" log and verifies
 * that the tile is still present at the end of that player's river.
 */
export function getLatestDiscardEvent(view: PlayerVisibleView, selfSeat: number): LatestDiscardEvent | null {
  if (!view.logs || view.logs.length === 0) {
    return null;
  }

  const logDiscardCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const log of view.logs) {
    if (log.action && log.action.includes('打出') && log.seat !== undefined) {
      logDiscardCounts[log.seat] = (logDiscardCounts[log.seat] || 0) + 1;
    }
  }

  const seatDiscards: Record<number, Tile[]> = {};
  const riverPointers: Record<number, number> = {};
  
  const activeSeats = [0, 1, 2, 3];
  for (const s of activeSeats) {
    const discards = getPlayerDiscardsBySeat(view, s);
    seatDiscards[s] = discards;
    const N = discards.length;
    const M = logDiscardCounts[s] || 0;
    riverPointers[s] = N > M ? N - M : 0;
  }

  const matchedEvents: LatestDiscardEvent[] = [];

  for (let i = 0; i < view.logs.length; i++) {
    const log = view.logs[i];
    if (log.action && log.action.includes('打出') && log.seat !== undefined) {
      const s = log.seat;
      const discards = seatDiscards[s];
      const ptr = riverPointers[s];

      if (discards && ptr < discards.length) {
        const tile = discards[ptr];
        const tileKey = `${tile.suit}_${tile.rank}`;
        if (log.detail === tileKey) {
          matchedEvents.push({
            seat: s,
            playerLabel: getPlayerLabelBySeat(view, s, selfSeat),
            tile,
            tileKey,
            logIndex: i,
            stillInRiver: true,
          });
          riverPointers[s]++;
        }
      }
    }
  }

  if (matchedEvents.length > 0) {
    matchedEvents.sort((a, b) => (b.logIndex ?? 0) - (a.logIndex ?? 0));
    return matchedEvents[0];
  }

  return null;
}

/**
 * Gets the trigger source tile details for pending actions (eat, peng, gang, hu).
 */
export function getActionSourceEvent(view: PlayerVisibleView, selfSeat: number): ActionSourceEvent | null {
  const activeResponse = view.pendingActions.find(
    a => a.type === 'hu' || a.type === 'peng' || a.type === 'chi' || a.type === 'mingGang'
  );
  if (!activeResponse || !activeResponse.tile) {
    return null;
  }

  const tileKey = `${activeResponse.tile.suit}_${activeResponse.tile.rank}`;
  let sourceSeat = -1;

  if (view.logs) {
    for (let i = view.logs.length - 1; i >= 0; i--) {
      const log = view.logs[i];
      if (log.action && log.action.includes('打出') && log.seat !== undefined && log.detail === tileKey) {
        sourceSeat = log.seat;
        break;
      }
    }
  }

  return {
    seat: sourceSeat,
    playerLabel: sourceSeat !== -1 ? getPlayerLabelBySeat(view, sourceSeat, selfSeat) : '未知玩家',
    tile: activeResponse.tile,
    tileKey,
  };
}
