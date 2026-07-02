import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { validateNetworkAction } from '../server/network-action-guard.js';
import { collectResponsesAfterDiscard } from '../../changsha-mahjong/controller/action-resolver.js';

describe('Variable Player Actions Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. Chi is only allowed from the active upper seat (getNextActiveSeat)', () => {
    const room = createRoom();
    room.seats[0] = {
      seat: 0,
      playerName: 'Alice',
      sessionId: 'sess0',
      token: 'tok0',
      socketId: 'sock0',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'David',
      sessionId: 'sess3',
      token: 'tok3',
      socketId: 'sock3',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 3);
    const state = session.state;

    // Give seat 0 a discardable tile and seat 2 a hand ready to Chi
    const p0 = state.players.find(p => p.seat === 0)!;
    const p2 = state.players.find(p => p.seat === 2)!;
    const p3 = state.players.find(p => p.seat === 3)!;

    p0.hand = [{ id: 1, suit: 'wan', rank: 3, instanceId: 'wan_3_inst' } as any];
    p2.hand = [
      { id: 2, suit: 'wan', rank: 1, instanceId: 'wan_1_inst' } as any,
      { id: 3, suit: 'wan', rank: 2, instanceId: 'wan_2_inst' } as any
    ];
    p3.hand = [
      { id: 4, suit: 'wan', rank: 1, instanceId: 'wan_1_inst_3' } as any,
      { id: 5, suit: 'wan', rank: 2, instanceId: 'wan_2_inst_3' } as any
    ];

    state.lastDiscard = {
      tile: { id: 1, suit: 'wan', rank: 3, instanceId: 'wan_3_inst' } as any,
      fromSeat: 0
    };

    const responses = collectResponsesAfterDiscard(state);
    
    // Since activeSeats is [0, 2, 3], seat 0's next active seat is 2.
    // So seat 2 is allowed to Chi seat 0's discard.
    const seat2Chi = responses.find(a => a.seat === 2 && a.type === 'chi');
    expect(seat2Chi).toBeDefined();

    // Seat 3 is NOT the next active seat of seat 0, so it is NOT allowed to Chi.
    const seat3Chi = responses.find(a => a.seat === 3 && a.type === 'chi');
    expect(seat3Chi).toBeUndefined();
  });

  it('2. Discard/Action from inactive seat is rejected by guard', () => {
    const room = createRoom();
    room.seats[0] = {
      seat: 0,
      playerName: 'Alice',
      sessionId: 'sess0',
      token: 'tok0',
      socketId: 'sock0',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[1] = {
      seat: 1,
      playerName: 'Bob',
      sessionId: 'sess1',
      token: 'tok1',
      socketId: 'sock1',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    // Seat 2 is inactive
    const guardRes = validateNetworkAction({
      state,
      seat: 2,
      action: { type: 'discard', tileInstanceId: 'any_inst' }
    });

    expect(guardRes.ok).toBe(false);
    expect(guardRes.reason).toBe('Inactive seat cannot submit actions.');
  });
});
