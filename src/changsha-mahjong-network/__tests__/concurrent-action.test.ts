import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, clearAllRooms, joinRoom } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';
import { bindSocketToSeat, clearAllConnections } from '../server/connection-manager.js';
import { checkTileConservation } from '../../changsha-mahjong/benchmark/ai-match-runner.js';
import { Tile } from '../../changsha-mahjong/index.js';

describe('Concurrent Action Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. actionLock prevents simultaneous action execution', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    // Lock session
    session.actionLock = true;

    // Submit action while locked
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'any' }
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('locked');
  });

  it('2. only current player can discard', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId);
    
    session.state.phase = 'playing';
    session.state.currentSeat = 0; // Seat 0's turn

    // Seat 1 tries to discard
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 1,
      action: { type: 'discard', tileInstanceId: 'any' }
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("turn");
  });

  it('3. duplicate discard request in rapid succession is blocked by actionId', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);
    
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    
    const tile: Tile = { suit: 'wan', rank: 1, instanceId: 'w1' };
    session.state.players[0].hand = [tile];

    // First request
    const res1 = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1', actionId: 'act-discard-1' }
    });
    expect(res1.success).toBe(true);

    // Second request with same actionId (simulated quick double tap)
    const res2 = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1', actionId: 'act-discard-1' }
    });
    expect(res2.success).toBe(true);
    expect(res2.ignored).toBe(true); // Should be ignored safely
  });

  it('4. expired action in waitingForResponses phase is rejected', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);
    
    session.state.phase = 'playing'; // State is not waitingForResponses

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'pass' }
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('response');
  });

  it('5. tile count remains conserved at 108 throughout actions', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);
    
    expect(checkTileConservation(session.state)).toBe(true);
  });

  it('6. actionLock is released when action validation fails', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);
    
    // Submit invalid action (should fail validation)
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'nonexistent-id' }
    });

    expect(res.success).toBe(false);
    expect(session.actionLock).toBe(false); // Lock must be released
  });

  it('7. actionLock is released when action execution succeeds', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    
    const tile: Tile = { suit: 'wan', rank: 1, instanceId: 'w1' };
    session.state.players[0].hand = [tile];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'w1' }
    });

    expect(res.success).toBe(true);
    expect(session.actionLock).toBe(false); // Lock must be released
  });
});
