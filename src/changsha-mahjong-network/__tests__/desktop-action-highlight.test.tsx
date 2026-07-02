import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { OnlineGamePage } from '../components/OnlineGamePage.jsx';
import { ActionSourceTileBanner } from '../components/ActionSourceTileBanner.jsx';
import { ActionCandidatePanel } from '../components/ActionCandidatePanel.jsx';
import { TileView } from '../components/TileView.jsx';

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

describe('Desktop Action Highlight integration tests', () => {
  const mockSourceTile = { suit: 'tiao', rank: 3, instanceId: 't3' };
  const mockView: any = {
    roomId: '123456',
    seat: 0,
    phase: 'waitingForResponses',
    currentSeat: 2,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand: [
        { suit: 'tiao', rank: 3, instanceId: 't3a' },
        { suit: 'tiao', rank: 3, instanceId: 't3b' },
        { suit: 'wan', rank: 2, instanceId: 'w2' }
      ],
      melds: [],
      discards: [],
      score: 1000,
      playerName: 'Alice'
    },
    opponents: [
      { seat: 2, handCount: 13, melds: [], discards: [{ suit: 'tiao', rank: 3, instanceId: 't3' }], score: 1000, connected: true, isAI: true, playerName: 'Bot 2' }
    ],
    pendingActions: [
      {
        seat: 0,
        type: 'peng',
        priority: 2,
        tile: mockSourceTile
      },
      { seat: 0, type: 'pass', priority: 1 }
    ],
    logs: [
      { step: 1, phase: 'playing', seat: 2, action: '打出', detail: 'tiao_3' }
    ]
  };

  it('1. OnlineGamePage renders ActionSourceTileBanner and ActionCandidatePanel on desktop', () => {
    const el = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    expect(el).not.toBeNull();

    // Find ActionSourceTileBanner and ActionCandidatePanel directly
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
    expect(banner.props.sourceEvent.playerLabel).toBe('Bot 2');
    expect(banner.props.sourceEvent.tileKey).toBe('tiao_3');

    expect(candidatePanel).toBeTruthy();
    expect(candidatePanel.props.candidates).toHaveLength(1);
    expect(candidatePanel.props.candidates[0].actionType).toBe('peng');
  });

  it('2. Hand tiles get highlighted correctly on desktop based on mockView', () => {
    const el = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;

    // Recursively find player-hand-tiles element starting from root
    let handTilesArea: any = null;
    const searchRoot = (node: any) => {
      if (!node) return;
      if (node.props && node.props.className === 'player-hand-tiles') {
        handTilesArea = node;
        return;
      }
      if (node.props && node.props.children) {
        React.Children.forEach(node.props.children, child => {
          searchRoot(child);
        });
      }
    };
    searchRoot(el);

    expect(handTilesArea).toBeTruthy();

    // Flatten React children to find all TileViews correctly
    const handTiles = React.Children.toArray(handTilesArea.props.children)
      .filter((c: any) => c && c.type === TileView);
      
    expect(handTiles).toHaveLength(3);

    const firstTile = handTiles.find((t: any) => t.props.tile.instanceId === 't3a') as any;
    const secondTile = handTiles.find((t: any) => t.props.tile.instanceId === 't3b') as any;
    const thirdTile = handTiles.find((t: any) => t.props.tile.instanceId === 'w2') as any;

    expect(firstTile).toBeTruthy();
    expect(secondTile).toBeTruthy();
    expect(thirdTile).toBeTruthy();

    expect(firstTile.props.highlightType).toBe('peng');
    expect(secondTile.props.highlightType).toBe('peng');
    expect(thirdTile.props.highlightType).toBeUndefined();
  });
});
