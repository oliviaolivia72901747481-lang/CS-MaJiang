import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { ActionSourceTileBanner } from '../components/ActionSourceTileBanner.jsx';
import { ActionCandidatePanel } from '../components/ActionCandidatePanel.jsx';

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

describe('Mobile Action Highlight integration tests', () => {
  const mockSourceTile = { suit: 'wan', rank: 6, instanceId: 'w6' };
  const mockView: any = {
    roomId: '123456',
    seat: 0,
    phase: 'waitingForResponses',
    currentSeat: 1,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand: [
        { suit: 'wan', rank: 5, instanceId: 'w5' },
        { suit: 'wan', rank: 7, instanceId: 'w7' },
        { suit: 'tong', rank: 9, instanceId: 't9' }
      ],
      melds: [],
      discards: [],
      score: 1000,
      playerName: 'Alice'
    },
    opponents: [
      { seat: 1, handCount: 13, melds: [], discards: [{ suit: 'wan', rank: 6, instanceId: 'w6' }], score: 1000, connected: true, isAI: true, playerName: 'Bot 1' }
    ],
    pendingActions: [
      {
        seat: 0,
        type: 'chi',
        priority: 2,
        tile: mockSourceTile,
        options: [
          [
            { suit: 'wan', rank: 5, instanceId: 'w5' },
            mockSourceTile,
            { suit: 'wan', rank: 7, instanceId: 'w7' }
          ]
        ]
      },
      { seat: 0, type: 'pass', priority: 1 }
    ],
    logs: [
      { step: 1, phase: 'playing', seat: 1, action: '打出', detail: 'wan_6' }
    ]
  };

  it('1. MobileOnlineGameLayout renders ActionSourceTileBanner and ActionCandidatePanel', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    expect(el).not.toBeNull();
    
    // Find the ActionSourceTileBanner and ActionCandidatePanel directly
    let banner: any = null;
    let candidatePanel: any = null;

    const searchChildren = (node: any) => {
      if (!node) return;
      if (node.type === ActionSourceTileBanner) {
        banner = node;
      }
      if (node.type === ActionCandidatePanel) {
        candidatePanel = node;
      }
      if (node.props && node.props.children) {
        React.Children.forEach(node.props.children, child => {
          searchChildren(child);
        });
      }
    };
    searchChildren(el);

    expect(banner).toBeTruthy();
    expect(banner.props.sourceEvent.playerLabel).toBe('Bot 1');
    expect(banner.props.sourceEvent.tileKey).toBe('wan_6');

    expect(candidatePanel).toBeTruthy();
    expect(candidatePanel.props.candidates).toHaveLength(1);
    expect(candidatePanel.props.candidates[0].actionType).toBe('chi');
  });

  it('2. MobileOnlineGameLayout passes getHandTileHighlight to MobilePlayerHand', () => {
    const el = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    const handWrapper = el.props.children.find(
      (c: any) => c && c.props && c.props.className === 'mobile-hand'
    );
    expect(handWrapper).toBeTruthy();

    const playerHand = handWrapper.props.children;
    expect(playerHand.props.getHandTileHighlight).toBeTypeOf('function');

    // Test highlight function on hand tiles
    const highlightFn = playerHand.props.getHandTileHighlight;
    expect(highlightFn({ suit: 'wan', rank: 5, instanceId: 'w5' })).toBe('chi');
    expect(highlightFn({ suit: 'wan', rank: 7, instanceId: 'w7' })).toBe('chi');
    expect(highlightFn({ suit: 'tong', rank: 9, instanceId: 't9' })).toBeUndefined();
  });
});
