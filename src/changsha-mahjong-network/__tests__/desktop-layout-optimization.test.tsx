import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

// Mock react to support hooks in non-dom tests
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
      { step: 1, phase: 'playing' as any, action: '开始对局', detail: '房间号 123456' },
      { step: 2, phase: 'playing' as any, seat: 0, action: '打出', detail: 'wan_9' }
    ],
    roomId: '123456',
  };
}

describe('Desktop Layout Optimization Tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
    (React as any).resetStateIndex();
  });

  it('should render desktop root container and layout elements correctly', () => {
    const view = makeMockView(3); // 4-player game
    const discardTile = vi.fn();
    const performAction = vi.fn();

    // Call OnlineGamePage directly (it executes React code synchronously)
    const el = OnlineGamePage({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile,
      performAction,
      actionPending: false,
    }) as any;

    expect(el).not.toBeNull();
    // Validate outermost class name
    expect(el.props.className).toBe('desktop-game-page');

    const children = el.props.children;
    // Header RoomStatusPanel is index 0
    expect(children[0]).not.toBeNull();

    // Main layout is index 1
    const mainLayout = children[1];
    expect(mainLayout.props.className).toBe('desktop-main-layout');

    const boardAndSidebar = mainLayout.props.children;
    // Board Container is index 0
    const boardContainer = boardAndSidebar[0];
    expect(boardContainer.props.className).toBe('desktop-board-container');

    // Sidebar logs is index 1
    const sidebar = boardAndSidebar[1];
    expect(sidebar.props.className).toBe('desktop-logs-sidebar');
  });

  it('should compress opponent hand display to compact single tile with badge', () => {
    const view = makeMockView(3); // Top, Left, and Right opponents
    const el = OnlineGamePage({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: vi.fn(),
      performAction: vi.fn(),
      actionPending: false,
    }) as any;

    const boardContainer = el.props.children[1].props.children[0];
    const topSeat = boardContainer.props.children[0]; // Top opponent seat
    const topHandArea = topSeat.props.children[2]; // Compact hand area is index 2

    // Should contain a TileView with hidden=true
    const topTileView = topHandArea.props.children[0];
    expect(topTileView.props.hidden).toBe(true);

    // Should contain a badge text with hand count "x13"
    const topCountBadge = topHandArea.props.children[1];
    expect(topCountBadge.props.children).toContain('x');
    expect(topCountBadge.props.children).toContain(13);
  });

  it('should filter seat components dynamically based on 2-player activeSeats', () => {
    const view = makeMockView(1); // 2-player game (only 1 opponent)
    const el = OnlineGamePage({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: vi.fn(),
      performAction: vi.fn(),
      actionPending: false,
    }) as any;

    const boardContainer = el.props.children[1].props.children[0];
    
    // Seat 2 (Top) and Seat 3 (Left) should be null / undefined / not rendered
    const topSeat = boardContainer.props.children[0];
    const leftSeat = boardContainer.props.children[1];

    expect(topSeat).toBeFalsy();
    expect(leftSeat).toBeFalsy();

    // Seat 1 (Right) should be active and rendered
    const rightSeat = boardContainer.props.children[3];
    expect(rightSeat).toBeTruthy();
  });
});
