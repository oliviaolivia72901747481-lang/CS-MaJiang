import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { OnlineLobbyPage } from '../components/OnlineLobbyPage.jsx';
import { useOnlineMahjongGame } from '../client/useOnlineMahjongGame.js';

vi.mock('../client/useOnlineMahjongGame.js', () => ({
  useOnlineMahjongGame: vi.fn(),
  clearOnlineSession: vi.fn(),
}));

// Simple react mock structure
vi.mock('react', () => {
  const mockReactInstance = {
    useState: (initialValue: any) => [initialValue, () => {}],
    useRef: (initialValue: any) => ({ current: initialValue }),
    useEffect: () => {},
    Fragment: ({ children }: any) => children,
  };
  return { ...mockReactInstance, default: mockReactInstance };
});

function findButtons(element: any): any[] {
  const results: any[] = [];
  function traverse(el: any) {
    if (!el) return;
    if (el.type === 'button') results.push(el);
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

describe('Lobby AI Control Hotfix Tests', () => {
  let mockGame: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGame = {
      connected: true,
      roomId: '123456',
      seat: 0,
      view: {
        roomId: '123456',
        seat: 0,
        phase: 'waiting',
        self: { playerName: 'Player0', seat: 0, isAI: false },
        opponents: [
          { playerName: '', seat: 1, isAI: false, connected: false },
          { playerName: '', seat: 2, isAI: false, connected: false },
          { playerName: '', seat: 3, isAI: false, connected: false }
        ]
      },
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
    
    // Stub localStorage to bypass start screen
    const store: Record<string, string> = {
      'online_player_name': 'Player0',
      'online_room_id': '123456'
    };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; }
    });
  });

  it('1. should render add AI buttons next to empty seats', () => {
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    const addAIButtons = buttons.filter(btn => btn.props.children === '添加机器人');
    expect(addAIButtons).toHaveLength(3);
  });

  it('2. should render remove AI button next to AI seats but not human seats', () => {
    mockGame.view.opponents[0] = { playerName: 'AI_1', seat: 1, isAI: true, connected: true };
    mockGame.view.opponents[1] = { playerName: 'Player2', seat: 2, isAI: false, connected: true };
    
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    const removeButtons = buttons.filter(btn => btn.props.children === '移除机器人');
    expect(removeButtons).toHaveLength(1);
  });

  it('3. should trigger addAI when add AI button is clicked', () => {
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    const addAIButton = buttons.find(btn => btn.props.children === '添加机器人');
    addAIButton.props.onClick();
    expect(mockGame.addAI).toHaveBeenCalledWith(1);
  });

  it('4. should trigger removeAI when remove AI button is clicked', () => {
    mockGame.view.opponents[0] = { playerName: 'AI_1', seat: 1, isAI: true, connected: true };
    
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    const removeButton = buttons.find(btn => btn.props.children === '移除机器人');
    removeButton.props.onClick();
    expect(mockGame.removeAI).toHaveBeenCalledWith(1);
  });

  it('5. should render fill-to-3 and fill-to-4 buttons', () => {
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    
    const addOne = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('添加 1 个机器人'));
    const fill3 = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('补到 3 人'));
    const fill4 = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('补到 4 人'));
    
    expect(addOne).toBeDefined();
    expect(fill3).toBeDefined();
    expect(fill4).toBeDefined();
  });

  it('6. should call fillSeatsWithAITo(3) and fillSeatsWithAITo(4) on click', () => {
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    
    const fill3 = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('补到 3 人'));
    fill3.props.onClick();
    expect(mockGame.fillSeatsWithAITo).toHaveBeenCalledWith(3);

    const fill4 = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('补到 4 人'));
    fill4.props.onClick();
    expect(mockGame.fillSeatsWithAITo).toHaveBeenCalledWith(4);
  });

  it('7. should disable start game button when total count is less than 2', () => {
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    
    const startBtn = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('开始'));
    expect(startBtn.props.disabled).toBe(true);
  });

  it('8. should call startGame with current total count when game starts', () => {
    mockGame.view.opponents[0] = { playerName: 'AI_1', seat: 1, isAI: true, connected: true }; // 2 players total
    
    const el = OnlineLobbyPage();
    const buttons = findButtons(el);
    
    const startBtn = buttons.find(btn => btn.props.children && btn.props.children.toString().includes('开始 2 人局'));
    expect(startBtn).toBeDefined();
    expect(startBtn.props.disabled).toBe(false);
    
    startBtn.props.onClick();
    expect(mockGame.startGame).toHaveBeenCalledWith({ requestedPlayerCount: 2 });
  });
});
