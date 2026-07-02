export interface ActionDedupeKey {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  actionId: string;
}

const processedActions = new Map<string, number>();
const ACTION_TTL_MS = 60000; // Keep actionIds for 1 minute to prevent double-clicks

export function isDuplicateAction(key: ActionDedupeKey): boolean {
  if (!key.actionId) return false;
  const keyStr = `${key.roomId}_${key.seat}_${key.actionId}`;
  return processedActions.has(keyStr);
}

export function recordAction(key: ActionDedupeKey): void {
  if (!key.actionId) return;
  const keyStr = `${key.roomId}_${key.seat}_${key.actionId}`;
  processedActions.set(keyStr, Date.now());
}

export function clearOldActions(now: number): void {
  for (const [keyStr, ts] of processedActions.entries()) {
    if (now - ts > ACTION_TTL_MS) {
      processedActions.delete(keyStr);
    }
  }
}

export function clearAllDedupeCache(): void {
  processedActions.clear();
}
