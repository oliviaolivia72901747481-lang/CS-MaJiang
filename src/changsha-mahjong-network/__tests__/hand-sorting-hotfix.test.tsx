import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { MobilePlayerHand } from '../components/MobilePlayerHand.jsx';
import { OnlineGamePage } from '../components/OnlineGamePage.jsx';
import { SettlementModal } from '../components/SettlementModal.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';

// Simple mock for components
vi.mock('../components/TileView.jsx', () => ({
  TileView: () => null
}));

vi.mock('../../changsha-mahjong-ui/components/TileView.jsx', () => ({
  TileView: () => null
}));

// React mock stub
vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => {
      const val = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [val, () => {}];
    },
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: () => {},
    useMemo: (factory: () => any) => factory(),
    Fragment: ({ children }: any) => children,
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

function getTileViews(element: any): any[] {
  const results: any[] = [];
  function traverse(el: any) {
    if (!el) return;
    if (el.type && (typeof el.type === 'function' || typeof el.type === 'object') && el.props && el.props.tile) {
      results.push(el);
    }
    if (el.props && el.props.children) {
      const children = el.props.children;
      if (Array.isArray(children)) {
        children.flat(Infinity).forEach(traverse);
      } else {
        traverse(children);
      }
    }
  }
  traverse(element);
  return results;
}

describe('Player Hand Sorting Hotfix Tests', () => {
  // Unsorted hand: 2-wan, 1-wan, 9-tong, 5-tiao
  const unsortedHand: Tile[] = [
    { suit: 'wan', rank: 2, instanceId: 'w2' },
    { suit: 'wan', rank: 1, instanceId: 'w1' },
    { suit: 'tong', rank: 9, instanceId: 'to9' },
    { suit: 'tiao', rank: 5, instanceId: 'ti5' },
  ];

  it('1. MobilePlayerHand should sort standard hand (modulo 3 === 1)', () => {
    const el = MobilePlayerHand({
      hand: unsortedHand,
      isMyTurnToDiscard: true,
      actionPending: false,
      selectedTileId: null,
      onTileClick: () => {}
    });

    const tiles = getTileViews(el);
    expect(tiles).toHaveLength(4);
    // Should be sorted as: 1-wan, 2-wan, 9-tong, 5-tiao (suit order: wan -> tong -> tiao)
    expect(tiles[0].props.tile.suit).toBe('wan');
    expect(tiles[0].props.tile.rank).toBe(1);
    expect(tiles[1].props.tile.suit).toBe('wan');
    expect(tiles[1].props.tile.rank).toBe(2);
    expect(tiles[2].props.tile.suit).toBe('tong');
    expect(tiles[2].props.tile.rank).toBe(9);
    expect(tiles[3].props.tile.suit).toBe('tiao');
    expect(tiles[3].props.tile.rank).toBe(5);
  });

  it('2. MobilePlayerHand should sort hand except last tile if modulo 3 === 2', () => {
    // 5 tiles: modulo 3 is 2 (contains a drawn tile at the end)
    const handWithDraw: Tile[] = [
      ...unsortedHand,
      { suit: 'wan', rank: 3, instanceId: 'w3' } as Tile
    ];

    const el = MobilePlayerHand({
      hand: handWithDraw,
      isMyTurnToDiscard: true,
      actionPending: false,
      selectedTileId: null,
      onTileClick: () => {}
    });

    const tiles = getTileViews(el);
    expect(tiles).toHaveLength(5);
    
    // First 4 tiles must be sorted: 1-wan, 2-wan, 9-tong, 5-tiao
    expect(tiles[0].props.tile.suit).toBe('wan');
    expect(tiles[0].props.tile.rank).toBe(1);
    expect(tiles[1].props.tile.suit).toBe('wan');
    expect(tiles[1].props.tile.rank).toBe(2);
    expect(tiles[2].props.tile.suit).toBe('tong');
    expect(tiles[2].props.tile.rank).toBe(9);
    expect(tiles[3].props.tile.suit).toBe('tiao');
    expect(tiles[3].props.tile.rank).toBe(5);
    
    // Last tile must remain the unsorted drawn tile: 3-wan
    expect(tiles[4].props.tile.suit).toBe('wan');
    expect(tiles[4].props.tile.rank).toBe(3);
  });

  it('3. OnlineGamePage desktop layout should sort standard hand', () => {
    const view: any = {
      roomId: '123456',
      seat: 0,
      phase: 'playing',
      currentSeat: 0,
      dealerSeat: 0,
      self: { seat: 0, playerName: 'Alice', hand: unsortedHand, melds: [], discards: [] },
      opponents: [],
      pendingActions: [],
      logs: [],
      wallRemainingCount: 80
    };

    const el = OnlineGamePage({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const tiles = getTileViews(el);
    // Desktop layout player hand has 4 tiles
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    
    // Filter to the player's own hand tiles (which has isMyTurnToDiscard or onClick discard handler)
    const bottomHandTiles = tiles.filter(t => t.props.onClick !== undefined || t.props.tile.instanceId.startsWith('w') || t.props.tile.instanceId.startsWith('ti') || t.props.tile.instanceId.startsWith('to'));
    expect(bottomHandTiles[0].props.tile.suit).toBe('wan');
    expect(bottomHandTiles[0].props.tile.rank).toBe(1);
    expect(bottomHandTiles[1].props.tile.suit).toBe('wan');
    expect(bottomHandTiles[1].props.tile.rank).toBe(2);
    expect(bottomHandTiles[2].props.tile.suit).toBe('tong');
    expect(bottomHandTiles[2].props.tile.rank).toBe(9);
    expect(bottomHandTiles[3].props.tile.suit).toBe('tiao');
    expect(bottomHandTiles[3].props.tile.rank).toBe(5);
  });

  it('4. SettlementModal should sort all player hands', () => {
    const settlement: any = {
      winnerSeats: [0],
      scoreDeltas: { 0: 10, 1: -10 }
    };
    const getPlayerAtSeat = (s: number) => ({
      seat: s as any,
      playerName: `Player_${s}`,
      connected: true,
      isAI: false,
      handCount: 4,
      hand: unsortedHand,
      melds: [],
      discards: [],
      score: 1000
    });

    const el = SettlementModal({
      settlement,
      seat: 0,
      getPlayerAtSeat,
      onExitGame: () => {},
      activeSeats: [0]
    });

    const tiles = getTileViews(el);
    expect(tiles).toHaveLength(4);
    // Hands in settlement modal should be fully sorted
    expect(tiles[0].props.tile.suit).toBe('wan');
    expect(tiles[0].props.tile.rank).toBe(1);
    expect(tiles[1].props.tile.suit).toBe('wan');
    expect(tiles[1].props.tile.rank).toBe(2);
    expect(tiles[2].props.tile.suit).toBe('tong');
    expect(tiles[2].props.tile.rank).toBe(9);
    expect(tiles[3].props.tile.suit).toBe('tiao');
    expect(tiles[3].props.tile.rank).toBe(5);
  });
});
