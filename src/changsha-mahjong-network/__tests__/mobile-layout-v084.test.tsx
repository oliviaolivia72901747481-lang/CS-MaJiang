import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

vi.mock('react', () => {
  const mockStatesMap = new Map<string, any>();
  const mockSettersMap = new Map<string, (val: any) => void>();
  const mockRefsMap = new Map<string, { current: any }>();
  const mockEffectsList: any[] = [];
  let mockStateIndex = 0;
  let mockRefIndex = 0;

  const mockReactInstance = {
    useState: (initialValue: any) => {
      const key = `state_${mockStateIndex++}`;
      if (!mockStatesMap.has(key)) {
        mockStatesMap.set(key, initialValue);
      }
      const setter = (newValue: any) => {
        const currentVal = mockStatesMap.get(key);
        const resolved = typeof newValue === 'function' ? newValue(currentVal) : newValue;
        mockStatesMap.set(key, resolved);
      };
      mockSettersMap.set(key, setter);
      return [mockStatesMap.get(key), setter];
    },
    useRef: (initialValue: any) => {
      const key = `ref_${mockRefIndex++}`;
      if (!mockRefsMap.has(key)) {
        mockRefsMap.set(key, { current: initialValue });
      }
      return mockRefsMap.get(key);
    },
    useEffect: (effect: () => any, deps: any[]) => {
      mockEffectsList.push({ effect, deps });
    },
    Fragment: ({ children }: any) => children,
    clearMocks: () => {
      mockStatesMap.clear();
      mockSettersMap.clear();
      mockRefsMap.clear();
      mockEffectsList.length = 0;
      mockStateIndex = 0;
      mockRefIndex = 0;
    },
    resetStateIndex: () => {
      mockStateIndex = 0;
    },
    resetRefIndex: () => {
      mockRefIndex = 0;
    },
    getMockStatesMap: () => mockStatesMap,
    getMockSettersMap: () => mockSettersMap,
  };

  return {
    ...mockReactInstance,
    default: mockReactInstance,
  };
});

import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { DiscardRiver } from '../components/DiscardRiver.jsx';
import { MobileOpponentStrip } from '../components/MobileOpponentStrip.jsx';

function findAllElements(element: any, predicate: (el: any) => boolean): any[] {
  const results: any[] = [];
  function traverse(el: any) {
    if (!el) return;
    if (predicate(el)) results.push(el);
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

const mockViewBase: any = {
  roomId: '123456',
  seat: 0,
  phase: 'playing',
  currentSeat: 0,
  dealerSeat: 0,
  self: {
    seat: 0,
    playerName: '玩家0',
    hand: [],
    melds: [],
    discards: [],
    score: 1000,
    connectionState: 'online'
  },
  opponents: [],
  pendingActions: [],
  logs: [],
  wallRemainingCount: 80
};

describe('v0.8.4 Mobile Layout Tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  it('1. should render exactly 1 opponent card for a 2-player game', () => {
    const view = {
      ...mockViewBase,
      opponents: [
        { seat: 2, playerName: '玩家2', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' }
      ]
    };

    const el = MobileOnlineGameLayout({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const strips = findAllElements(el, x => x && x.type && x.type.name === 'MobileOpponentStrip');
    expect(strips.length).toBe(1);
    expect(strips[0].props.player.seat).toBe(2);
  });

  it('2. should render exactly 2 opponent cards for a 3-player game', () => {
    const view = {
      ...mockViewBase,
      opponents: [
        { seat: 1, playerName: '玩家1', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' },
        { seat: 2, playerName: '玩家2', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' }
      ]
    };

    const el = MobileOnlineGameLayout({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const strips = findAllElements(el, x => x && x.type && x.type.name === 'MobileOpponentStrip');
    expect(strips.length).toBe(2);
  });

  it('3. should render exactly 3 opponent cards for a 4-player game', () => {
    const view = {
      ...mockViewBase,
      opponents: [
        { seat: 1, playerName: '玩家1', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' },
        { seat: 2, playerName: '玩家2', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' },
        { seat: 3, playerName: '玩家3', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' }
      ]
    };

    const el = MobileOnlineGameLayout({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const strips = findAllElements(el, x => x && x.type && x.type.name === 'MobileOpponentStrip');
    expect(strips.length).toBe(3);
  });

  it('4. inactive seats must be completely filtered out', () => {
    const view = {
      ...mockViewBase,
      opponents: [
        { seat: 2, playerName: '玩家2', handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: false, connectionState: 'online' }
      ]
    };

    const el = MobileOnlineGameLayout({
      view,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const strips = findAllElements(el, x => x && x.type && x.type.name === 'MobileOpponentStrip');
    const seats = strips.map(s => s.props.player.seat);
    expect(seats).not.toContain(1);
    expect(seats).not.toContain(3);
  });

  it('5. should have mobile hand and action regions rendered', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewBase,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });

    const handContainer = findAllElements(el, x => x && x.type && x.type.name === 'MobilePlayerHand');
    expect(handContainer.length).toBe(1);
  });

  it('6. should render log drawer in closed state initially', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewBase,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    });
    const logDrawer = findAllElements(el, x => x && x.type && x.type.name === 'MobileGameLogDrawer')[0];
    expect(logDrawer.props.isOpen).toBe(false);
  });

  it('7. DiscardRiver should horizontal scroll map correct tiles', () => {
    const riverEl = DiscardRiver({ discards: [{ suit: 'wan', rank: 1, instanceId: 'w1' }] });
    expect(riverEl.props.className).toBe('mobile-discard-river');
    const tile = findAllElements(riverEl, x => x && x.type && x.type.name === 'TileView');
    expect(tile.length).toBe(1);
  });

  it('8. should render connection status badges properly', () => {
    const stripEl = MobileOpponentStrip({
      player: { seat: 1, playerName: '小张', connected: true, isAI: true, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'online' },
      isCurrent: true
    });
    expect(stripEl.props.className).toContain('active');
  });
});
