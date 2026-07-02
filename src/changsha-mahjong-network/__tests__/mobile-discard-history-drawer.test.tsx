import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MobileDiscardHistoryDrawer } from '../components/MobileDiscardHistoryDrawer.jsx';
import { TileView } from '../components/TileView.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';

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

describe('MobileDiscardHistoryDrawer Tests', () => {
  const mockDiscards: Tile[] = [
    { suit: 'wan', rank: 1, instanceId: 'd1' },
    { suit: 'tong', rank: 2, instanceId: 'd2' },
    { suit: 'tiao', rank: 3, instanceId: 'd3' },
    { suit: 'wan', rank: 4, instanceId: 'd4' },
    { suit: 'tong', rank: 5, instanceId: 'd5' },
    { suit: 'tiao', rank: 6, instanceId: 'd6' },
    { suit: 'wan', rank: 7, instanceId: 'd7' }
  ];

  it('1. should not render when isOpen is false', () => {
    const el = MobileDiscardHistoryDrawer({
      isOpen: false,
      onClose: () => {},
      playerName: 'Player 0',
      isMe: true,
      discards: mockDiscards
    });
    expect(el).toBeNull();
  });

  it('2. should render all discards chronologically in drawer when isOpen is true', () => {
    const closeSpy = vi.fn();
    const el = MobileDiscardHistoryDrawer({
      isOpen: true,
      onClose: closeSpy,
      playerName: 'Player 0',
      isMe: true,
      discards: mockDiscards,
      globalLatestTile: mockDiscards[mockDiscards.length - 1]
    });

    expect(el).not.toBeNull();

    // Verify it lists all 7 discard cards (no limit)
    const tileViews = findElements(el, x => x && x.type === TileView);
    expect(tileViews).toHaveLength(7);

    // Verify order is chronological
    // First tile in mockDiscards (d1) should be at index 0 in the list
    expect(tileViews[0].props.tile.instanceId).toBe('d1');
    expect(tileViews[6].props.tile.instanceId).toBe('d7');

    // Verify last tile has isLatestDiscard = true
    expect(tileViews[6].props.isLatestDiscard).toBe(true);

    // Find chronological ordering number label elements (containing "#1", "#2" etc.)
    const numberLabels = findElements(el, x => {
      if (x && x.props && Array.isArray(x.props.children)) {
        return x.props.children[0] === '#';
      }
      return false;
    });
    expect(numberLabels).toHaveLength(7);
    expect(numberLabels[0].props.children[1]).toBe(1);
    expect(numberLabels[6].props.children[1]).toBe(7);

    // Verify closing clicking triggers onClose
    const overlay = findElements(el, x => x && x.props && x.props.className === 'discard-drawer-overlay');
    expect(overlay).toHaveLength(1);
    overlay[0].props.onClick();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
