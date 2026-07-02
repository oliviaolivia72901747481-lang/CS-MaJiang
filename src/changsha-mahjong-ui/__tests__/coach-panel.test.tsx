import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

vi.mock('react', () => {
  const mockStatesMap = new Map<string, any>();
  const mockSettersMap = new Map<string, (val: any) => void>();
  const mockRefsMap = new Map<string, { current: any }>();
  const mockEffectsList: any[] = [];
  let mockStateIndex = 0;
  let mockRefIndex = 0;

  const mockReactInstance = {
    useState: (initialValue: any) => {
      const key = `state_${mockStateIndex++}`;
      if (!mockStatesMap.has(key)) {
        mockStatesMap.set(key, initialValue);
      }
      const setter = (newValue: any) => {
        const currentVal = mockStatesMap.get(key);
        const resolved = typeof newValue === 'function' ? newValue(currentVal) : newValue;
        mockStatesMap.set(key, resolved);
      };
      mockSettersMap.set(key, setter);
      return [mockStatesMap.get(key), setter];
    },
    useRef: (initialValue: any) => {
      const key = `ref_${mockRefIndex++}`;
      if (!mockRefsMap.has(key)) {
        mockRefsMap.set(key, { current: initialValue });
      }
      return mockRefsMap.get(key);
    },
    useEffect: (effect: () => any, deps: any[]) => {
      mockEffectsList.push({ effect, deps });
    },
    Fragment: ({ children }: any) => children,
    clearMocks: () => {
      mockStatesMap.clear();
      mockSettersMap.clear();
      mockRefsMap.clear();
      mockEffectsList.length = 0;
      mockStateIndex = 0;
      mockRefIndex = 0;
    },
    resetStateIndex: () => {
      mockStateIndex = 0;
    },
    resetRefIndex: () => {
      mockRefIndex = 0;
    },
    getMockStatesMap: () => mockStatesMap,
    getMockSettersMap: () => mockSettersMap,
  };

  return {
    ...mockReactInstance,
    default: mockReactInstance,
  };
});

import { CoachPanel } from '../components/CoachPanel.jsx';
import { GameState } from '../../changsha-mahjong/types/game.js';

function getFlatChildren(element: any): any[] {
  if (!element || !element.props || !element.props.children) return [];
  const children = element.props.children;
  if (Array.isArray(children)) {
    return children.flat(Infinity).filter(Boolean);
  }
  return [children].filter(Boolean);
}

const mockState: GameState = {
  phase: 'playing',
  dealerSeat: 0,
  currentSeat: 0,
  players: [
    { seat: 0, id: 'p0', name: '我', score: 0, hand: [], melds: [] },
    { seat: 1, id: 'p1', name: 'AI 1', score: 0, hand: [], melds: [] },
    { seat: 2, id: 'p2', name: 'AI 2', score: 0, hand: [], melds: [] },
    { seat: 3, id: 'p3', name: 'AI 3', score: 0, hand: [], melds: [] },
  ],
  wall: [],
  discards: { 0: [], 1: [], 2: [], 3: [] },
  pendingActions: [],
  scoreEvents: [],
  logs: [],
  config: { birdCount: 2, scoreMode: 'changsha_6_7', birdMode: 'all_birds', openDoor: { needOpenDoorForDianPaoHu: false } },
} as any;

describe('CoachPanel UI Component tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  it('1. should show active title and collapsible arrow', () => {
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 2, qiXiaoDuiShanten: 3, bestShanten: 2, effectiveTileKeys: ['wan_5'], effectiveTileCount: 4, summary: '快胡建议' },
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    });
    
    expect(el.props.className).not.toContain('coach-collapsed');
    const header = getFlatChildren(el)[0];
    const titleBlock = getFlatChildren(header)[0];
    const textLabel = getFlatChildren(titleBlock)[1];
    expect(textLabel.props.children).toBe('AI 陪练助手');
  });

  it('2. should show practice placeholder when coachEnabled is false', () => {
    const el = CoachPanel({
      state: mockState,
      handAdvice: null,
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: false,
      onToggleCoach: () => {},
    });
    
    expect(el.props.className).toContain('coach-disabled-view');
    const placeholder = getFlatChildren(el)[1];
    expect(JSON.stringify(placeholder)).toContain('自主练习模式');
  });

  it('3. should toggle collapse state on header click', () => {
    const el = CoachPanel({
      state: mockState,
      handAdvice: null,
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    });
    const header = getFlatChildren(el)[0];
    header.props.onClick();

    const statesMap = (React as any).getMockStatesMap();
    expect(statesMap.get('state_0')).toBe(true); // collapsed updated to true
  });

  it('4. should render action advices when present', () => {
    const actionAdvices = [
      { action: 'hu' as const, recommend: true, score: 1000, reason: '能胡必胡' }
    ];
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 0, qiXiaoDuiShanten: 99, bestShanten: 0, effectiveTileKeys: [], effectiveTileCount: 0, summary: '听牌' },
      discardAdvices: [],
      actionAdvices,
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    });

    const body = getFlatChildren(el)[1];
    const actionCard = getFlatChildren(body)[1];
    expect(actionCard.props.title).toBe('吃碰杠过战术建议');
  });

  it('5. should render discard suggestions when present', () => {
    const discardAdvices = [
      { tileKey: 'wan_5', tileName: '五万', score: 100, reason: '打这张', expectedShantenAfterDiscard: 1, effectiveTilesAfterDiscard: [], riskLevel: 'low' as const }
    ];
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 1, qiXiaoDuiShanten: 99, bestShanten: 1, effectiveTileKeys: [], effectiveTileCount: 0, summary: '建议' },
      discardAdvices,
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    });

    const body = getFlatChildren(el)[1];
    const discardCard = getFlatChildren(body)[1];
    expect(discardCard.props.title).toBe('推荐打出的手牌 (玩家视角估计)');
  });

  it('6. should render risk advices when present', () => {
    const riskAdvices = [
      { tileKey: 'wan_5', tileName: '五万', riskScore: 50, riskLevel: 'high' as const, reason: '危险生张' }
    ];
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 1, qiXiaoDuiShanten: 99, bestShanten: 1, effectiveTileKeys: [], effectiveTileCount: 0, summary: '建议' },
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices,
      coachEnabled: true,
      onToggleCoach: () => {},
    });

    const body = getFlatChildren(el)[1];
    const riskCard = getFlatChildren(body)[1];
    expect(riskCard.props.title).toBe('手牌防守危险度 (根据当前牌河推测)');
  });
});
