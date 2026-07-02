import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MainApp, shouldHideModeSwitch } from '../../main.jsx';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { MobileLatestDiscardDock } from '../components/MobileLatestDiscardDock.jsx';
import { MobileCenterDiscardArea } from '../components/MobileCenterDiscardArea.jsx';
import { TileView } from '../components/TileView.jsx';
import type { Tile } from '../../changsha-mahjong/types/tile.js';

vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    const val = typeof init === 'function' ? init() : init;
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

vi.mock('react-dom/client', () => ({
  default: { createRoot: vi.fn(() => ({ render: vi.fn() })) },
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('../components/MobileOpponentStrip.jsx', () => ({
  MobileOpponentStrip: ({ player }: any) => <div data-testid="opponent-strip">{player.playerName}</div>,
}));

vi.mock('../components/ConnectionDiagnosticPanel.jsx', () => ({
  ConnectionDiagnosticPanel: () => <button>局域网诊断</button>,
}));

vi.mock('../components/OnlineHelpPanel.jsx', () => ({
  OnlineHelpPanel: () => <button>查看长沙麻将</button>,
}));

function makeTile(suit: string, rank: number, id: string): Tile {
  return { suit: suit as any, rank: rank as any, instanceId: id };
}

function findElements(el: any, predicate: (x: any) => boolean): any[] {
  const results: any[] = [];
  if (!el) return results;
  if (predicate(el)) results.push(el);
  const children = el.props?.children;
  if (children) {
    for (const child of Array.isArray(children) ? children : [children]) {
      results.push(...findElements(child, predicate));
    }
  }
  return results;
}

const discards = [
  makeTile('wan', 1, 'd1'),
  makeTile('wan', 2, 'd2'),
  makeTile('wan', 3, 'd3'),
  makeTile('wan', 4, 'd4'),
];

const compactView: any = {
  roomId: '632863',
  seat: 2,
  phase: 'playing',
  currentSeat: 2,
  dealerSeat: 0,
  wallRemainingCount: 49,
  self: {
    seat: 2,
    hand: [makeTile('tong', 5, 'h1')],
    melds: [],
    discards: [makeTile('tong', 5, 'me-latest')],
    score: 1000,
    playerName: 'Human_Player_Long_Name',
  },
  opponents: [
    { seat: 0, handCount: 13, melds: [], discards, score: 1000, connected: true, isAI: true, playerName: 'AI_Seat_0' },
    { seat: 1, handCount: 13, melds: [], discards: [makeTile('tiao', 8, 'opp1')], score: 1000, connected: true, isAI: true, playerName: 'AI_Seat_1' },
    { seat: 3, handCount: 13, melds: [], discards: [makeTile('wan', 3, 'latest')], score: 1000, connected: true, isAI: true, playerName: 'AI_Seat_3' },
  ],
  pendingActions: [{ seat: 2, type: 'pass', priority: 0 }],
  logs: [{ step: 1, phase: 'playing', seat: 3, action: '打出', detail: 'wan_3' }],
};

describe('v0.8.8 mobile compact layout', () => {
  it('hides the global mode switch for active online game pages without roomId in URL', () => {
    expect(shouldHideModeSwitch('online', false, true)).toBe(true);
    expect(shouldHideModeSwitch('online', false, false)).toBe(false);
    expect(shouldHideModeSwitch('local', true, true)).toBe(false);
  });

  it('hides the global mode switch when entering a room URL', () => {
    (globalThis as any).window = {
      location: { href: 'http://localhost:5173/?mode=online&roomId=632863', search: '?mode=online&roomId=632863' },
      history: { pushState: vi.fn() },
    };

    const el = MainApp() as any;
    const text = JSON.stringify(el);

    expect(text).not.toContain('单机陪练模式');
    expect(text).not.toContain('多人联机模式');
  });

  it('uses relative seat labels and compact discard tiles in latest and center discard areas', () => {
    const el = MobileOnlineGameLayout({
      view: compactView,
      roomId: '632863',
      seat: 2,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
    }) as any;

    const latestDock = findElements(el, x => x?.type === MobileLatestDiscardDock)[0];
    expect(latestDock.props.players.map((p: any) => p.playerName)).toEqual(['对', '上', '我', '下']);
    expect(latestDock.props.players.map((p: any) => p.playerName).join('|')).not.toContain('AI_Seat');

    const centerArea = findElements(el, x => x?.type === MobileCenterDiscardArea)[0];
    expect(centerArea.props.players.map((p: any) => p.playerName)).toEqual(['对', '上', '我', '下']);

    const renderedLatestDock = MobileLatestDiscardDock(latestDock.props) as any;
    const renderedCenterArea = MobileCenterDiscardArea(centerArea.props) as any;
    const tileViews = findElements(renderedLatestDock, x => x?.type === TileView)
      .concat(findElements(renderedCenterArea, x => x?.type === TileView));
    expect(tileViews.length).toBeGreaterThan(0);
    expect(tileViews.every(tv => tv.props.size === 'compact')).toBe(true);
  });

  it('keeps history and pass controls but moves secondary actions behind More', () => {
    const el = MobileOnlineGameLayout({
      view: compactView,
      roomId: '632863',
      seat: 2,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: async () => {},
    }) as any;

    const text = JSON.stringify(el);
    const centerArea = findElements(el, x => x?.type === MobileCenterDiscardArea)[0];
    const renderedCenterArea = MobileCenterDiscardArea(centerArea.props) as any;
    const historyBadges = findElements(renderedCenterArea, x => x?.props?.className === 'history-badge-btn');

    expect(text).toContain('更多');
    expect(historyBadges[0].props.children).toEqual(['+', 2]);
    expect(text).toContain('过');
    expect(text).not.toContain('我的副露');
    expect(text).not.toContain('请点击下方手牌选择出牌');
    expect(text).not.toContain('局域网诊断');
    expect(text).not.toContain('查看长沙麻将');
    expect(text).not.toContain('离开');
  });
});
