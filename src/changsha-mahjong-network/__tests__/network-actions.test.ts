import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, clearAllRooms } from '../server/room-manager.js';
import { startOnlineRound, submitPlayerAction } from '../server/game-session.js';
import { Tile } from '../../changsha-mahjong/types/tile.js';

describe('Network Action Processing Tests', () => {
  beforeEach(() => {
    clearAllRooms();
  });

  it('1. legal discard by current seat succeeds', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'playing';
    session.state.currentSeat = 0;

    const firstTile = session.state.players[0].hand[0];
    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'discard', tileInstanceId: firstTile.instanceId },
    });

    expect(res.success).toBe(true);
  });

  it('2. chi option sorts correctly and updates choice', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'waitingForResponses';
    const sampleTiles: Tile[] = [
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
    ];
    session.state.pendingActions = [
      { 
        seat: 0, 
        type: 'chi', 
        priority: 1, 
        options: [
          [{ suit: 'wan', rank: 5, instanceId: 'w5' }, { suit: 'wan', rank: 6, instanceId: 'w6' }],
          sampleTiles,
        ] 
      }
    ];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'chi', optionId: 'wan_2,wan_3' },
    });

    expect(res.success).toBe(true);
    const submitted = (session as any).submittedActions[0];
    expect(submitted).toBeDefined();
    // Verification: The selected option (wan_2, wan_3) has been sorted to index 0
    expect(submitted.options[0]).toEqual(sampleTiles);
  });

  it('3. gang option sorts correctly and updates choice', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'waitingForResponses';
    const w5Tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };
    const t3Tile: Tile = { suit: 'tong', rank: 3, instanceId: 't3' };
    session.state.pendingActions = [
      {
        seat: 0,
        type: 'anGang',
        priority: 3,
        options: [
          [t3Tile],
          [w5Tile]
        ]
      }
    ];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'gang', gangType: 'anGang', tileKey: 'wan_5' },
    });

    expect(res.success).toBe(true);
    const submitted = (session as any).submittedActions[0];
    expect(submitted.options[0]).toEqual([w5Tile]);
  });

  it('4. peng action validates against pending actions', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'waitingForResponses';
    session.state.pendingActions = [{ seat: 0, type: 'peng', priority: 2 }];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'peng' },
    });

    expect(res.success).toBe(true);
    expect((session as any).submittedActions[0].type).toBe('peng');
  });

  it('5. hu action validates against pending actions', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'waitingForResponses';
    session.state.pendingActions = [{ seat: 0, type: 'hu', priority: 4 }];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'hu' },
    });

    expect(res.success).toBe(true);
    expect((session as any).submittedActions[0].type).toBe('hu');
  });

  it('6. pass action validates against pending actions', () => {
    const room = createRoom();
    joinRoom(room.roomId, 'Alice');
    const session = startOnlineRound(room.roomId);

    session.state.phase = 'waitingForResponses';
    session.state.pendingActions = [{ seat: 0, type: 'pass', priority: 0 }];

    const res = submitPlayerAction({
      roomId: room.roomId,
      seat: 0,
      action: { type: 'pass' },
    });

    expect(res.success).toBe(true);
    expect((session as any).submittedActions[0].type).toBe('pass');
  });
});
