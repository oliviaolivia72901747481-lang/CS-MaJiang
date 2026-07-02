import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { OnlineGamePage } from '../components/OnlineGamePage.jsx';

// Mock react
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

describe('Mobile Online Game Layout Tests', () => {
  const mockView: any = {
    roomId: '123456',
    seat: 0,
    phase: 'playing',
    currentSeat: 0,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand: [{ suit: 'wan', rank: 1, instanceId: '1' }],
      melds: [],
      discards: [],
      score: 1000,
      playerName: 'Alice'
    },
    opponents: [
      { seat: 1, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 1' },
      { seat: 2, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 2' },
      { seat: 3, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 3' }
    ],
    pendingActions: [],
    logs: [{ step: 1, phase: 'playing', action: 'start', detail: '游戏开始' }]
  };

  beforeEach(() => {
    global.window = {
      innerWidth: 375, // mobile width
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      location: { protocol: 'http:', hostname: 'localhost' }
    } as any;
  });

  it('1. MobileOnlineGameLayout renders successfully as a div container', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    expect(el).toBeDefined();
    expect(el.type).toBe('div');
    expect(el.props.className).toBe('online-game-page');
  });

  it('2. log drawer overlay is closed/not rendered by default', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    // Check children of main container
    const overlay = el.props.children.find((c: any) => c && c.props && c.props.className === 'mobile-drawer-overlay');
    expect(overlay).toBeUndefined();
  });

  it('3. collapses secondary tools behind a More button by default', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    const bottomControls = el.props.children.find((c: any) => c && c.props && c.props.style && c.props.style.background === 'rgba(0,0,0,0.52)');
    expect(bottomControls).toBeDefined();
    expect(JSON.stringify(bottomControls)).toContain('更多');
    expect(JSON.stringify(bottomControls)).not.toContain('打开局域网诊断自检面板');
  });

  it('4. compresses opponent cards into three narrow strips', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    const opponentStack = el.props.children[1];
    expect(opponentStack.props.children).toHaveLength(3);
  });

  it('5. renders client player hand container at bottom', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    const hand = el.props.children.find((c: any) => c && c.props && c.props.className === 'mobile-hand');
    expect(hand).toBeDefined();
    expect(hand.props.children).toBeDefined();
  });

  it('6. OnlineGamePage routes to MobileOnlineGameLayout when width <= 768px', () => {
    const el = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    expect(el.type).toBe(MobileOnlineGameLayout);
  });
});
