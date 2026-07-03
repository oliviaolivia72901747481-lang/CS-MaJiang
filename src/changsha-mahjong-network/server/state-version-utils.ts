import type { GameSession } from './network-types.js';
import { auditGameStateInvariants } from '../utils/state-invariant-audit.js';

export function initializeGameSessionVersion(session: GameSession): void {
  session.stateVersion = 1;
  session.lastEventId = 'state-1';
  session.duplicateActionCount = 0;
  session.actionAuditLog = [];
}

export function markGameSessionStateChanged(session: GameSession): void {
  session.stateVersion = (session.stateVersion || 0) + 1;
  session.lastEventId = `state-${session.stateVersion}`;
  session.lastUpdatedAt = Date.now();
}

export function shouldRunStateInvariantAudit(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_STATE_AUDIT === '1';
}

export function auditGameSessionStateIfEnabled(session: GameSession): void {
  if (!shouldRunStateInvariantAudit()) return;

  const audit = auditGameStateInvariants(session.state);
  if (!audit.ok) {
    console.error('[StateInvariantViolation]', audit.violations);
  }
}
