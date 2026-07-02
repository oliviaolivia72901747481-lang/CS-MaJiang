import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { getConnectionStatus, bindSocketToSeat, clearAllConnections } from '../server/connection-manager.js';

describe('Variable Player Reconnect & Trustee Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. inactive seats do not enter reconnecting or offline status', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    joinRoom(room.roomId, 'Bob');   // seat 1

    bindSocketToSeat({ socketId: 'sock0', roomId: room.roomId, seat: 0, playerName: 'Alice' });
    bindSocketToSeat({ socketId: 'sock1', roomId: room.roomId, seat: 1, playerName: 'Bob' });

    startOnlineRound(room.roomId, 2);
    
    // Check connection status record for all seats
    const status = getConnectionStatus(room.roomId);

    // Inactive seats should be false (offline), active seats should be true (online)
    expect(status[2]).toBe(false);
    expect(status[3]).toBe(false);
    expect(status[0]).toBe(true);
    expect(status[1]).toBe(true);
  });
});
