import { describe, it, expect } from 'vitest';
import { Tile, PendingAction } from '../../changsha-mahjong/index.js';
import { PlayerVisibleView } from '../server/network-types.js';
import {
  buildActionHighlightModel,
  getTileChineseName,
  getHighlightedHandTileKeys
} from '../utils/action-highlight-utils.js';

// Helper to create basic tile
function makeTile(suit: string, rank: number, instanceId?: string): Tile {
  return {
    suit: suit as any,
    rank: rank as any,
    instanceId: instanceId || `${suit}_${rank}_${Math.random().toString(36).substring(2, 6)}`
  };
}

// Mock PlayerVisibleView
function makeMockView(pendingActions: PendingAction[], hand: Tile[] = [], melds: any[] = []): PlayerVisibleView {
  return {
    roomId: 'test-room',
    seat: 0,
    phase: 'playing',
    currentSeat: 0,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand,
      melds,
      discards: [],
      score: 1000
    },
    opponents: [],
    pendingActions,
    logs: [],
    wallRemainingCount: 50
  };
}

describe('action-highlight-utils tests', () => {
  it('1. Chinese tile names are generated correctly', () => {
    expect(getTileChineseName(makeTile('wan', 5))).toBe('5万');
    expect(getTileChineseName(makeTile('tong', 9))).toBe('9筒');
    expect(getTileChineseName(makeTile('tiao', 1))).toBe('1条');
  });

  it('2. Returns empty candidates when pendingActions is empty', () => {
    const view = makeMockView([]);
    const model = buildActionHighlightModel(view, 0);
    expect(model.candidateGroups).toHaveLength(0);
    expect(model.highlightedHandTileKeys).toHaveLength(0);
  });

  it('3. Builds correct chi candidate options', () => {
    const sourceTile = makeTile('wan', 6, 'source-tile-1');
    const hand = [makeTile('wan', 5, 'hand-tile-5'), makeTile('wan', 7, 'hand-tile-7')];
    const pendingActions: PendingAction[] = [
      {
        seat: 0,
        type: 'chi',
        priority: 2,
        tile: sourceTile,
        options: [
          [makeTile('wan', 5, 'hand-tile-5'), sourceTile, makeTile('wan', 7, 'hand-tile-7')]
        ]
      }
    ];
    const view = makeMockView(pendingActions, hand);
    const model = buildActionHighlightModel(view, 0);

    expect(model.candidateGroups).toHaveLength(1);
    const cand = model.candidateGroups[0];
    expect(cand.actionType).toBe('chi');
    expect(cand.sourceTile?.instanceId).toBe('source-tile-1');
    expect(cand.handTiles).toHaveLength(2);
    expect(cand.handTiles.map(t => t.instanceId)).toContain('hand-tile-5');
    expect(cand.handTiles.map(t => t.instanceId)).toContain('hand-tile-7');
    expect(model.highlightedHandTileKeys).toContain('wan_5');
    expect(model.highlightedHandTileKeys).toContain('hand-tile-5');
  });

  it('4. Builds correct peng candidate', () => {
    const sourceTile = makeTile('tong', 2, 'source-tile-2');
    const hand = [makeTile('tong', 2, 'hand-tile-2a'), makeTile('tong', 2, 'hand-tile-2b'), makeTile('wan', 5)];
    const pendingActions: PendingAction[] = [
      {
        seat: 0,
        type: 'peng',
        priority: 2,
        tile: sourceTile
      }
    ];
    const view = makeMockView(pendingActions, hand);
    const model = buildActionHighlightModel(view, 0);

    expect(model.candidateGroups).toHaveLength(1);
    const cand = model.candidateGroups[0];
    expect(cand.actionType).toBe('peng');
    expect(cand.handTiles).toHaveLength(2);
    expect(cand.handTiles.map(t => t.instanceId)).toContain('hand-tile-2a');
    expect(cand.handTiles.map(t => t.instanceId)).toContain('hand-tile-2b');
  });

  it('5. Builds correct mingGang candidate', () => {
    const sourceTile = makeTile('tiao', 8, 'source-tile-8');
    const hand = [
      makeTile('tiao', 8, 'hand-tile-8a'),
      makeTile('tiao', 8, 'hand-tile-8b'),
      makeTile('tiao', 8, 'hand-tile-8c'),
      makeTile('wan', 1)
    ];
    const pendingActions: PendingAction[] = [
      {
        seat: 0,
        type: 'mingGang',
        priority: 3,
        tile: sourceTile
      }
    ];
    const view = makeMockView(pendingActions, hand);
    const model = buildActionHighlightModel(view, 0);

    expect(model.candidateGroups).toHaveLength(1);
    const cand = model.candidateGroups[0];
    expect(cand.actionType).toBe('mingGang');
    expect(cand.handTiles).toHaveLength(3);
  });

  it('6. Builds correct anGang candidates', () => {
    const hand = [
      makeTile('wan', 3, 'w1'),
      makeTile('wan', 3, 'w2'),
      makeTile('wan', 3, 'w3'),
      makeTile('wan', 3, 'w4')
    ];
    const pendingActions: PendingAction[] = [
      {
        seat: 0,
        type: 'anGang',
        priority: 3,
        options: [['wan_3' as any]]
      }
    ];
    const view = makeMockView(pendingActions, hand);
    const model = buildActionHighlightModel(view, 0);

    expect(model.candidateGroups).toHaveLength(1);
    const cand = model.candidateGroups[0];
    expect(cand.actionType).toBe('anGang');
    expect(cand.handTiles).toHaveLength(4);
  });

  it('7. Builds correct buGang candidates', () => {
    const hand = [makeTile('tong', 7, 't4')];
    const melds = [
      {
        type: 'peng',
        tiles: [makeTile('tong', 7, 't1'), makeTile('tong', 7, 't2'), makeTile('tong', 7, 't3')],
        exposed: true
      }
    ];
    const pendingActions: PendingAction[] = [
      {
        seat: 0,
        type: 'buGang',
        priority: 3,
        options: [['tong_7' as any]]
      }
    ];
    const view = makeMockView(pendingActions, hand, melds);
    const model = buildActionHighlightModel(view, 0);

    expect(model.candidateGroups).toHaveLength(1);
    const cand = model.candidateGroups[0];
    expect(cand.actionType).toBe('buGang');
    expect(cand.handTiles).toHaveLength(1);
    expect(cand.handTiles[0].instanceId).toBe('t4');
    expect(cand.tiles).toHaveLength(4);
  });
});
