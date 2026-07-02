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

import { MobileOpponentStrip } from '../components/MobileOpponentStrip.jsx';

function findAllElements(element: any, predicate: (el: any) => boolean): any[] {
  const results: any[] = [];
  function traverse(el: any) {
    if (!el) return;
    if (predicate(el)) results.push(el);
    if (el.props && el.props.children) {
      const children = el.props.children;
      if (Array.isArray(children)) {
        children.flat(Infinity).forEach(traverse);
      } else {
        traverse(children);
      }
    }
  }
  traverse(element);
  return results;
}

describe('v0.8.4 Connection Status Badge Tests', () => {
  it('1. should display 在线 badge when player is online', () => {
    const el = MobileOpponentStrip({
      player: { seat: 1, playerName: '玩家1', connected: true, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'online' },
      isCurrent: false
    });

    const texts = findAllElements(el, x => typeof x === 'string');
    const hasOnline = texts.some(t => t.includes('在线'));
    expect(hasOnline).toBe(true);
  });

  it('2. should display 重连中 badge when player is reconnecting', () => {
    const el = MobileOpponentStrip({
      player: { seat: 1, playerName: '玩家1', connected: false, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'reconnecting' },
      isCurrent: false
    });

    const texts = findAllElements(el, x => typeof x === 'string');
    const hasReconnecting = texts.some(t => t.includes('重连中...'));
    expect(hasReconnecting).toBe(true);
  });

  it('3. should display 离线 badge when player is offline', () => {
    const el = MobileOpponentStrip({
      player: { seat: 1, playerName: '玩家1', connected: false, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'offline' },
      isCurrent: false
    });

    const texts = findAllElements(el, x => typeof x === 'string');
    const hasOffline = texts.some(t => t.includes('离线'));
    expect(hasOffline).toBe(true);
  });

  it('4. should display 已离开 (AI托管) badge when player has left', () => {
    const el = MobileOpponentStrip({
      player: { seat: 1, playerName: '玩家1', connected: false, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, connectionState: 'left' },
      isCurrent: false
    });

    const texts = findAllElements(el, x => typeof x === 'string');
    const hasLeft = texts.some(t => t.includes('已离开 (AI托管)'));
    expect(hasLeft).toBe(true);
  });
});
