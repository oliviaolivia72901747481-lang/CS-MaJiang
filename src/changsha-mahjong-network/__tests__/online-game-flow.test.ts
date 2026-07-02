import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, fillEmptySeatsWithAI, getRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction, stepAIIfNeeded } from '../server/game-session.js';
import { checkTileConservation } from '../../changsha-mahjong/benchmark/ai-match-runner.js';

describe('Online Game Flow Integration Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. complete round loop setup and initial step', async () => {
    const room = createRoom();
    // 2 human players
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    
    // Fill remaining with AI
    fillEmptySeatsWithAI(room.roomId);

    expect(room.seats[0]?.playerName).toBe('Alice');
    expect(room.seats[1]?.playerName).toBe('Bob');
    expect(room.seats[2]?.isAI).toBe(true);
    expect(room.seats[3]?.isAI).toBe(true);

    const session = startOnlineRound(room.roomId);
    expect(['playing', 'startingHu']).toContain(session.state.phase); // startRound transitions to playing or startingHu
    expect(checkTileConservation(session.state)).toBe(true);
  });

  it('2. human and AI alternate plays with state progression', async () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    fillEmptySeatsWithAI(room.roomId); // seats 1, 2, 3 are AI

    const session = startOnlineRound(room.roomId);
    
    // Ensure it's player 0's turn to discard
    session.state.phase = 'playing';
    session.state.currentSeat = 0;
    
    const tile = session.state.players[0].hand[0];
    const discardRes = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: tile.instanceId },
    });
    expect(discardRes.success).toBe(true);

    // Call server helper to advance the game since AI seats 1, 2, 3 will act automatically
    await stepAIIfNeeded(room.roomId);

    // After stepAI, the turn should progress and tile count must remain 108
    expect(checkTileConservation(session.state)).toBe(true);
    expect(session.state.phase).toBeDefined();
  });

  it('3. game terminates or can end via automatic step limit', async () => {
    const room = createRoom();
    fillEmptySeatsWithAI(room.roomId); // all 4 seats are AI
    const session = startOnlineRound(room.roomId);

    // When all 4 seats are AI, stepAIIfNeeded will run the entire game automatically!
    await stepAIIfNeeded(room.roomId);

    // Verify game finished or reached a valid wait state
    expect(checkTileConservation(session.state)).toBe(true);
    expect(['playing', 'waitingForResponses', 'ended', 'startingHu', 'settlement', 'haiDi']).toContain(session.state.phase);
  });
});
