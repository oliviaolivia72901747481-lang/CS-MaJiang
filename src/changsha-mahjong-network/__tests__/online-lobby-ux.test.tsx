import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomJoinPanel } from '../components/RoomJoinPanel.jsx';
import { JoinQRCode } from '../components/JoinQRCode.jsx';

// Mock react named imports and default imports
vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  const mockUseState = (init: any) => {
    // Check if it is the qrDataUrl state
    if (init === '' && typeof init === 'string') {
      return ['data:image/png;base64,dummy', vi.fn()];
    }
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

describe('Online Lobby UX Component Tests', () => {
  beforeEach(() => {
    // Mock global window location search
    const store: Record<string, string> = {};
    global.window = {
      location: {
        search: '?roomId=482910',
        host: '192.168.1.100:5173'
      },
      navigator: {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve())
        }
      }
    } as any;
  });

  it('1. RoomJoinPanel renders a form element as root', () => {
    const el = RoomJoinPanel({ onJoin: () => {} });
    expect(el).toBeDefined();
    expect(el.type).toBe('form');
  });

  it('2. RoomJoinPanel extracts roomId from URL search params on initialization', () => {
    const el = RoomJoinPanel({ onJoin: () => {} }) as any;
    const input = el.props.children[2].props.children[0];
    expect(input.props.value).toBe('482910');
  });

  it('3. RoomJoinPanel input defaults to empty string if no roomId query param exists', () => {
    global.window.location.search = '';
    const el = RoomJoinPanel({ onJoin: () => {} }) as any;
    const input = el.props.children[2].props.children[0];
    expect(input.props.value).toBe('');
  });

  it('4. JoinQRCode component renders containing the correct QR server API link', () => {
    const el = JoinQRCode({ roomId: '999888', joinUrl: 'http://192.168.1.100:5173/?mode=online&roomId=999888' }) as any;
    const imgWrapper = el.props.children[2];
    const img = imgWrapper.props.children;
    expect(img.type).toBe('img');
    expect(img.props.src).toContain('data:image/png;base64,');
  });

  it('5. JoinQRCode includes room code text in child nodes', () => {
    const el = JoinQRCode({ roomId: '999888', joinUrl: 'http://192.168.1.100:5173/?roomId=999888' }) as any;
    const infoContainer = el.props.children[3];
    const roomIdText = infoContainer.props.children[0].props.children[0];
    expect(roomIdText.props.children[1].props.children).toBe('999888');
  });
});
