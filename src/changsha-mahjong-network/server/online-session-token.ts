import { randomBytes } from 'crypto';

export interface OnlineSessionToken {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  token: string;
}

const activeTokens = new Map<string, OnlineSessionToken>();

export function createOnlineSessionToken(input: {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
}): OnlineSessionToken {
  const token = randomBytes(16).toString('hex');
  const sessionToken: OnlineSessionToken = {
    roomId: input.roomId,
    seat: input.seat,
    playerName: input.playerName,
    token,
  };
  activeTokens.set(token, sessionToken);
  return sessionToken;
}

export function verifyOnlineSessionToken(input: {
  roomId: string;
  seat: 0 | 1 | 2 | 3;
  playerName: string;
  token: string;
}): boolean {
  const record = activeTokens.get(input.token);
  if (!record) return false;

  return (
    record.roomId === input.roomId &&
    record.seat === input.seat &&
    record.playerName === input.playerName
  );
}

export function clearAllTokens(): void {
  activeTokens.clear();
}
