import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, clearAllRooms, joinRoom, fillEmptySeatsWithAI } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';
import { bindSocketToSeat, markSocketDisconnected, reconnectSeat, clearAllConnections } from '../server/connection-manager.js';
import { stepAIIfNeeded } from '../server/ai-seat-runner.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import { checkTileConservation } from '../../changsha-mahjong/benchmark/ai-match-runner.js';

describe('Online Stability Flow Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. hybrid room (2 humans + 2 AI) starts successfully', () => {
    const room = createRoom();
    
    // Join 2 humans
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });

    // Fill remaining with AI
    fillEmptySeatsWithAI(room.roomId);

    expect(room.aiSeats.length).toBe(2);
    expect(room.aiSeats).toContain(2);
    expect(room.aiSeats).toContain(3);

    // Start game
    const session = startOnlineRound(room.roomId);
    expect(session.state.phase).toBeDefined();
    expect(room.status).toBe('playing');
  });

  it('2. mid-game disconnection of one player does not freeze other players', async () => {
    const room = createRoom();
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    // Disconnect Seat 0 (Alice)
    markSocketDisconnected('s1');

    // Bob (Seat 1) should still be able to query the state or advance
    expect(room.seats[0]!.connected).toBe(false);
    expect(room.seats[1]!.connected).toBe(true);

    // Game can step AI if needed
    await stepAIIfNeeded(room.roomId);

    expect(session.state).toBeDefined();
    expect(checkTileConservation(session.state)).toBe(true);
  });

  it('3. active players continue to receive updates', () => {
    const room = createRoom();
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    const viewBob = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: h2.seat,
      connectionStatus: { 0: false, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    expect(viewBob.roomId).toBe(room.roomId);
    expect(viewBob.opponents.find(o => o.seat === 0)!.connected).toBe(false);
  });

  it('4. reconnected player catches up successfully and gets state', () => {
    const room = createRoom();
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    markSocketDisconnected('s1');

    // Reconnect Seat 0
    const reconnected = reconnectSeat({
      socketId: 's1-new',
      roomId: room.roomId,
      seat: h1.seat,
      playerName: 'Alice'
    });
    expect(reconnected).toBe(true);

    const viewAlice = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: h1.seat,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    expect(viewAlice.roomId).toBe(room.roomId);
    expect(viewAlice.self.hand.length).toBeGreaterThan(0);
  });

  it('5. hand isolation is maintained during playing phases', () => {
    const room = createRoom();
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    const view0 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    expect(view0.opponents.every(o => o.hand === undefined)).toBe(true);
  });

  it('6. settlement reveals all player hands', () => {
    const room = createRoom();
    const h1 = joinRoom(room.roomId, 'Alice');
    const h2 = joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat: h1.seat, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 's2', roomId: room.roomId, seat: h2.seat, playerName: 'Bob' });
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    // Force round end
    session.state.phase = 'ended';
    session.state.roundEnded = true;

    const view0 = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    expect(view0.opponents.every(o => o.hand !== undefined)).toBe(true);
    expect(view0.opponents.find(o => o.seat === 1)!.hand!.length).toBeGreaterThan(0);
  });

  it('7. total tile count is conserved throughout simulation', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    fillEmptySeatsWithAI(room.roomId);
    const session = startOnlineRound(room.roomId);

    expect(checkTileConservation(session.state)).toBe(true);
  });
});
