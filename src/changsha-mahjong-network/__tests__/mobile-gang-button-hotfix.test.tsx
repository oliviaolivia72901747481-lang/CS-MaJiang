/**
 * mobile-gang-button-hotfix.test.tsx (vitest style)
 * Tests gang button rendering in MobileActionBar.
 * 6 tests total.
 */
import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { MobileActionBar } from '../components/MobileActionBar.jsx';
import type { Tile } from '../../changsha-mahjong/types/tile.js';
import type { PendingAction } from '../../changsha-mahjong/types/game.js';

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

const gangAnAction: PendingAction = {
  seat: 0,
  type: 'anGang',
  priority: 3,
  options: [
    [makeTile('wan', 9, 'a1'), makeTile('wan', 9, 'a2'), makeTile('wan', 9, 'a3'), makeTile('wan', 9, 'a4')],
  ],
};

const gangBuAction: PendingAction = {
  seat: 0,
  type: 'buGang',
  priority: 3,
  tile: makeTile('tong', 3, 'b1'),
};

const passAction: PendingAction = {
  seat: 0,
  type: 'pass',
  priority: 0,
};

describe('Mobile Gang Button Hotfix Tests', () => {

  it('1. pendingActions 有 anGang 时显示"杠"按钮', () => {
    const el = MobileActionBar({
      gangAction: gangAnAction,
      passAction: passAction,
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {},
    }) as any;
    expect(el).not.toBeNull();
    // In MobileActionBar, gangAction button is the 4th item (index 3) or we search for its class/text
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    expect(gangBtn).toBeDefined();
  });

  it('2. pendingActions 有 buGang 时显示"杠"按钮', () => {
    const el = MobileActionBar({
      gangAction: gangBuAction,
      passAction: passAction,
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {},
    }) as any;
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    expect(gangBtn).toBeDefined();
  });

  it('3. 点击"杠"按钮调用 onGangClick', () => {
    const onGangClick = vi.fn();
    const el = MobileActionBar({
      gangAction: gangAnAction,
      passAction: passAction,
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick,
    }) as any;
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    gangBtn.props.onClick();
    expect(onGangClick).toHaveBeenCalledTimes(1);
  });

  it('4. actionPending 为 true 时"杠"按钮被禁用', () => {
    const el = MobileActionBar({
      gangAction: gangAnAction,
      passAction: passAction,
      actionPending: true,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {},
    }) as any;
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    expect(gangBtn.props.disabled).toBe(true);
  });

  it('5. 杠按钮具有 mobile-action-btn class（触控尺寸）', () => {
    const el = MobileActionBar({
      gangAction: gangBuAction,
      passAction: passAction,
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {},
    }) as any;
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    expect(gangBtn.props.className).toContain('mobile-action-btn');
  });

  it('6. gangAction 为 undefined 时不显示"杠"按钮', () => {
    const el = MobileActionBar({
      gangAction: undefined,
      passAction: passAction,
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {},
    });
    const buttons = el.props.children.filter(Boolean);
    const gangBtn = buttons.find((btn: any) => btn.props.children === '杠');
    expect(gangBtn).toBeUndefined();
  });
});
