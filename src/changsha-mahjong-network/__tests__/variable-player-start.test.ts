import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms, getRoom } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';

describe('Variable Player Start Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. 2 humans can start a 2-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');

    const session = startOnlineRound(room.roomId, 2);
    expect(session.state.activeSeats).toEqual([0, 1]);
    expect(session.state.gamePlayerCount).toBe(2);
    expect(room.status).toBe('playing');
  });

  it('2. 3 humans can start a 3-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');

    const session = startOnlineRound(room.roomId, 3);
    expect(session.state.activeSeats).toEqual([0, 1, 2]);
    expect(session.state.gamePlayerCount).toBe(3);
  });

  it('3. 4 humans can start a 4-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    joinRoom(room.roomId, 'Charlie');
    joinRoom(room.roomId, 'David');

    const session = startOnlineRound(room.roomId, 4);
    expect(session.state.activeSeats).toEqual([0, 1, 2, 3]);
    expect(session.state.gamePlayerCount).toBe(4);
  });

  it('4. 1 human + 1 AI can start a 2-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    // fillAIToPlayerCount = 2
    const session = startOnlineRound(room.roomId, 2, 2);
    expect(session.state.activeSeats).toEqual([0, 1]);
    expect(session.state.gamePlayerCount).toBe(2);
    expect(room.seats[1]?.isAI).toBe(true);
  });

  it('5. 2 humans + 1 AI can start a 3-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId, 3, 3);
    expect(session.state.activeSeats).toEqual([0, 1, 2]);
    expect(session.state.gamePlayerCount).toBe(3);
    expect(room.seats[2]?.isAI).toBe(true);
  });

  it('6. 2 humans + 2 AI can start a 4-player game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    const session = startOnlineRound(room.roomId, 4, 4);
    expect(session.state.activeSeats).toEqual([0, 1, 2, 3]);
    expect(session.state.gamePlayerCount).toBe(4);
    expect(room.seats[2]?.isAI).toBe(true);
    expect(room.seats[3]?.isAI).toBe(true);
  });

  it('7. 1 human + 0 AI cannot start a game', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    expect(() => startOnlineRound(room.roomId, 2)).toThrow('Room has 1 players, but requested player count is 2');
  });

  it('8. activeSeats are solidified after game start', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    joinRoom(room.roomId, 'Bob');
    
    const session = startOnlineRound(room.roomId, 2);
    expect(room.activeSeats).toEqual([0, 1]);
    
    // Room status transitions, blocking new socket joins
    expect(room.status).not.toBe('waiting');
  });
});
