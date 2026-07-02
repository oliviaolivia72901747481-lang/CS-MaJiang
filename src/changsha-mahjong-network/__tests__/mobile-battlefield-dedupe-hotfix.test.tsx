import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { MobileLatestDiscardDock } from '../components/MobileLatestDiscardDock.jsx';
import { MobileCenterDiscardArea } from '../components/MobileCenterDiscardArea.jsx';
import { ActionSourceTileBanner } from '../components/ActionSourceTileBanner.jsx';
import { ActionCandidatePanel } from '../components/ActionCandidatePanel.jsx';

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

function findElements(el: any, predicate: (x: any) => boolean): any[] {
  const results: any[] = [];
  if (!el) return results;
  if (predicate(el)) results.push(el);
  const children = el.props?.children;
  if (children) {
    React.Children.forEach(children, child => {
      results.push(...findElements(child, predicate));
    });
  }
  return results;
}

function makeTile(suit: string, rank: number, id: string) {
  return { suit, rank, instanceId: id };
}

const sourceTile = makeTile('tiao', 3, 'source-t3');

const view: any = {
  roomId: '105236',
  seat: 0,
  phase: 'waitingForResponses',
  currentSeat: 1,
  dealerSeat: 0,
  wallRemainingCount: 48,
  self: {
    seat: 0,
    hand: [makeTile('tiao', 3, 'self-t3-a'), makeTile('tiao', 3, 'self-t3-b'), makeTile('wan', 9, 'self-w9')],
    melds: [],
    discards: [makeTile('wan', 9, 'self-d1'), makeTile('tong', 3, 'self-d2')],
    score: 1000,
    playerName: 'Human_Player',
  },
  opponents: [
    {
      seat: 1,
      handCount: 12,
      melds: [],
      discards: [makeTile('wan', 7, 's1-d1'), sourceTile],
      score: 1000,
      connected: true,
      isAI: true,
      playerName: 'AI_Seat_1',
    },
    {
      seat: 2,
      handCount: 13,
      melds: [],
      discards: [makeTile('tong', 2, 's2-d1'), makeTile('tong', 8, 's2-d2')],
      score: 1000,
      connected: true,
      isAI: true,
      playerName: 'AI_Seat_2',
    },
    {
      seat: 3,
      handCount: 13,
      melds: [],
      discards: [makeTile('tiao', 9, 's3-d1'), makeTile('wan', 3, 's3-d2')],
      score: 1000,
      connected: true,
      isAI: true,
      playerName: 'AI_Seat_3',
    },
  ],
  pendingActions: [
    { seat: 0, type: 'peng', priority: 3, tile: sourceTile },
    { seat: 0, type: 'hu', priority: 4, tile: sourceTile },
    { seat: 0, type: 'pass', priority: 1 },
  ],
  logs: [{ step: 1, phase: 'playing', seat: 1, action: '打出', detail: 'tiao_3' }],
};

describe('v0.8.8 hotfix mobile battlefield dedupe', () => {
  it('removes duplicate mobile latest dock and keeps center discard river as the only latest overview', () => {
    const el = MobileOnlineGameLayout({
      view,
      roomId: '105236',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
    }) as any;

    expect(findElements(el, x => x?.type === MobileLatestDiscardDock)).toHaveLength(0);

    const centerArea = findElements(el, x => x?.type === MobileCenterDiscardArea)[0];
    expect(centerArea).toBeTruthy();
    expect(centerArea.props.players.map((p: any) => p.playerName)).toEqual(['我', '下', '对', '上']);

    const renderedCenter = MobileCenterDiscardArea(centerArea.props) as any;
    expect(findElements(renderedCenter, x => x?.props?.className === 'tile-seat-latest-dot')).toHaveLength(4);
    expect(findElements(renderedCenter, x => x?.props?.className === 'discard-tile-latest tile-global-latest-discard')).toHaveLength(1);
    expect(JSON.stringify(renderedCenter)).not.toContain('未知玩家');
  });

  it('removes standalone mobile action source banner and moves source information into candidate title', () => {
    const el = MobileOnlineGameLayout({
      view,
      roomId: '105236',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
    }) as any;

    expect(findElements(el, x => x?.type === ActionSourceTileBanner)).toHaveLength(0);

    const candidatePanel = findElements(el, x => x?.type === ActionCandidatePanel)[0];
    expect(candidatePanel).toBeTruthy();
    expect(candidatePanel.props.compactTitle).toBe('下 打出 3条, 可碰 / 可胡');
    expect(candidatePanel.props.compactTitle).not.toContain('未知玩家');
    expect(candidatePanel.props.candidates.map((c: any) => c.actionType)).toEqual(['peng', 'hu']);

    const text = JSON.stringify(el);
    expect(text).toContain('过');
  });
});
