import { describe, expect, it, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';
import { shouldAcceptIncomingView } from '../client/useOnlineMahjongGame.js';

describe('state version sync', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('starts online rounds at version 1 and includes that version in visible views', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId);
    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: false, 3: false },
      aiSeats: room.aiSeats,
      stateVersion: session.stateVersion,
      lastEventId: session.lastEventId,
    });

    expect(session.stateVersion).toBe(1);
    expect(session.lastEventId).toBe('state-1');
    expect(view.stateVersion).toBe(1);
    expect(view.lastEventId).toBe('state-1');
    expect(typeof view.serverTime).toBe('number');
  });

  it('increments stateVersion after a successful discard and rejects stale actions without changing state', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId);
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    session.state.pendingActions = [];

    const tile = session.state.players[0].hand[0];
    const initialVersion = session.stateVersion;
    if (initialVersion === undefined) {
      throw new Error('Expected online session to initialize stateVersion');
    }

    const first = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: {
        type: 'discard',
        tileInstanceId: tile.instanceId,
        actionId: 'discard-versioned-1',
        stateVersion: initialVersion,
      },
    });

    expect(first.success).toBe(true);
    expect(session.stateVersion).toBe(initialVersion + 1);
    expect(session.state.discards[0]).toHaveLength(1);

    const handAfterFirst = session.state.players[0].hand.length;
    const stale = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: {
        type: 'discard',
        tileInstanceId: session.state.players[0].hand[0]?.instanceId || tile.instanceId,
        actionId: 'discard-versioned-stale',
        stateVersion: initialVersion,
      },
    });

    expect(stale.success).toBe(false);
    expect(stale.errorCode).toBe('STALE_ACTION');
    expect(session.stateVersion).toBe(initialVersion + 1);
    expect(session.state.players[0].hand).toHaveLength(handAfterFirst);
    expect(session.state.discards[0]).toHaveLength(1);
  });

  it('client accepts newer visible views and ignores older broadcasts', () => {
    expect(shouldAcceptIncomingView(null, { stateVersion: 3 } as any)).toBe(true);
    expect(shouldAcceptIncomingView({ stateVersion: 10 } as any, { stateVersion: 11 } as any)).toBe(true);
    expect(shouldAcceptIncomingView({ stateVersion: 10 } as any, { stateVersion: 10 } as any)).toBe(true);
    expect(shouldAcceptIncomingView({ stateVersion: 10 } as any, { stateVersion: 9 } as any)).toBe(false);
  });
});
