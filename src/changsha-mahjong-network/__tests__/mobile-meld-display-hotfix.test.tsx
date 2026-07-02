/**
 * mobile-meld-display-hotfix.test.tsx (vitest style)
 * Tests that MobileMeldArea displays melds correctly.
 * 6 tests total.
 */
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { MobileMeldArea } from '../components/MobileMeldArea.jsx';
import type { Meld } from '../../changsha-mahjong/types/meld.js';
import type { Tile } from '../../changsha-mahjong/types/tile.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

const chiMeld: Meld = {
  type: 'chi',
  tiles: [makeTile('wan', 3, 'c1'), makeTile('wan', 4, 'c2'), makeTile('wan', 5, 'c3')],
  exposed: true,
};

const pengMeld: Meld = {
  type: 'peng',
  tiles: [makeTile('tong', 5, 'p1'), makeTile('tong', 5, 'p2'), makeTile('tong', 5, 'p3')],
  exposed: true,
};

const gangMeld: Meld = {
  type: 'mingGang',
  tiles: [makeTile('tiao', 7, 'g1'), makeTile('tiao', 7, 'g2'), makeTile('tiao', 7, 'g3'), makeTile('tiao', 7, 'g4')],
  exposed: true,
};

describe('Mobile Meld Display Hotfix Tests', () => {

  it('1. 自己吃过的副露在手机端显示 "吃" 标签', () => {
    const el = MobileMeldArea({ melds: [chiMeld] }) as any;
    expect(el).not.toBeNull();
    const group = el.props.children[0];
    const label = group.props.children[0];
    expect(label.props.children).toBe('吃');
  });

  it('2. 自己碰过的副露在手机端显示 "碰" 标签', () => {
    const el = MobileMeldArea({ melds: [pengMeld] }) as any;
    expect(el).not.toBeNull();
    const group = el.props.children[0];
    const label = group.props.children[0];
    expect(label.props.children).toBe('碰');
  });

  it('3. 自己杠过的副露在手机端显示杠类型标签', () => {
    const el = MobileMeldArea({ melds: [gangMeld] }) as any;
    expect(el).not.toBeNull();
    const group = el.props.children[0];
    const label = group.props.children[0];
    expect(label.props.children).toBe('直杠');
  });

  it('4. 无副露时 MobileMeldArea 返回 null', () => {
    const el = MobileMeldArea({ melds: [] });
    expect(el).toBeNull();
  });

  it('5. multiple melds displayed in MobileMeldArea', () => {
    const el = MobileMeldArea({ melds: [chiMeld, pengMeld] }) as any;
    expect(el).not.toBeNull();
    expect(el.props.children).toHaveLength(2);
    expect(el.props.children[0].props.children[0].props.children).toBe('吃');
    expect(el.props.children[1].props.children[0].props.children).toBe('碰');
  });

  it('6. inactive seat 副露不显示（空数组返回 null）', () => {
    const el = MobileMeldArea({ melds: [] });
    expect(el).toBeNull();
  });
});
