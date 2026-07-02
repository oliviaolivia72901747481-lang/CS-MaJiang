import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MobileLatestDiscardDock } from '../components/MobileLatestDiscardDock.jsx';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { TileView } from '../components/TileView.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';

// Mock react to support hook calls in MobileOnlineGameLayout when called as function
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    const val = typeof init === 'function' ? (init as any)() : init;
    return [val, vi.fn()];
  };
  return {
    ...original,
    default: {
      ...original,
      useState: mockUseState,
      useEffect: vi.fn(),
      useRef: (v: any) => ({ current: v }),
    },
    useState: mockUseState,
    useEffect: vi.fn(),
    useRef: (v: any) => ({ current: v }),
  };
});

vi.mock('../components/MobileOpponentStrip.jsx', () => ({
  MobileOpponentStrip: () => <div data-testid="opponent-strip" />
}));

vi.mock('../components/MobileDiscardHistoryDrawer.jsx', () => ({
  MobileDiscardHistoryDrawer: () => <div data-testid="history-drawer" />
}));

// Helper to recursively find elements by condition
function findElements(el: any, predicate: (x: any) => boolean): any[] {
  const results: any[] = [];
  if (!el) return results;
  if (predicate(el)) {
    results.push(el);
  }
  if (el.props && el.props.children) {
    const children = Array.isArray(el.props.children) ? el.props.children : [el.props.children];
    for (const child of children) {
      results.push(...findElements(child, predicate));
    }
  }
  return results;
}

describe('MobileLatestDiscardDock Tests', () => {
  const tile1: Tile = { suit: 'wan', rank: 1, instanceId: 't1' };
  const tile2: Tile = { suit: 'tong', rank: 2, instanceId: 't2' };
  const tile3: Tile = { suit: 'tiao', rank: 3, instanceId: 't3' };

  it('1. renders correct players for 2-player game', () => {
    const players = [
      { seat: 0 as const, playerName: 'Player 0', isMe: true, latestTile: tile1 },
      { seat: 1 as const, playerName: 'Player 1', isMe: false, latestTile: tile2 }
    ];

    const el = MobileLatestDiscardDock({
      players,
      globalLatestTile: tile2
    });

    expect(el).not.toBeNull();
    
    // Find all TileView elements (their type matches TileView or has the same component reference)
    const tileViews = findElements(el, x => x && x.type === TileView);
    expect(tileViews).toHaveLength(2);

    // Verify tile2 is highlighted as latest
    const tile2View = tileViews.find(tv => tv.props.tile.instanceId === 't2');
    expect(tile2View.props.isLatestDiscard).toBe(true);
    expect(tile2View.props.highlightType).toBe('latest');

    // Verify tile1 is not highlighted
    const tile1View = tileViews.find(tv => tv.props.tile.instanceId === 't1');
    expect(tile1View.props.isLatestDiscard).toBe(false);
    expect(tile1View.props.highlightType).toBeUndefined();
  });

  it('2. renders correct players for 3-player game', () => {
    const players = [
      { seat: 0 as const, playerName: 'Player 0', isMe: true, latestTile: tile1 },
      { seat: 1 as const, playerName: 'Player 1', isMe: false, latestTile: tile2 },
      { seat: 2 as const, playerName: 'Player 2', isMe: false, latestTile: tile3 }
    ];

    const el = MobileLatestDiscardDock({
      players,
      globalLatestTile: tile3
    });

    expect(el).not.toBeNull();

    const tileViews = findElements(el, x => x && x.type === TileView);
    expect(tileViews).toHaveLength(3);

    const tile3View = tileViews.find(tv => tv.props.tile.instanceId === 't3');
    expect(tile3View.props.isLatestDiscard).toBe(true);
  });

  it('3. activeSeats integration in MobileOnlineGameLayout shows only active players', () => {
    // 3-player game state (1 opponent is missing, total 3 active seats: 0, 1, 2)
    const mockView: any = {
      roomId: '123',
      seat: 0,
      phase: 'playing',
      currentSeat: 0,
      dealerSeat: 0,
      self: {
        seat: 0,
        hand: [],
        melds: [],
        discards: [tile1],
        playerName: 'Alice',
        score: 1000
      },
      opponents: [
        { seat: 1, handCount: 13, melds: [], discards: [tile2], score: 1000, connected: true, isAI: false, playerName: 'Bob' },
        { seat: 2, handCount: 13, melds: [], discards: [tile3], score: 1000, connected: true, isAI: true, playerName: 'Charlie' }
      ],
      pendingActions: [],
      logs: [
        { step: 1, phase: 'playing', seat: 0, action: '打出', detail: 'wan_1' },
        { step: 2, phase: 'playing', seat: 1, action: '打出', detail: 'tong_2' },
        { step: 3, phase: 'playing', seat: 2, action: '打出', detail: 'tiao_3' }
      ]
    };

    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    const dockEl = findElements(el, x => x && x.type && x.type.name === 'MobileLatestDiscardDock');
    expect(dockEl).toHaveLength(1);

    const dockProps = dockEl[0].props;
    expect(dockProps.players).toHaveLength(3);
    expect(dockProps.players.map((p: any) => p.seat)).toEqual([0, 1, 2]);
    expect(dockProps.globalLatestTile).toEqual(tile3);
  });
});
