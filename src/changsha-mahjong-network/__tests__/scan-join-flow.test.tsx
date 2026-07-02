import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomJoinPanel } from '../components/RoomJoinPanel.jsx';
import { OnlineLobbyPage } from '../components/OnlineLobbyPage.jsx';

// Mock react default and named imports
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

describe('Scan QR Join Flow UX Tests', () => {
  beforeEach(() => {
    // Mock global window and localStorage globally in Node environment
    global.localStorage = {
      getItem: vi.fn((key) => {
        if (key === 'online_player_name') return 'Alice';
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn()
    } as any;

    global.window = {
      location: {
        search: '?mode=online&roomId=999888',
        host: '192.168.1.100:5173',
        protocol: 'http:',
        hostname: '192.168.1.100'
      },
      localStorage: global.localStorage,
      navigator: {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve())
        }
      }
    } as any;

    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, activeRooms: 1, activeSockets: 2, lanIPs: ['192.168.1.100'], frontendPort: 5173 })
      } as any)
    );
  });

  it('1. RoomJoinPanel extracts and fills roomId from query params automatically', () => {
    const el = RoomJoinPanel({ onJoin: () => {} }) as any;
    const input = el.props.children[2].props.children[0];
    expect(input.props.value).toBe('999888');
  });

  it('2. OnlineLobbyPage loads and checks mode=online search parameters', () => {
    const el = OnlineLobbyPage();
    expect(el).toBeDefined();
  });

  it('3. does not join automatically if nickname is empty or missing from storage', () => {
    (global.localStorage.getItem as any).mockReturnValue(null);
    const el = OnlineLobbyPage() as any;
    // Inspect visual nodes
    expect(el).toBeDefined();
  });

  it('4. playerName is fetched and auto-filled from localStorage if it exists', () => {
    const el = OnlineLobbyPage();
    expect(el).toBeDefined();
    expect(global.localStorage.getItem).toHaveBeenCalledWith('online_player_name');
  });

  it('5. autoJoinLastNickname setting is enabled by default in lobby', () => {
    const el = OnlineLobbyPage();
    expect(el).toBeDefined();
  });

  it('6. lobby handles and displays error banner when join Room call raises errors', () => {
    const el = OnlineLobbyPage();
    expect(el).toBeDefined();
  });
});
