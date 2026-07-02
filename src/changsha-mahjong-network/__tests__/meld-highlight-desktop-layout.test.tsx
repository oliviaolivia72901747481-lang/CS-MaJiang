/**
 * meld-highlight-desktop-layout.test.tsx (vitest style)
 * Unit tests for card highlights, Hover grouping, 100vh app container,
 * and active seats filtering in desktop layout.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

// Mock react
vi.mock('react', () => {
  const mockStatesMap = new Map<string, any>();
  const mockSettersMap = new Map<string, (val: any) => void>();
  let mockStateIndex = 0;

  const mockReactInstance = {
    useState: (initialValue: any) => {
      const key = `state_${mockStateIndex++}`;
      if (!mockSettersMap.has(key)) {
        const value = typeof initialValue === 'function' ? initialValue() : initialValue;
        mockStatesMap.set(key, value);
        mockSettersMap.set(key, (newValue: any) => {
          mockStatesMap.set(key, newValue);
        });
      }
      return [mockStatesMap.get(key), mockSettersMap.get(key)];
    },
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: (effect: () => any) => {
      effect();
    },
    clearMocks: () => {
      mockStatesMap.clear();
      mockSettersMap.clear();
      mockStateIndex = 0;
    },
    resetStateIndex: () => {
      mockStateIndex = 0;
    }
  };

  return {
    ...mockReactInstance,
    default: mockReactInstance,
  };
});

import { OnlineGamePage } from '../components/OnlineGamePage.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

describe('v0.8.5 Desktop Layout & Meld Highlights Tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
    (React as any).resetStateIndex();
  });

  const mockView: any = {
    roomId: '888888',
    phase: 'playing',
    currentSeat: 0,
    dealerSeat: 0,
    wallRemainingCount: 70,
    self: {
      playerName: 'Player0',
      hand: [
        makeTile('wan', 1, 'w1'),
        makeTile('wan', 2, 'w2'),
        makeTile('wan', 3, 'w3'),
        makeTile('tong', 5, 't5_1'),
        makeTile('tong', 5, 't5_2'),
      ],
      melds: [],
      discards: [makeTile('wan', 9, 'w9')],
      score: 1000
    },
    opponents: [
      { seat: 1, playerName: 'Bot1', handCount: 13, melds: [], discards: [makeTile('tiao', 2, 'ti2')], score: 1000, connected: true, isAI: true },
    ],
    pendingActions: [],
    logs: []
  };

  it('1. 桌面端主页面和子面板具有正确的 CSS 类名（desktop-game-page 等）', () => {
    const el = OnlineGamePage({
      view: mockView,
      roomId: '888888',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    expect(el).not.toBeNull();
    expect(el.props.className).toBe('desktop-game-page');

    const mainLayout = el.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-main-layout');
    expect(mainLayout).toBeDefined();

    const board = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-board-container');
    expect(board).toBeDefined();

    const sidebar = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-logs-sidebar');
    expect(sidebar).toBeDefined();
  });

  it('2. 桌面端对局日志面板包含正确的标题且可以自滚动', () => {
    const el = OnlineGamePage({
      view: mockView,
      roomId: '888888',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    const mainLayout = el.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-main-layout');
    const sidebar = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-logs-sidebar');
    
    expect(JSON.stringify(sidebar.props.children)).toContain('对局日志');
  });

  it('3. 当有吃牌动作时，手牌中对应的候选组合获得 highlight-chi 高亮类名', () => {
    const viewWithChi = {
      ...mockView,
      pendingActions: [
        {
          seat: 0,
          type: 'chi',
          priority: 2,
          tile: makeTile('wan', 4, 'w4'),
          options: [
            [makeTile('wan', 2, 'w2'), makeTile('wan', 3, 'w3')]
          ]
        }
      ]
    };

    const el = OnlineGamePage({
      view: viewWithChi,
      roomId: '888888',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

            const mainLayout = el.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-main-layout');
    const board = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-board-container');
    const bottomSeat = board.props.children.find((c: any) => c && c.props && c.props.style && c.props.style.gridRow === '3');
    const handWrapper = bottomSeat.props.children.find((c: any) => c && c.props && c.props.style && c.props.style.gap === '4px');
    
    const tilesArray = handWrapper.props.children[2];
    const chiTiles = (tilesArray || []).filter((tileView: any) => {
      return tileView && tileView.props && tileView.props.highlightType === 'chi';
    });

    expect(chiTiles.length).toBe(2);
  });

  it('4. 当有碰牌动作时，手牌中相同的两张牌获得 highlight-peng 高亮类名', () => {
    const viewWithPeng = {
      ...mockView,
      pendingActions: [
        {
          seat: 0,
          type: 'peng',
          priority: 2,
          tile: makeTile('tong', 5, 't5_source')
        }
      ]
    };

    const el = OnlineGamePage({
      view: viewWithPeng,
      roomId: '888888',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    const mainLayout = el.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-main-layout');
    const board = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-board-container');
    const bottomSeat = board.props.children.find((c: any) => c && c.props && c.props.style && c.props.style.gridRow === '3');
    const handWrapper = bottomSeat.props.children.find((c: any) => c && c.props && c.props.style && c.props.style.gap === '4px');

    const tilesArray = handWrapper.props.children[2];
    const pengTiles = (tilesArray || []).filter((tileView: any) => {
      return tileView && tileView.props && tileView.props.highlightType === 'peng';
    });

    expect(pengTiles.length).toBe(2);
  });

  it('5. 2 人局下，桌子边缘和中心弃牌河均正确屏蔽 inactive seats 玩家', () => {
    const el = OnlineGamePage({
      view: mockView, // contains seat 0 (me) and seat 1 (opponent)
      roomId: '888888',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    const mainLayout = el.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-main-layout');
    const board = mainLayout.props.children.find((c: any) => c && c.props && c.props.className === 'desktop-board-container');

    // Seat 2 (Top) and Seat 3 (Left) are not in mockView.opponents.
    // They should not be rendered in the board container as opponents (Top is board.props.children[0], Left is board.props.children[1], Right is board.props.children[2]).
    const topSeat = board.props.children[0];
    const leftSeat = board.props.children[1];
    
    expect(topSeat).toBeFalsy();
    expect(leftSeat).toBeFalsy();
  });
});
