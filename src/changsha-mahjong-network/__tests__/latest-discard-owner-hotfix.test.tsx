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

function makeMockView(): PlayerVisibleView {
  return {
    seat: 0,
    phase: 'playing' as any,
    currentSeat: 1,
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
    opponents: [
      {
        seat: 1,
        playerName: '玩家1',
        connected: true,
        isAI: true,
        handCount: 13,
        melds: [],
        discards: [],
        score: 1000,
      },
      {
        seat: 2,
        playerName: '玩家2',
        connected: true,
        isAI: true,
        handCount: 13,
        melds: [],
        discards: [
          makeTile('tong', 7, 'opp_2_d1')
        ],
        score: 1000,
      },
      {
        seat: 3,
        playerName: '玩家3',
        connected: true,
        isAI: true,
        handCount: 13,
        melds: [],
        discards: [],
        score: 1000,
      }
    ],
    pendingActions: [],
    logs: [
      { step: 1, phase: 'playing' as any, action: '开始对局', detail: '房间号 123456' },
      { step: 2, phase: 'playing' as any, seat: 2, action: '打出', detail: 'tong_7' }
    ],
    roomId: '123456'
  };
}

describe('Latest Discard Owner UI Tests (Desktop)', () => {
  beforeEach(() => {
    (React as any).clearMocks();
    (React as any).resetStateIndex();
  });

  it('should render latest discard spotlight with correct owner identity and tile', () => {
    const view = makeMockView();

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
    const centerPanel = boardContainer.props.children[2]; // desktop-center-panel is index 2

    // Spotlight is first child inside desktop-center-panel
    const spotlight = centerPanel.props.children[1];
    expect(spotlight.props['data-testid']).toBe('latest-discard-spotlight');

    // Title label must contain the owner name "玩家2" and action "打出"
    const label = spotlight.props.children[0];
    expect(label.props.children.join('')).toContain('最新出牌: 玩家2 打出');

    // TileView should render the correct tile (tong_7)
    const tileViewWrapper = spotlight.props.children[1];
    const tileView = tileViewWrapper.props.children;
    expect(tileView.props.tile.instanceId).toBe('opp_2_d1');
  });

  it('should display actionSourceEvent separately in action panel overlay', () => {
    const view = makeMockView();
    // Setup pending actions for player 0: player 2 discarded tong_7, so player 0 can peng it
    view.pendingActions.push({
      type: 'peng',
      tile: makeTile('tong', 7, 'opp_2_d1'),
      seat: 0,
      priority: 1
    });

    const el = OnlineGamePage({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: vi.fn(),
      performAction: vi.fn(),
      actionPending: false,
    }) as any;

    // Find Action Panel Overlay in children list by checking style zIndex === 100
    const actionOverlay = el.props.children.find(
      (c: any) => c && c.props && c.props.style && c.props.style.zIndex === 100
    );
    expect(actionOverlay).toBeTruthy();

    const bannerElement = actionOverlay.props.children[0];
    const sourceEventBadge = bannerElement.type(bannerElement.props);
    const labelSpan = sourceEventBadge.props.children[0];
    expect(labelSpan.props.children.join('')).toContain('响应来源: 玩家2 打出');

    const sourceTileView = sourceEventBadge.props.children[1].props.children;
    expect(sourceTileView.props.tile.instanceId).toBe('opp_2_d1');
  });
});
