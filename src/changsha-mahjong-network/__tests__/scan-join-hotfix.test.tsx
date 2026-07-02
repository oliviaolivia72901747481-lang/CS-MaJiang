import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { OnlineLobbyPage } from '../components/OnlineLobbyPage.jsx';
import { useOnlineMahjongGame } from '../client/useOnlineMahjongGame.js';

vi.mock('../client/useOnlineMahjongGame.js', () => ({
  useOnlineMahjongGame: vi.fn(),
  clearOnlineSession: vi.fn(),
}));

// React rendering mock structure
vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => {
      // Return a basic useState tracker
      let val = initialValue;
      const setVal = (newVal: any) => { val = newVal; };
      return [val, setVal];
    },
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: (effect: () => any) => {
      effect();
    },
    Fragment: ({ children }: any) => children,
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

describe('Scan and Join Hotfix Tests', () => {
  let mockGame: any;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGame = {
      connected: true,
      roomId: undefined,
      seat: undefined,
      view: null,
      error: null,
      actionPending: false,
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      fillAI: vi.fn(),
      addAI: vi.fn(),
      removeAI: vi.fn(),
      fillSeatsWithAITo: vi.fn(),
      startGame: vi.fn(),
      discardTile: vi.fn(),
      performAction: vi.fn(),
      leaveRoom: vi.fn(),
    };
    vi.mocked(useOnlineMahjongGame).mockReturnValue(mockGame);

    mockLocalStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, val: string) => { mockLocalStorage[key] = val; },
      removeItem: (key: string) => { delete mockLocalStorage[key]; }
    });
  });

  it('1. should show Nickname screen if roomId exists but no saved name', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?roomId=482910',
        protocol: 'http:',
        hostname: 'localhost'
      }
    });

    const el = OnlineLobbyPage();
    // Verify it rendered the start screen (no nickNameSubmitted)
    expect(JSON.stringify(el)).toContain('加入房间 482910');
    expect(JSON.stringify(el)).toContain('请输入昵称后加入房间');
    expect(mockGame.joinRoom).not.toHaveBeenCalled();
  });

  it('2. should automatically join room if roomId exists and name is already saved', () => {
    mockLocalStorage['online_player_name'] = 'Alice';
    vi.stubGlobal('window', {
      location: {
        search: '?roomId=482910',
        protocol: 'http:',
        hostname: 'localhost'
      }
    });

    // Run hook effects manually by calling page
    OnlineLobbyPage();
    
    // Auto join effect should trigger joinRoom immediately
    expect(mockGame.joinRoom).toHaveBeenCalledWith('482910', 'Alice');
  });
});
