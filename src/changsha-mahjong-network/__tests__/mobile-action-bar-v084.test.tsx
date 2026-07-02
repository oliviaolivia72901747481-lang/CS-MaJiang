import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { MobileActionBar } from '../components/MobileActionBar.jsx';

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

describe('v0.8.4 Mobile Action Bar Tests', () => {
  it('1. should show Hu button with correct highlight styles', () => {
    const el = MobileActionBar({
      huAction: { type: 'hu', seat: 0, priority: 3 },
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {}
    });

    const huBtn = findAllElements(el, x => x && x.props && x.props.className && x.props.className.includes('action-hu'));
    expect(huBtn.length).toBe(1);
    expect(huBtn[0].props.style.background).toContain('#ff4d4d');
  });

  it('2. should show Pass button', () => {
    const el = MobileActionBar({
      passAction: { type: 'pass', seat: 0, priority: 1 },
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {}
    });

    const passBtn = findAllElements(el, x => x && x.props && x.props.className && x.props.className.includes('action-pass'));
    expect(passBtn.length).toBe(1);
  });

  it('3. should disable buttons when actionPending is true', () => {
    const el = MobileActionBar({
      huAction: { type: 'hu', seat: 0, priority: 3 },
      passAction: { type: 'pass', seat: 0, priority: 1 },
      actionPending: true,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {}
    });

    const buttons = findAllElements(el, x => x && x.type === 'button');
    buttons.forEach(btn => {
      expect(btn.props.disabled).toBe(true);
    });
  });

  it('4. should triggers correct callbacks on click', () => {
    const onPerformAction = vi.fn();
    const el = MobileActionBar({
      huAction: { type: 'hu', seat: 0, priority: 3 },
      actionPending: false,
      onPerformAction,
      onChiClick: () => {},
      onGangClick: () => {}
    });

    const huBtn = findAllElements(el, x => x && x.props && x.props.className && x.props.className.includes('action-hu'))[0];
    huBtn.props.onClick();
    expect(onPerformAction).toHaveBeenCalledWith('hu');
  });

  it('5. buttons should have touch size class mobile-action-btn', () => {
    const el = MobileActionBar({
      huAction: { type: 'hu', seat: 0, priority: 3 },
      actionPending: false,
      onPerformAction: () => {},
      onChiClick: () => {},
      onGangClick: () => {}
    });

    const huBtn = findAllElements(el, x => x && x.props && x.props.className && x.props.className.includes('action-hu'))[0];
    expect(huBtn.props.className).toContain('mobile-action-btn');
  });
});
