import { describe, it, expect } from 'vitest';
import { 
  getLatestDiscardEvent, 
  getActionSourceEvent,
  getPlayerLabelBySeat,
  getPlayerDiscardsBySeat
} from '../utils/latest-discard-helper.js';
import type { PlayerVisibleView } from '../server/network-types.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

function makeMockView(opponentsCount: number = 3): PlayerVisibleView {
  const opponents = [];
  for (let i = 1; i <= opponentsCount; i++) {
    opponents.push({
      seat: i as any,
      playerName: `玩家${i}`,
      connected: true,
      isAI: true,
      handCount: 13,
      melds: [],
      discards: [
        makeTile('wan', i, `opp_${i}_d1`),
        makeTile('wan', i + 1, `opp_${i}_d2`),
      ],
      score: 1000,
    });
  }

  return {
    seat: 0,
    phase: 'playing' as any,
    currentSeat: 0,
    dealerSeat: 0,
    wallRemainingCount: 53,
    self: {
      seat: 0,
      playerName: '我',
      connected: true,
      isAI: false,
      handCount: 13,
      hand: [
        makeTile('wan', 1, 'my_t1'),
        makeTile('wan', 2, 'my_t2'),
      ],
      melds: [],
      discards: [
        makeTile('wan', 9, 'my_d1')
      ],
      score: 1000,
      connectionState: 'online'
    } as any,
    opponents,
    pendingActions: [],
    logs: [
      { step: 1, phase: 'playing' as any, action: '开始对局', detail: '房间号 123456' }
    ],
    roomId: '123456'
  };
}

describe('Latest Discard Event Hotfix Helper Tests', () => {

  it('Scenario 1: Someone else just discarded a tile', () => {
    const view = makeMockView(3);
    view.logs.push({
      step: 2,
      phase: 'playing' as any,
      seat: 2,
      action: '打出',
      detail: 'wan_3' // last discard of player 2 (opponents[1]) is opp_2_d2 which is wan_3
    });

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(2);
    expect(event!.playerLabel).toBe('玩家2');
    expect(event!.tileKey).toBe('wan_3');
    expect(event!.stillInRiver).toBe(true);
  });

  it('Scenario 2: I discarded earlier, but another player discarded later', () => {
    const view = makeMockView(3);
    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 0, action: '打出', detail: 'wan_9' }, // my discard
      { step: 3, phase: 'playing' as any, seat: 3, action: '打出', detail: 'wan_4' }  // player 3 discard
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(3);
    expect(event!.playerLabel).toBe('玩家3');
    expect(event!.tileKey).toBe('wan_4');
  });

  it('Scenario 3: I just discarded', () => {
    const view = makeMockView(3);
    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 3, action: '打出', detail: 'wan_4' },
      { step: 3, phase: 'playing' as any, seat: 0, action: '打出', detail: 'wan_9' }
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(0);
    expect(event!.playerLabel).toBe('我');
    expect(event!.tileKey).toBe('wan_9');
  });

  it('Scenario 4: The latest discarded tile was claimed (碰/吃/杠) and is no longer in the river', () => {
    const view = makeMockView(3);
    
    // Log says player 3 discarded wan_4, but we empty their discards array (simulating it was claimed/cleared)
    view.opponents[2].discards = []; 

    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 2, action: '打出', detail: 'wan_3' }, // player 2 (has discards)
      { step: 3, phase: 'playing' as any, seat: 3, action: '打出', detail: 'wan_4' }  // player 3 (discards cleared)
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    // Should skip player 3's discard (not in river) and return player 2's discard
    expect(event!.seat).toBe(2);
    expect(event!.tileKey).toBe('wan_3');
  });

  it('Scenario 5: pending action trigger source tile details detection', () => {
    const view = makeMockView(3);
    // Pending action is peng on tile wan_3 discarded by player 2
    view.pendingActions.push({
      type: 'peng',
      tile: makeTile('wan', 3, 'opp_2_d2'),
      seat: 0,
      priority: 1
    });
    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 2, action: '打出', detail: 'wan_3' }
    );

    const actionSource = getActionSourceEvent(view, 0);
    expect(actionSource).not.toBeNull();
    expect(actionSource!.seat).toBe(2);
    expect(actionSource!.playerLabel).toBe('玩家2');
    expect(actionSource!.tileKey).toBe('wan_3');
  });

  it('Scenario 6: dynamic player labels by active seats', () => {
    const view = makeMockView(1); // Only opponent is seat 1
    
    expect(getPlayerLabelBySeat(view, 0, 0)).toBe('我');
    expect(getPlayerLabelBySeat(view, 1, 0)).toBe('玩家1');
    expect(getPlayerLabelBySeat(view, 2, 0)).toBe('玩家 2'); // inactive/fallback seat label
  });

  it('Scenario 7: Same player plays duplicate tile, latest is claimed, old remains in river', () => {
    const view = makeMockView(3);
    view.opponents[0].discards = [
      makeTile('wan', 5, 'opp_1_d1_old')
    ];
    view.opponents[1].discards = [
      makeTile('tong', 3, 'opp_2_d1')
    ];
    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 1, action: '打出', detail: 'wan_5' },
      { step: 3, phase: 'playing' as any, seat: 2, action: '打出', detail: 'tong_3' },
      { step: 4, phase: 'playing' as any, seat: 1, action: '打出', detail: 'wan_5' }
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(2);
    expect(event!.tileKey).toBe('tong_3');
  });

  it('Scenario 8: Same player plays duplicate tile, latest is still in river', () => {
    const view = makeMockView(3);
    view.opponents[0].discards = [
      makeTile('wan', 5, 'opp_1_d1_old'),
      makeTile('wan', 5, 'opp_1_d2_new')
    ];
    view.opponents[1].discards = [
      makeTile('tong', 3, 'opp_2_d1')
    ];
    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 1, action: '打出', detail: 'wan_5' },
      { step: 3, phase: 'playing' as any, seat: 2, action: '打出', detail: 'tong_3' },
      { step: 4, phase: 'playing' as any, seat: 1, action: '打出', detail: 'wan_5' }
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(1);
    expect(event!.tileKey).toBe('wan_5');
    expect(event!.tile.instanceId).toBe('opp_1_d2_new');
  });

  it('Scenario 9: Different players discard the same card, distinguished by seat', () => {
    const view = makeMockView(3);
    view.opponents[0].discards = [makeTile('wan', 5, 'opp_1_w5')];
    view.opponents[1].discards = [];

    view.logs.push(
      { step: 2, phase: 'playing' as any, seat: 1, action: '打出', detail: 'wan_5' },
      { step: 3, phase: 'playing' as any, seat: 2, action: '打出', detail: 'wan_5' }
    );

    const event = getLatestDiscardEvent(view, 0);
    expect(event).not.toBeNull();
    expect(event!.seat).toBe(1);
    expect(event!.tileKey).toBe('wan_5');
  });

  it('Scenario 10: Fallback returns null when no matched logs exist', () => {
    const view = makeMockView(3);
    view.logs = [];

    const event = getLatestDiscardEvent(view, 0);
    expect(event).toBeNull();
  });
});
