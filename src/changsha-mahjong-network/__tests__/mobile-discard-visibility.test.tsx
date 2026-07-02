import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { MobileLatestDiscardDock } from '../components/MobileLatestDiscardDock.jsx';
import { MobileCenterDiscardArea } from '../components/MobileCenterDiscardArea.jsx';
import { MobileDiscardHistoryDrawer } from '../components/MobileDiscardHistoryDrawer.jsx';
import type { Tile } from '../../changsha-mahjong/types/tile.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

describe('Mobile Discard Visibility Tests', () => {

  describe('MobileLatestDiscardDock', () => {
    it('should render latest discard for each active player and highlight global latest', () => {
      const globalLatest = makeTile('wan', 5, 'global_latest');
      const players = [
        { seat: 0 as const, playerName: '我', isMe: true, latestTile: makeTile('wan', 1, 'me_latest') },
        { seat: 1 as const, playerName: '玩家1', isMe: false, latestTile: globalLatest },
        { seat: 2 as const, playerName: '玩家2', isMe: false, latestTile: undefined }
      ];

      const el = MobileLatestDiscardDock({ players, globalLatestTile: globalLatest }) as any;
      expect(el).not.toBeNull();
      expect(el.props.className).toBe('mobile-latest-discard-dock');

      const itemsContainer = el.props.children[1];
      const items = itemsContainer.props.children;
      expect(items).toHaveLength(3);

      // Check "我" latest card
      expect(items[0].props.children[0].props.children).toContain('我');
      expect(items[0].props.children[1].props.children[0].props.tile.instanceId).toBe('me_latest');

      // Check "玩家1" latest card (global latest)
      expect(items[1].props.children[0].props.children).toContain('玩家1');
      expect(items[1].props.children[1].props.children[0].props.tile.instanceId).toBe('global_latest');
      // Should have badge "最新"
      expect(items[1].props.children[1].props.children[1].props.children).toBe('最新');

      // Check "玩家2" latest card (none)
      expect(items[2].props.children[1].props.children).toBe('无');
    });
  });

  describe('MobileCenterDiscardArea latest-first and compression', () => {
    it('should reverse discard tiles and show +N badge for history', () => {
      const discards = [
        makeTile('wan', 1, 't1'),
        makeTile('wan', 2, 't2'),
        makeTile('wan', 3, 't3'),
        makeTile('wan', 4, 't4'),
        makeTile('wan', 5, 't5'),
        makeTile('wan', 6, 't6'),
        makeTile('wan', 7, 't7'),
        makeTile('wan', 8, 't8'),
      ];

      const players = [{
        seat: 0 as const,
        playerName: '我',
        discards,
        isCurrent: true,
        isMe: true,
      }];

      const el = MobileCenterDiscardArea({ players, lastDiscardTile: discards[7] }) as any;
      const row = el.props.children[0];
      const riverRow = row.props.children[1];
      
      const children = riverRow.props.children;
      expect(children).toHaveLength(2);

      const tiles = children[0];
      expect(tiles).toHaveLength(6);

      // Latest card (t8) should be first (index 0) due to latest-first reversing
      expect(tiles[0].props.children.props.tile.instanceId).toBe('t8');
      expect(tiles[0].props.className).toBe('discard-tile-latest');

      // Oldest visible card in the main view should be t3 (index 5)
      expect(tiles[5].props.children.props.tile.instanceId).toBe('t3');

      // The second child (index 1) should be the +M history badge showing "+2 历史"
      const badge = children[1];
      expect(badge.props.children[0]).toBe('+');
      expect(badge.props.children[1]).toBe(2);
      expect(badge.props.children[2]).toBe(' 历史');
    });
  });

  describe('MobileDiscardHistoryDrawer', () => {
    it('should render all discards in chronological order', () => {
      const discards = [
        makeTile('wan', 1, 't1'),
        makeTile('wan', 2, 't2'),
        makeTile('wan', 3, 't3'),
      ];

      const onClose = vi.fn();
      const el = MobileDiscardHistoryDrawer({
        isOpen: true,
        onClose,
        playerName: '玩家1',
        isMe: false,
        discards,
        globalLatestTile: discards[2]
      }) as any;

      expect(el).not.toBeNull();
      expect(el.props.className).toBe('discard-drawer-overlay');

      const drawerContent = el.props.children;
      const listContainer = drawerContent.props.children[1];
      const items = listContainer.props.children;
      expect(items).toHaveLength(3);

      // Verify normal chronological order: t1, t2, t3
      expect(items[0].props.children[0].props.tile.instanceId).toBe('t1');
      expect(items[1].props.children[0].props.tile.instanceId).toBe('t2');
      expect(items[2].props.children[0].props.tile.instanceId).toBe('t3');
    });
  });
});
