import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoom, clearAllRooms, createRoom, joinRoom } from '../server/room-manager.js';
import { clearAllConnections, bindSocketToSeat, getConnectionStatus } from '../server/connection-manager.js';
import { isSeatTrustee, stepAIIfNeeded } from '../server/ai-seat-runner.js';
import { startOnlineRound } from '../server/game-session.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';

const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });

vi.mock('socket.io', () => {
  return {
    Server: vi.fn().mockImplementation(() => {
      return {
        on: mockOn,
        to: mockTo,
        sockets: {
          sockets: new Map()
        }
      };
    }),
  };
});

describe('Playing Reconnect and AI Trustee Tests', () => {
  let connectionHandler: Function;

  beforeEach(async () => {
    clearAllRooms();
    clearAllConnections();
    mockOn.mockClear();
    mockEmit.mockClear();
    mockTo.mockClear();

    await import('../server/index.js');

    const connectionCall = mockOn.mock.calls.find(call => call[0] === 'connection');
    if (connectionCall) {
      connectionHandler = connectionCall[1];
    }
  });

  it('1. playing stage: disconnect marks player as reconnecting, does not release seat', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_play',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_play', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('reconnecting');
  });

  it('2. within 30s, player is still reconnecting and is NOT in trustee mode', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_play2',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_play2', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();

    // Check trustee status at 20 seconds later
    const now = Date.now();
    expect(isSeatTrustee(room.roomId, 0, now + 20000)).toBe(false);
  });

  it('3. after 30s, player enters trustee mode (isSeatTrustee returns true)', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_play3',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_play3', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    socketListeners['disconnect']();

    // Check trustee status at 31 seconds later
    const now = Date.now();
    expect(isSeatTrustee(room.roomId, 0, now + 31000)).toBe(true);
  });

  it('4. trustee player auto-plays and appends logs', async () => {
    const room = createRoom();
    // Fill AI for other seats and start game
    joinRoom(room.roomId, 'HumanPlayer');
    bindSocketToSeat({ socketId: 'socket_human', roomId: room.roomId, seat: 0, playerName: 'HumanPlayer' });
    
    room.seats[1] = {
      seat: 1,
      playerName: 'AI_1',
      sessionId: 'ai-session-1',
      token: 'ai-token-1',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[2] = {
      seat: 2,
      playerName: 'AI_2',
      sessionId: 'ai-session-2',
      token: 'ai-token-2',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'AI_3',
      sessionId: 'ai-session-3',
      token: 'ai-token-3',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    startOnlineRound(room.roomId);

    // Make HumanPlayer disconnect
    room.seats[0]!.connectionState = 'reconnecting';
    room.seats[0]!.disconnectedAt = Date.now() - 35000; // disconnected 35s ago

    expect(isSeatTrustee(room.roomId, 0)).toBe(true);

    // Run stepAIIfNeeded to trigger bot takeover step
    await stepAIIfNeeded(room.roomId);

    const state = room.gameSession!.state;
    // Check that some log entries are written by trustee
    const hasTrusteeLog = state.logs.some(log => log.action.includes('系统托管出牌') || log.action.includes('系统托管响应'));
    expect(hasTrusteeLog).toBe(true);
  });

  it('5. player reconnects within 120s and resumes control', () => {
    const socketListenersOld: Record<string, Function> = {};
    const mockSocketOld = {
      id: 'socket_human_old',
      on: (event: string, callback: Function) => {
        socketListenersOld[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocketOld);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'HumanPlayer');
    const session = room.seats[0]!;
    bindSocketToSeat({ socketId: 'socket_human_old', roomId: room.roomId, seat: 0, playerName: 'HumanPlayer' });

    socketListenersOld['disconnect']();

    // Reconnect new socket within 90 seconds
    const socketListenersNew: Record<string, Function> = {};
    const mockSocketNew = {
      id: 'socket_human_new',
      on: (event: string, callback: Function) => {
        socketListenersNew[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocketNew);

    socketListenersNew['game:sync']({
      roomId: room.roomId,
      seat: 0,
      sessionId: session.sessionId,
      token: session.token
    });

    expect(room.seats[0]!.connectionState).toBe('online');
    expect(room.seats[0]!.socketId).toBe('socket_human_new');
  });

  it('6. player does not reconnect within 120s -> connectionState becomes offline, seat kept', () => {
    const socketListeners: Record<string, Function> = {};
    const mockSocket = {
      id: 'socket_human_offline',
      on: (event: string, callback: Function) => {
        socketListeners[event] = callback;
      },
      emit: vi.fn(),
    };

    connectionHandler(mockSocket);

    const room = createRoom();
    room.status = 'playing';
    joinRoom(room.roomId, 'HumanPlayer');
    bindSocketToSeat({ socketId: 'socket_human_offline', roomId: room.roomId, seat: 0, playerName: 'HumanPlayer' });

    socketListeners['disconnect']();

    // Trigger connectionStatus check after 125 seconds
    getConnectionStatus(room.roomId, Date.now() + 125000);

    expect(room.seats[0]).not.toBeNull();
    expect(room.seats[0]!.connectionState).toBe('offline');
  });

  it('7. trustee action does not leak other players\' hand cards', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    bindSocketToSeat({ socketId: 'socket_a', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    joinRoom(room.roomId, 'Bob');
    bindSocketToSeat({ socketId: 'socket_b', roomId: room.roomId, seat: 1, playerName: 'Bob' });

    room.seats[2] = {
      seat: 2,
      playerName: 'AI_2',
      sessionId: 'ai-session-2',
      token: 'ai-token-2',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'AI_3',
      sessionId: 'ai-session-3',
      token: 'ai-token-3',
      socketId: null,
      connectionState: 'ai',
      connected: true,
      isAI: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    startOnlineRound(room.roomId);

    // Build visible view for Alice (seat 0)
    const connStatus = getConnectionStatus(room.roomId);
    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      seat: 0,
      state: room.gameSession!.state,
      connectionStatus: connStatus,
      aiSeats: room.aiSeats,
      playerNames: { 0: 'Alice', 1: 'Bob', 2: 'AI_2', 3: 'AI_3' }
    });

    // Bob is opponent 0 in Alice's view. Check Bob's hand
    const bobOpponentView = view.opponents.find(o => o.seat === 1)!;
    expect(bobOpponentView.hand).toBeUndefined(); // Hand is hidden
  });
});
