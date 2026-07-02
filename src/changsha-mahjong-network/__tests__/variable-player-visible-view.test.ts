import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';

describe('Variable Player Visible View Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. 2-player view shows exactly 1 opponent and hides inactive seats', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: false, 3: false },
      aiSeats: [],
      playerNames: { 0: 'Alice', 1: 'Bob', 2: '', 3: '' }
    });

    expect(view.opponents.length).toBe(1);
    expect(view.opponents[0].seat).toBe(1);
    expect(view.opponents[0].playerName).toBe('Bob');
    
    // Check that inactive seats do not leak
    expect(JSON.stringify(view)).not.toContain('player_2');
    expect(JSON.stringify(view)).not.toContain('player_3');
  });

  it('2. 3-player view shows exactly 2 opponents and hides inactive seats', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');

    const session = startOnlineRound(room.roomId, 3);
    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: true, 2: true, 3: false },
      aiSeats: [],
      playerNames: { 0: 'Alice', 1: 'Bob', 2: 'Charlie', 3: '' }
    });

    expect(view.opponents.length).toBe(2);
    expect(view.opponents.map(o => o.seat).sort()).toEqual([1, 2]);
    expect(JSON.stringify(view)).not.toContain('player_3');
  });
});
