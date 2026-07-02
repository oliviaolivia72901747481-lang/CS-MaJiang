import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, clearAllRooms, joinRoom } from '../server/room-manager.js';
import { bindSocketToSeat, markSocketDisconnected, reconnectSeat, clearAllConnections } from '../server/connection-manager.js';
import { createOnlineSessionToken, verifyOnlineSessionToken, clearAllTokens } from '../server/online-session-token.js';
import { startOnlineRound } from '../server/game-session.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import { saveOnlineSession, loadOnlineSession, clearOnlineSession } from '../client/useOnlineMahjongGame.js';

describe('Reconnect Flow Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
    clearAllTokens();

    // Mock localStorage for Node environment testing
    const store: Record<string, string> = {};
    global.localStorage = {
      setItem: (key: string, value: string) => { store[key] = value; },
      getItem: (key: string) => store[key] || null,
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const key in store) delete store[key]; },
      length: 0,
      key: () => null
    } as any;
  });

  it('1. session state save and load correctly', () => {
    saveOnlineSession({
      roomId: '123456',
      seat: 2,
      playerName: 'Charlie',
      token: 'tok-999'
    });

    const session = loadOnlineSession();
    expect(session).toBeDefined();
    expect(session!.roomId).toBe('123456');
    expect(session!.seat).toBe(2);
    expect(session!.playerName).toBe('Charlie');
    expect(session!.token).toBe('tok-999');

    clearOnlineSession();
    expect(loadOnlineSession()).toBeNull();
  });

  it('2. player disconnect marks seat disconnected', () => {
    const room = createRoom();
    const seat = 0;
    joinRoom(room.roomId, 'Alice');
    
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat, playerName: 'Alice' });
    expect(room.seats[seat]!.connected).toBe(true);

    markSocketDisconnected('s1');
    expect(room.seats[seat]!.connected).toBe(false);
  });

  it('3. using token can reconnect seat', () => {
    const room = createRoom();
    const seat = 0;
    joinRoom(room.roomId, 'Alice');
    
    // Join and create token
    bindSocketToSeat({ socketId: 's1', roomId: room.roomId, seat, playerName: 'Alice' });
    const tok = createOnlineSessionToken({ roomId: room.roomId, seat, playerName: 'Alice' });

    // Disconnect
    markSocketDisconnected('s1');
    expect(room.seats[seat]!.connected).toBe(false);

    // Reconnect using token
    const tokenValid = verifyOnlineSessionToken({
      roomId: room.roomId,
      seat,
      playerName: 'Alice',
      token: tok.token
    });
    expect(tokenValid).toBe(true);

    const success = reconnectSeat({
      socketId: 's2',
      roomId: room.roomId,
      seat,
      playerName: 'Alice'
    });

    expect(success).toBe(true);
    expect(room.seats[seat]!.connected).toBe(true);
    expect(room.seats[seat]!.socketId).toBe('s2');
  });

  it('4. reconnected player receives custom PlayerVisibleView', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    joinRoom(room.roomId, 'Dave');

    const session = startOnlineRound(room.roomId);

    // Reconnect seat 0 with new socket
    bindSocketToSeat({ socketId: 'new-socket', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    expect(view.roomId).toBe(room.roomId);
    expect(view.seat).toBe(0);
    expect(view.self.hand.length).toBeGreaterThan(0);
  });

  it('5. reconnected view does not leak other player hand cards', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    joinRoom(room.roomId, 'Dave');

    const session = startOnlineRound(room.roomId);

    // Reconnect seat 0
    bindSocketToSeat({ socketId: 'new-socket', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: true },
      aiSeats: room.aiSeats
    });

    // verify hands are undefined for opponents
    view.opponents.forEach(opp => {
      expect(opp.hand).toBeUndefined();
    });
  });
});
