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

import { SettlementModal } from '../components/SettlementModal.jsx';

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

describe('v0.8.4 Settlement Mobile Tests', () => {
  const getPlayerAtSeat = (s: number) => {
    if (s === 0) {
      return { seat: 0 as const, playerName: '你', connected: true, isAI: false, handCount: 13, melds: [], discards: [], score: 1000, hand: [] };
    }
    return { seat: s as any, playerName: `玩家${s}`, connected: true, isAI: s === 2, handCount: 13, melds: [], discards: [], score: 1000, hand: [] };
  };

  it('1. 2-player settlement should only render 2 player cards', () => {
    const settlement = {
      winnerSeats: [0],
      scoreDeltas: { 0: 100, 2: -100 } as any,
      scoreEvents: []
    };

    const el = SettlementModal({
      settlement,
      seat: 0,
      getPlayerAtSeat,
      onExitGame: () => {},
      activeSeats: [0, 2]
    });

    const items = findAllElements(el, x => x && x.key !== undefined && x.key !== null);
    const playerKeys = items.map(x => String(x.key));
    expect(playerKeys).toContain('0');
    expect(playerKeys).toContain('2');
  });

  it('2. should show AI labels correctly in settlement list', () => {
    const settlement = {
      winnerSeats: [0],
      scoreDeltas: { 0: 100, 2: -100 } as any,
      scoreEvents: []
    };

    const el = SettlementModal({
      settlement,
      seat: 0,
      getPlayerAtSeat,
      onExitGame: () => {},
      activeSeats: [0, 2]
    });

    const texts = findAllElements(el, x => typeof x === 'string');
    const hasAI = texts.some(t => t.includes('🤖 AI'));
    expect(hasAI).toBe(true);
  });
});
