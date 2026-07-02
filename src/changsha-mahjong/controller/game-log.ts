import { GameState, GameLogEntry } from '../types/game.js';

export function addLog(
  state: GameState,
  action: string,
  seat?: 0 | 1 | 2 | 3,
  detail?: string
): GameState {
  let finalDetail = detail;
  if (seat !== undefined && (state as any).tempReasons && (state as any).tempReasons[seat]) {
    const reason = (state as any).tempReasons[seat];
    finalDetail = detail ? `${detail}：${reason}` : reason;
    delete (state as any).tempReasons[seat];
  }

  // Deduplicate: If same action, seat, and detail as last log, return unmodified state
  if (state.logs.length > 0) {
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog.action === action && lastLog.seat === seat && lastLog.detail === finalDetail) {
      return state;
    }
  }

  const step = state.logs.length + 1;
  const newEntry: GameLogEntry = {
    step,
    phase: state.phase,
    seat,
    action,
    detail: finalDetail,
  };
  return {
    ...state,
    logs: [...state.logs, newEntry],
  };
}

export function formatLog(entry: GameLogEntry): string {
  const stepStr = String(entry.step).padStart(3, '0');
  const seatStr = entry.seat !== undefined ? `玩家${entry.seat}` : '系统';
  const detailStr = entry.detail ? `，${entry.detail}` : '';
  return `[${stepStr}] ${seatStr} ${entry.action}${detailStr}`;
}
