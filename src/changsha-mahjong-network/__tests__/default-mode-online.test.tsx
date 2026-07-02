import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { MainApp } from '../../main.jsx';

// Mock components
vi.mock('../../changsha-mahjong-ui/components/MahjongGamePage.jsx', () => ({
  MahjongGamePage: () => React.createElement('div', { id: 'mahjong-solo-page' }, 'Solo Page')
}));

vi.mock('../../changsha-mahjong-network/components/OnlineLobbyPage.jsx', () => ({
  OnlineLobbyPage: () => React.createElement('div', { id: 'mahjong-online-lobby' }, 'Online Page')
}));

// React mock stub
vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => {
      // In tests, if initialValue is a function, evaluate it
      const val = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [val, () => {}];
    },
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: () => {},
    Fragment: ({ children }: any) => children,
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

describe('Default Mode Online Routing Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should default to online mode when search parameters are empty', () => {
    vi.stubGlobal('window', {
      location: {
        search: '',
        href: 'http://localhost:5173/'
      }
    });

    const el = MainApp();
    const subComponent = el.props.children[1];
    const rendered = typeof subComponent.type === 'function' ? subComponent.type() : subComponent;
    expect(rendered.props.id).toBe('mahjong-online-lobby');
  });

  it('2. should respect mode=online query parameter', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?mode=online',
        href: 'http://localhost:5173/?mode=online'
      }
    });

    const el = MainApp();
    const subComponent = el.props.children[1];
    const rendered = typeof subComponent.type === 'function' ? subComponent.type() : subComponent;
    expect(rendered.props.id).toBe('mahjong-online-lobby');
  });

  it('3. should respect mode=solo query parameter', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?mode=solo',
        href: 'http://localhost:5173/?mode=solo'
      }
    });

    const el = MainApp();
    const subComponent = el.props.children[1];
    const rendered = typeof subComponent.type === 'function' ? subComponent.type() : subComponent;
    expect(rendered.props.id).toBe('mahjong-solo-page');
  });

  it('4. should respect mode=practice query parameter', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?mode=practice',
        href: 'http://localhost:5173/?mode=practice'
      }
    });

    const el = MainApp();
    const subComponent = el.props.children[1];
    const rendered = typeof subComponent.type === 'function' ? subComponent.type() : subComponent;
    expect(rendered.props.id).toBe('mahjong-solo-page');
  });

  it('5. should prioritize roomId and go to online mode even if mode=solo is present', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?mode=solo&roomId=482910',
        href: 'http://localhost:5173/?mode=solo&roomId=482910'
      }
    });

    const el = MainApp();
    const subComponent = el.props.children[1];
    const rendered = typeof subComponent.type === 'function' ? subComponent.type() : subComponent;
    expect(rendered.props.id).toBe('mahjong-online-lobby');
  });
});
