import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, fillEmptySeatsWithAI, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';

describe('Information Boundary and Leak Prevention Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. player 0 view does not contain hands of players 1, 2, or 3', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    fillEmptySeatsWithAI(room.roomId);

    const session = startOnlineRound(room.roomId);
    
    const connectionStatus = { 0: true, 1: true, 2: true, 3: true };
    const view0 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus,
      aiSeats: room.aiSeats,
    });

    const opp1 = view0.opponents.find(o => o.seat === 1);
    const opp2 = view0.opponents.find(o => o.seat === 2);
    const opp3 = view0.opponents.find(o => o.seat === 3);

    expect((opp1 as any).hand).toBeUndefined();
    expect((opp2 as any).hand).toBeUndefined();
    expect((opp3 as any).hand).toBeUndefined();
  });

  it('2. player 1 view does not contain hands of players 0, 2, or 3', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    fillEmptySeatsWithAI(room.roomId);

    const session = startOnlineRound(room.roomId);
    
    const connectionStatus = { 0: true, 1: true, 2: true, 3: true };
    const view1 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 1,
      connectionStatus,
      aiSeats: room.aiSeats,
    });

    const opp0 = view1.opponents.find(o => o.seat === 0);
    const opp2 = view1.opponents.find(o => o.seat === 2);
    const opp3 = view1.opponents.find(o => o.seat === 3);

    expect((opp0 as any).hand).toBeUndefined();
    expect((opp2 as any).hand).toBeUndefined();
    expect((opp3 as any).hand).toBeUndefined();
  });

  it('3. view does not contain wall contents or future draws', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    fillEmptySeatsWithAI(room.roomId);

    const session = startOnlineRound(room.roomId);

    const view0 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: false, 2: false, 3: false },
      aiSeats: room.aiSeats,
    });

    expect((view0 as any).wall).toBeUndefined();
    expect((view0 as any).deck).toBeUndefined();
    expect(view0.wallRemainingCount).toBe(session.state.wall.length);
  });

  it('4. JSON serialized view does not leak opponent tile instanceIds', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    fillEmptySeatsWithAI(room.roomId);

    const session = startOnlineRound(room.roomId);

    const view0 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: false, 3: false },
      aiSeats: room.aiSeats,
    });

    const serialized = JSON.stringify(view0);
    
    // Get instanceIds of opponent 1
    const p1Hand = session.state.players[1].hand;
    for (const t of p1Hand) {
      expect(serialized).not.toContain(t.instanceId);
    }
  });

  it('5. view hides hands during active play and only reveals at ended phase', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'playing';
    session.state.roundEnded = false;

    const activeView = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: false, 2: false, 3: false },
      aiSeats: room.aiSeats,
    });

    expect(activeView.opponents.every(o => o.hand === undefined)).toBe(true);

    // Transition to ended phase
    session.state.phase = 'ended';
    session.state.roundEnded = true;

    const endedView = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: false, 2: false, 3: false },
      aiSeats: room.aiSeats,
    });

    expect(endedView.opponents.every(o => o.hand !== undefined && o.hand.length > 0)).toBe(true);
  });
});
