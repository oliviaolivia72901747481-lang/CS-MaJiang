import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';

vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => [initialValue, () => {}],
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: () => {},
    Fragment: ({ children }: any) => children,
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

import { CurrentTurnBanner } from '../components/CurrentTurnBanner.jsx';

describe('v0.8.4 Current Turn Banner Tests', () => {
  const getPlayerAtSeat = (s: number) => {
    if (s === 0) {
      return { seat: 0 as const, playerName: '你', connected: true, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'online' };
    }
    if (s === 1) {
      return { seat: 1 as const, playerName: '小张', connected: true, isAI: true, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'online' };
    }
    return { seat: 2 as const, playerName: '小李', connected: false, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'left' };
  };

  it('1. should show輪到你出牌 when currentSeat is self seat', () => {
    const view: any = { currentSeat: 0 };
    const el = CurrentTurnBanner({ view, seat: 0, getPlayerAtSeat });
    expect(el.props.children).toBe('轮到你出牌');
    expect(el.props.style.animation).toBe('pulse 2s infinite');
  });

  it('2. should show waiting text for opponent turn', () => {
    const view: any = { currentSeat: 1 };
    const el = CurrentTurnBanner({ view, seat: 0, getPlayerAtSeat });
    expect(el.props.children).toBe('等待 机器人 小张 出牌 ');
  });

  it('3. should show AI trustee mode when player has left', () => {
    const view: any = { currentSeat: 2 };
    const el = CurrentTurnBanner({ view, seat: 0, getPlayerAtSeat });
    expect(el.props.children).toContain('AI托管中');
  });
});
