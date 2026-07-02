import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';

describe('Game Session Server Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. startOnlineRound initializes GameState and sets profiles', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    
    const session = startOnlineRound(room.roomId);
    expect(session.roomId).toBe(room.roomId);
    expect(session.state.phase).toBeDefined();
    expect(session.state.players[0].aiProfile).toBe('balanced');
    expect(room.status).toBe('playing');
  });

  it('2. discard action is validated by seat turn', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    const session = startOnlineRound(room.roomId);
    
    // Force seat 1's turn
    session.state.phase = 'playing';
    session.state.currentSeat = 1;

    // Discard from seat 0 should be rejected
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'any-id' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("turn");
  });

  it('3. discard action is rejected if tile not held', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    const session = startOnlineRound(room.roomId);
    
    session.state.phase = 'playing';
    session.state.currentSeat = 0;

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'non-existent-instance-id' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("hold this tile");
  });

  it('4. actions are rejected if game session has already ended', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'ended';
    session.state.roundEnded = true;

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: 'some-id' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("already ended");
  });

  it('5. actions are rejected if phase is not waitingForResponses', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'playing';

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'hu' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("waiting for response actions");
  });

  it('6. actionLock prevents concurrent processing', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.actionLock = true; // Simulating active processing
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'hu' },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("locked");
  });
});
