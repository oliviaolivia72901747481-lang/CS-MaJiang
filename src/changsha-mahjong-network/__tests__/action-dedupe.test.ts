import { describe, it, expect, beforeEach } from 'vitest';
import { 
  isDuplicateAction, 
  recordAction, 
  clearOldActions, 
  clearAllDedupeCache,
  ActionDedupeKey
} from '../server/action-dedupe.js';
import { createRoom, clearAllRooms } from '../server/room-manager.js';
import { submitPlayerAction, startOnlineRound } from '../server/game-session.js';
import { Tile } from '../../changsha-mahjong/index.js';

describe('Action Deduplication Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllDedupeCache();
  });

  it('1. first action is not a duplicate', () => {
    const isDup = isDuplicateAction({
      roomId: '123',
      seat: 0,
      actionId: 'act-1'
    });

    expect(isDup).toBe(false);
  });

  it('2. identical actionId is recognized as duplicate after recording', () => {
    const key: ActionDedupeKey = {
      roomId: '123',
      seat: 0,
      actionId: 'act-1'
    };

    recordAction(key);

    const isDup = isDuplicateAction(key);
    expect(isDup).toBe(true);
  });

  it('3. actionIds are scoped and don not conflict across seats', () => {
    recordAction({ roomId: '123', seat: 0, actionId: 'act-1' });

    // Seat 1 should not see it as duplicate
    const isDupSeat1 = isDuplicateAction({ roomId: '123', seat: 1, actionId: 'act-1' });
    expect(isDupSeat1).toBe(false);
  });

  it('4. clearOldActions removes expired entries', () => {
    const now = Date.now();
    recordAction({ roomId: '123', seat: 0, actionId: 'act-expired' });

    // Simulate 70 seconds passing (TTL is 60s)
    clearOldActions(now + 70000);

    const isDup = isDuplicateAction({ roomId: '123', seat: 0, actionId: 'act-expired' });
    expect(isDup).toBe(false);
  });

  it('5. duplicate actions are ignored and return success: true, ignored: true', () => {
    const room = createRoom();
    const session = startOnlineRound(room.roomId);
    session.state.phase = 'playing';
    session.state.currentSeat = 0;

    const tile: Tile = { suit: 'wan', rank: 1, instanceId: 'w1' };
    session.state.players[0].hand = [tile];

    // Submit action first time
    const res1 = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1', actionId: 'act-1' }
    });
    expect(res1.success).toBe(true);
    expect(res1.ignored).toBeUndefined();

    // Submit action second time
    const res2 = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1', actionId: 'act-1' }
    });
    expect(res2.success).toBe(true);
    expect(res2.ignored).toBe(true);
  });
});
