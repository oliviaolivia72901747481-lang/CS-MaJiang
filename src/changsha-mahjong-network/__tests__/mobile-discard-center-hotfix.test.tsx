/**
 * mobile-discard-center-hotfix.test.tsx (vitest style)
 * Tests for MobileCenterDiscardArea component.
 * 7 tests total.
 */
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { MobileCenterDiscardArea } from '../components/MobileCenterDiscardArea.jsx';
import type { DiscardPlayerEntry } from '../components/MobileCenterDiscardArea.jsx';
import type { Tile } from '../../changsha-mahjong/types/tile.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

function makePlayer(seat: 0|1|2|3, isMe: boolean, isCurrent: boolean, discardCount: number): DiscardPlayerEntry {
  const discards: Tile[] = Array.from({ length: discardCount }, (_, i) =>
    makeTile('wan', (i % 9) + 1, `s${seat}_d${i}`)
  );
  return {
    seat,
    playerName: isMe ? '我' : `玩家${seat}`,
    discards,
    isCurrent,
    isMe,
  };
}

function getDiscardRows(element: any): any[] {
  const grid = element.props.children;
  const rows = grid.props.children;
  return Array.isArray(rows) ? rows : [rows];
}

describe('Mobile Center Discard Area Tests', () => {

  it('1. 手机端渲染中心弃牌区', () => {
    const players = [makePlayer(0, true, true, 2), makePlayer(1, false, false, 1)];
    const el = MobileCenterDiscardArea({ players }) as any;
    expect(el).not.toBeNull();
    expect(el.props.className).toBe('mobile-center-discard-area');
  });

  it('2. 2 人局显示 2 条弃牌河', () => {
    const players = [makePlayer(0, true, false, 3), makePlayer(1, false, true, 2)];
    const el = MobileCenterDiscardArea({ players }) as any;
    const rows = getDiscardRows(el);
    expect(rows).toHaveLength(2);
    expect(rows[0].props.children[0].props.children).toBe('我');
    expect(rows[1].props.children[0].props.children).toBe('玩家1');
  });

  it('3. 3 人局显示 3 条弃牌河', () => {
    const players = [
      makePlayer(0, true, false, 2),
      makePlayer(1, false, false, 1),
      makePlayer(2, false, true, 3),
    ];
    const el = MobileCenterDiscardArea({ players }) as any;
    const rows = getDiscardRows(el);
    expect(rows).toHaveLength(3);
    expect(rows[0].props.children[0].props.children).toBe('我');
    expect(rows[1].props.children[0].props.children).toBe('玩家1');
    expect(rows[2].props.children[0].props.children).toBe('玩家2');
  });

  it('4. 4 人局显示 4 条弃牌河', () => {
    const players = [
      makePlayer(0, true, false, 2),
      makePlayer(1, false, false, 2),
      makePlayer(2, false, true, 2),
      makePlayer(3, false, false, 2),
    ];
    const el = MobileCenterDiscardArea({ players }) as any;
    const rows = getDiscardRows(el);
    expect(rows).toHaveLength(4);
    expect(rows[0].props.children[0].props.children).toBe('我');
    expect(rows[1].props.children[0].props.children).toBe('玩家1');
    expect(rows[2].props.children[0].props.children).toBe('玩家2');
    expect(rows[3].props.children[0].props.children).toBe('玩家3');
  });

  it('5. inactive seats 不显示弃牌河（empty players → null）', () => {
    const el = MobileCenterDiscardArea({ players: [] });
    expect(el).toBeNull();
  });

  it('6. 最近弃牌高亮显示', () => {
    const lastTile = makeTile('wan', 9, 'last_tile');
    const players: DiscardPlayerEntry[] = [{
      seat: 0,
      playerName: '我',
      discards: [makeTile('wan', 1, 'first'), lastTile],
      isCurrent: true,
      isMe: true,
    }];
    const el = MobileCenterDiscardArea({ players, lastDiscardTile: lastTile }) as any;
    const row = getDiscardRows(el)[0];
    const tilesWrapper = row.props.children[1];
    const tiles = tilesWrapper.props.children;
    // tiles[0] is the tilesArray, tiles[0][0] is the latest tile (lastTile) because of latest-first reversing
    const tilesArray = tiles[0];
    expect(tilesArray[0].props.className).toBe('discard-tile-latest');
  });

  it('7. 未出牌时显示"未出牌"提示文字', () => {
    const players: DiscardPlayerEntry[] = [
      makePlayer(0, true, true, 0),
    ];
    const el = MobileCenterDiscardArea({ players }) as any;
    const row = getDiscardRows(el)[0];
    const textSpan = row.props.children[1];
    expect(textSpan.props.children).toBe('未出牌');
  });
});
