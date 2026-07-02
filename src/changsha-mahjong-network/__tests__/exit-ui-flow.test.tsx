import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { OnlineGamePage } from '../components/OnlineGamePage.jsx';
import { RoomStatusPanel } from '../components/RoomStatusPanel.jsx';

const mobileMoreState = vi.hoisted(() => ({
  forceOpen: false,
  callIndex: 0,
}));

// Mock react
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    const val = typeof init === 'function' ? (init as any)() : init;
    mobileMoreState.callIndex += 1;
    if (mobileMoreState.forceOpen && mobileMoreState.callIndex === 8) {
      return [true, vi.fn()];
    }
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

function findElementByType(element: any, type: any): any {
  if (!element) return null;
  if (element.type === type) return element;
  if (element.props && element.props.children) {
    const ch = element.props.children;
    if (Array.isArray(ch)) {
      for (const child of ch) {
        const found = findElementByType(child, type);
        if (found) return found;
      }
    } else {
      return findElementByType(ch, type);
    }
  }
  return null;
}

function findButtonByText(element: any, text: string): any {
  if (!element) return null;
  if (element.type === 'button') {
    const children = element.props.children;
    if (typeof children === 'string' && children.includes(text)) {
      return element;
    }
    if (Array.isArray(children) && children.some(c => typeof c === 'string' && c.includes(text))) {
      return element;
    }
  }
  if (element.props && element.props.children) {
    const ch = element.props.children;
    if (Array.isArray(ch)) {
      for (const child of ch) {
        const found = findButtonByText(child, text);
        if (found) return found;
      }
    } else {
      return findButtonByText(ch, text);
    }
  }
  return null;
}

describe('Exit UI Flow Confirmation Tests', () => {
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
      { seat: 1, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, connectionState: 'ai' },
      { seat: 2, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, connectionState: 'ai' },
      { seat: 3, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, connectionState: 'ai' }
    ],
    pendingActions: [],
    logs: []
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mobileMoreState.forceOpen = false;
    mobileMoreState.callIndex = 0;
    global.confirm = vi.fn().mockReturnValue(true);
    global.window = {
      innerWidth: 1024,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as any;
  });

  it('1. playing stage: exit click shows AI trustee confirmation', () => {
    const leaveRoomSpy = vi.fn().mockResolvedValue(undefined);
    
    const page = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: leaveRoomSpy
    }) as any;

    const panel = findElementByType(page, RoomStatusPanel);
    expect(panel).not.toBeNull();
    
    const onExit = panel.props.onExit;
    onExit();

    expect(global.confirm).toHaveBeenCalledWith('对局已开始，退出后将由 AI 托管，是否确认？');
    expect(leaveRoomSpy).toHaveBeenCalledWith('user_leave');
  });

  it('2. settlement stage: exit click shows settlement exit confirmation', () => {
    const leaveRoomSpy = vi.fn().mockResolvedValue(undefined);
    const settlementView = {
      ...mockView,
      phase: 'settlement'
    };

    const page = OnlineGamePage({
      view: settlementView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: leaveRoomSpy
    }) as any;

    const panel = findElementByType(page, RoomStatusPanel);
    expect(panel).not.toBeNull();

    const onExit = panel.props.onExit;
    onExit();

    expect(global.confirm).toHaveBeenCalledWith('确定离开结算页面吗？');
    expect(leaveRoomSpy).toHaveBeenCalledWith('user_leave');
  });

  it('3. MobileOnlineGameLayout playing exit click shows AI trustee confirmation', () => {
    const leaveRoomSpy = vi.fn().mockResolvedValue(undefined);
    mobileMoreState.forceOpen = true;
    mobileMoreState.callIndex = 0;
    
    const layout = MobileOnlineGameLayout({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: leaveRoomSpy
    }) as any;

    const exitBtn = findButtonByText(layout, '离开房间');
    expect(exitBtn).not.toBeNull();

    const onClick = exitBtn.props.onClick;
    onClick();

    expect(global.confirm).toHaveBeenCalledWith('对局已开始，退出后将由 AI 托管，是否确认？');
    expect(leaveRoomSpy).toHaveBeenCalledWith('user_leave');
  });

  it('4. MobileOnlineGameLayout settlement exit click shows settlement exit confirmation', () => {
    const leaveRoomSpy = vi.fn().mockResolvedValue(undefined);
    mobileMoreState.forceOpen = true;
    mobileMoreState.callIndex = 0;
    const settlementView = {
      ...mockView,
      phase: 'settlement'
    };

    const layout = MobileOnlineGameLayout({
      view: settlementView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: leaveRoomSpy
    }) as any;

    const exitBtn = findButtonByText(layout, '离开房间');
    expect(exitBtn).not.toBeNull();

    const onClick = exitBtn.props.onClick;
    onClick();

    expect(global.confirm).toHaveBeenCalledWith('确定离开结算页面吗？');
    expect(leaveRoomSpy).toHaveBeenCalledWith('user_leave');
  });

  it('5. Confirm false does not trigger leaveRoom', () => {
    global.confirm = vi.fn().mockReturnValue(false);
    const leaveRoomSpy = vi.fn().mockResolvedValue(undefined);

    const page = OnlineGamePage({
      view: mockView,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false,
      leaveRoom: leaveRoomSpy
    }) as any;

    const panel = findElementByType(page, RoomStatusPanel);
    expect(panel).not.toBeNull();

    const onExit = panel.props.onExit;
    onExit();

    expect(global.confirm).toHaveBeenCalled();
    expect(leaveRoomSpy).not.toHaveBeenCalled();
  });
});
