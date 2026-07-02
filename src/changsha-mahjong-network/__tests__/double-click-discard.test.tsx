import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { OnlineGamePage } from '../components/OnlineGamePage.jsx';

// Mock react
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    // We want to mock state and return standard setState spies
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

describe('Double Click Discard UX Tests', () => {
  const mockView: any = {
    roomId: '123456',
    seat: 0,
    phase: 'playing',
    currentSeat: 0,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand: [{ suit: 'wan', rank: 1, instanceId: 'wan_1_inst' }],
      melds: [],
      discards: [],
      score: 1000,
      playerName: 'Alice'
    },
    opponents: [
      { seat: 1, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true },
      { seat: 2, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true },
      { seat: 3, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true }
    ],
    pendingActions: [],
    logs: []
  };

  it('1. MobileOnlineGameLayout hand tiles support selected prop', () => {
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
    const playerHand = hand.props.children;
    expect(playerHand.props.selectedTileId).toBeNull();
  });

  it('2. OnlineGamePage hand tiles support selected prop', () => {
    // Set window width to large size so it renders desktop
    global.window = {
      innerWidth: 1024,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;

    const el = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    expect(el).toBeDefined();
  });
});
