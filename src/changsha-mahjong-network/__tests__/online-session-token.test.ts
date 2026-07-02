import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createOnlineSessionToken, 
  verifyOnlineSessionToken, 
  clearAllTokens 
} from '../server/online-session-token.js';

describe('Online Session Token Tests', () => {
  beforeEach(() => {
    clearAllTokens();
  });

  it('1. can create token', () => {
    const t = createOnlineSessionToken({
      roomId: '123456',
      seat: 0,
      playerName: 'Alice'
    });

    expect(t.roomId).toBe('123456');
    expect(t.seat).toBe(0);
    expect(t.playerName).toBe('Alice');
    expect(t.token).toBeDefined();
    expect(t.token.length).toBeGreaterThan(10);
  });

  it('2. valid token verification passes', () => {
    const t = createOnlineSessionToken({
      roomId: '123456',
      seat: 1,
      playerName: 'Bob'
    });

    const isValid = verifyOnlineSessionToken({
      roomId: '123456',
      seat: 1,
      playerName: 'Bob',
      token: t.token
    });

    expect(isValid).toBe(true);
  });

  it('3. invalid token verification fails', () => {
    const t = createOnlineSessionToken({
      roomId: '123456',
      seat: 1,
      playerName: 'Bob'
    });

    // Wrong roomId
    expect(verifyOnlineSessionToken({
      roomId: '999999',
      seat: 1,
      playerName: 'Bob',
      token: t.token
    })).toBe(false);

    // Wrong seat
    expect(verifyOnlineSessionToken({
      roomId: '123456',
      seat: 2,
      playerName: 'Bob',
      token: t.token
    })).toBe(false);

    // Wrong playerName
    expect(verifyOnlineSessionToken({
      roomId: '123456',
      seat: 1,
      playerName: 'Alice',
      token: t.token
    })).toBe(false);

    // Wrong token
    expect(verifyOnlineSessionToken({
      roomId: '123456',
      seat: 1,
      playerName: 'Bob',
      token: 'wrongtoken123'
    })).toBe(false);
  });

  it('4. token does not contain hand information', () => {
    const t = createOnlineSessionToken({
      roomId: '123456',
      seat: 0,
      playerName: 'Alice'
    });

    const str = JSON.stringify(t);
    expect(str).not.toContain('hand');
    expect(str).not.toContain('tiles');
  });

  it('5. token does not contain wall information', () => {
    const t = createOnlineSessionToken({
      roomId: '123456',
      seat: 0,
      playerName: 'Alice'
    });

    const str = JSON.stringify(t);
    expect(str).not.toContain('wall');
    expect(str).not.toContain('tileFlow');
  });
});
