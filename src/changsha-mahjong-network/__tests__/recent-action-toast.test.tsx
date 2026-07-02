import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

vi.mock('react', () => {
  const mockStatesMap = new Map<string, any>();
  const mockSettersMap = new Map<string, (val: any) => void>();
  let mockStateIndex = 0;

  const mockReactInstance = {
    useState: (initialValue: any) => {
      const key = `state_${mockStateIndex++}`;
      if (!mockStatesMap.has(key)) {
        mockStatesMap.set(key, initialValue);
      }
      const setter = (newValue: any) => {
        mockStatesMap.set(key, newValue);
      };
      mockSettersMap.set(key, setter);
      return [mockStatesMap.get(key), setter];
    },
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: (effect: () => any, deps: any[]) => {
      effect();
    },
    Fragment: ({ children }: any) => children,
    clearMocks: () => {
      mockStatesMap.clear();
      mockSettersMap.clear();
      mockStateIndex = 0;
    },
    resetStateIndex: () => {
      mockStateIndex = 0;
    }
  };

  return {
    ...mockReactInstance,
    default: mockReactInstance,
  };
});

import { RecentActionToast } from '../components/RecentActionToast.jsx';

describe('v0.8.4 Recent Action Toast Tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  it('1. should not render when latestLog is null', () => {
    const el = RecentActionToast({ latestLog: null });
    expect(el).toBeNull();
  });

  it('2. should render toast when latestLog is provided', () => {
    const log = { step: 1, seat: 0 as const, action: '打出', detail: '五万', phase: 'playing' as const };
    const el = RecentActionToast({ latestLog: log });
    expect(el).not.toBeNull();
    expect(el!.props.className).toBe('recent-action-toast');
    expect(JSON.stringify(el!.props.children)).toContain('五万');
  });

  it('3. should have absolute centering and z-index styles', () => {
    const log = { step: 1, seat: 0 as const, action: '打出', detail: '五万', phase: 'playing' as const };
    const el = RecentActionToast({ latestLog: log });
    expect(el!.props.style.position).toBe('absolute');
    expect(el!.props.style.zIndex).toBe(50);
  });
});
