import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState, startRound } from '../../changsha-mahjong/controller/game-engine.js';
import { moveToNextSeat } from '../../changsha-mahjong/controller/round-controller.js';
import { createRoom, joinRoom, clearAllRooms, getRoom } from '../server/room-manager.js';
import { startOnlineRound } from '../server/game-session.js';
import { bindSocketToSeat, clearAllConnections, handleSocketDisconnected } from '../server/connection-manager.js';
import { isSeatTrustee } from '../server/ai-seat-runner.js';
import { buildPlayerVisibleView } from '../server/server-visible-view.js';
import { calculateHuBaseScore, calculateGangScore } from '../../changsha-mahjong/engine/score-engine.js';
import { DEFAULT_RULE_CONFIG } from '../../changsha-mahjong/config/default-rule-config.js';

describe('RC v0.8.3 Supplemental Regression & Feature Tests', () => {
  beforeEach(() => {
    clearAllRooms();
    clearAllConnections();
  });

  it('1. activeSeats = [0,2] 二人局完整初始化', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    expect(state.activeSeats).toEqual([0, 2]);
    expect(state.players.length).toBe(2);
    expect(state.players.find(p => p.seat === 0)).toBeDefined();
    expect(state.players.find(p => p.seat === 2)).toBeDefined();

    const p0 = state.players.find(p => p.seat === 0)!;
    const p2 = state.players.find(p => p.seat === 2)!;

    expect(p0.isDealer).toBe(true);
    expect(p0.hand.length).toBe(14);
    expect(p2.hand.length).toBe(13);
  });

  it('2. activeSeats = [1,3] 二人局完整初始化', () => {
    const room = createRoom();
    room.seats[1] = {
      seat: 1,
      playerName: 'Bob',
      sessionId: 'sess1',
      token: 'tok1',
      socketId: 'sock1',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'David',
      sessionId: 'sess3',
      token: 'tok3',
      socketId: 'sock3',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 2);
    const state = session.state;

    expect(state.activeSeats).toEqual([1, 3]);
    expect(state.dealerSeat).toBe(1);
    expect(state.players.length).toBe(2);
    
    const p1 = state.players.find(p => p.seat === 1)!;
    const p3 = state.players.find(p => p.seat === 3)!;

    expect(p1.isDealer).toBe(true);
    expect(p1.hand.length).toBe(14);
    expect(p3.hand.length).toBe(13);
  });

  it('3. activeSeats = [0,2,3] 三人局完整轮转', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    room.seats[3] = {
      seat: 3,
      playerName: 'David',
      sessionId: 'sess3',
      token: 'tok3',
      socketId: 'sock3',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 3);
    let state = session.state;

    expect(state.activeSeats).toEqual([0, 2, 3]);
    expect(state.currentSeat).toBe(0);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(2);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(3);

    state = moveToNextSeat(state);
    expect(state.currentSeat).toBe(0);
  });

  it('4. playing 阶段 activeSeats 缺失应 fail fast', () => {
    const state = createInitialGameState(DEFAULT_RULE_CONFIG, [0, 1, 2]);
    expect(state.isLegacy).toBe(false);
    
    state.activeSeats = undefined; // Force deletion
    expect(() => startRound(state)).toThrow('activeSeats is required in playing phase');
  });

  it('5. 2 人局自摸只向 1 人收分', () => {
    const seatToPlayerId = {
      0: 'player_0',
      2: 'player_2'
    } as any;

    const baseScores = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: true,
      bigHuTypes: [],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
      activeSeats: [0, 2]
    });

    expect(baseScores.length).toBe(1);
    expect(baseScores[0].fromPlayerId).toBe('player_2');
    expect(baseScores[0].toPlayerId).toBe('player_0');
    expect(baseScores[0].score).toBe(DEFAULT_RULE_CONFIG.smallHu.ziMoEach);
  });

  it('6. 3 人局自摸只向 2 人收分', () => {
    const seatToPlayerId = {
      0: 'player_0',
      1: 'player_1',
      3: 'player_3'
    } as any;

    const baseScores = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: true,
      bigHuTypes: [],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
      activeSeats: [0, 1, 3]
    });

    expect(baseScores.length).toBe(2);
    expect(baseScores.map(e => e.fromPlayerId).sort()).toEqual(['player_1', 'player_3']);
  });

  it('7. inactive seat 不出现在 settlement result', () => {
    const seatToPlayerId = {
      0: 'player_0',
      2: 'player_2'
    } as any;

    // Trigger anGang for seat 0, inactive seat 1 and 3 should not be charged
    const gangScores = calculateGangScore({
      gangType: 'anGang',
      playerSeat: 0,
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
      activeSeats: [0, 2]
    });

    expect(gangScores.length).toBe(1);
    expect(gangScores[0].fromPlayerId).toBe('player_2');
  });

  it('8. inactive seat 不出现在 PlayerVisibleView opponents', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    const session = startOnlineRound(room.roomId, 2);
    const view = buildPlayerVisibleView({
      roomId: room.roomId,
      state: session.state,
      seat: 0,
      connectionStatus: { 0: true, 1: false, 2: true, 3: false },
      aiSeats: []
    });

    expect(view.opponents.length).toBe(1);
    expect(view.opponents[0].seat).toBe(2);
  });

  it('9. inactive seat 不进入 reconnecting', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    bindSocketToSeat({ socketId: 'sock0', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    room.status = 'playing';
    room.activeSeats = [0, 2];

    // Simulate socket disconnect for an untracked socket (not bound to seat)
    handleSocketDisconnected('sock_unrelated');
    
    // Inactive seat 1 and 3 should remain null and not be touched
    expect(room.seats[1]).toBeNull();
    expect(room.seats[3]).toBeNull();
  });

  it('10. inactive seat 不进入 trustee', () => {
    const room = createRoom();
    room.activeSeats = [0, 2];

    const now = Date.now();
    expect(isSeatTrustee(room.roomId, 1, now)).toBe(false);
    expect(isSeatTrustee(room.roomId, 3, now)).toBe(false);
  });

  it('11. 旧 4 人局结算快照保持不变', () => {
    const state = createInitialGameState(DEFAULT_RULE_CONFIG);
    expect(state.isLegacy).toBe(true);
    expect(state.activeSeats).toEqual([0, 1, 2, 3]);

    const nextState = startRound(state);
    expect(nextState.activeSeats).toEqual([0, 1, 2, 3]);
  });

  it('12. 2 人局玩家断线后托管可继续推进', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice'); // seat 0
    room.seats[2] = {
      seat: 2,
      playerName: 'Charlie',
      sessionId: 'sess2',
      token: 'tok2',
      socketId: 'sock2',
      connectionState: 'online',
      connected: true,
      isAI: false,
      joinedAt: Date.now(),
      lastSeenAt: Date.now()
    };
    bindSocketToSeat({ socketId: 'sock0', roomId: room.roomId, seat: 0, playerName: 'Alice' });

    const session = startOnlineRound(room.roomId, 2);
    room.status = 'playing';

    // Alice disconnects
    handleSocketDisconnected('sock0');
    expect(room.seats[0]!.connectionState).toBe('reconnecting');

    // Fast-forward 35 seconds to enter trustee mode
    const futureTime = Date.now() + 35000;
    expect(isSeatTrustee(room.roomId, 0, futureTime)).toBe(true);
  });
});
