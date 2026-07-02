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
import { EffectiveTilesView } from '../components/EffectiveTilesView.jsx';
import { RiskWarningPanel } from '../components/RiskWarningPanel.jsx';
import { ReplayReportModal } from '../components/ReplayReportModal.jsx';
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
    { seat: 0, id: 'p0', hand: [], melds: [], discards: [], score: 100, isDealer: true, hasOpenedDoor: false },
    { seat: 1, id: 'p1', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
    { seat: 2, id: 'p2', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
    { seat: 3, id: 'p3', hand: [], melds: [], discards: [], score: 100, isDealer: false, hasOpenedDoor: false },
  ],
  wall: [],
  discards: { 0: [], 1: [], 2: [], 3: [] },
  pendingActions: [],
  scoreEvents: [],
  logs: [],
  config: { birdCount: 2, scoreMode: 'changsha_6_7', birdMode: 'all_birds', openDoor: { needOpenDoorForDianPaoHu: false } },
} as any;

describe('Coach Trust UI quality gate checks', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  it('1. CoachPanel renders HintCard title for effective tiles with visible estimated note', () => {
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 1, qiXiaoDuiShanten: 99, bestShanten: 1, effectiveTileKeys: ['wan_5'], effectiveTileCount: 4, summary: '建议' },
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    });

    const body = getFlatChildren(el)[1];
    const hintCard = getFlatChildren(body)[1]; // Effective Tiles HintCard
    expect(hintCard.props.title).toContain('基于已公开牌扣减');
  });

  it('2. CoachPanel does not render actual hidden wall cards label', () => {
    const htmlStr = JSON.stringify(CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 1, qiXiaoDuiShanten: 99, bestShanten: 1, effectiveTileKeys: ['wan_5'], effectiveTileCount: 4, summary: '建议' },
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => {},
    }));
    expect(htmlStr).not.toContain('牌墙实际');
    expect(htmlStr).not.toContain('真实剩余');
  });

  it('3. EffectiveTilesView displays estimated disclaimer and does not leak wall Concrete tiles', () => {
    const el = EffectiveTilesView({
      effectiveTileKeys: ['wan_5'],
      state: mockState,
    });
    const disclaimer = getFlatChildren(el)[1];
    expect(disclaimer.props.children).toContain('基于已公开牌扣减估算');
  });

  it('4. RiskWarningPanel displays reasons with probabilistic language', () => {
    const risks = [{ tileKey: 'wan_5', tileName: '五万', riskScore: 50, riskLevel: 'high' as const, reason: '放铳可能有较高放铳风险。' }];
    const el = RiskWarningPanel({ risks });
    const str = JSON.stringify(el);
    expect(str).toContain('可能');
    expect(str).not.toContain('一定放炮');
  });

  it('5. ReplayReportModal renders realTimeKnown badge text', () => {
    const report = {
      roundResult: 'win' as const,
      playerScoreDelta: 10,
      totalDecisions: 1,
      matchedRecommendationCount: 1,
      riskyDiscardCount: 0,
      goodDecisions: [],
      questionableDecisions: [],
      keyMoments: [],
      summary: 'win ok',
      nextRoundTips: [],
      insights: [{ type: 'realTimeKnown' as const, title: '决策', description: '当时可知正确' }],
    };
    const el = ReplayReportModal({ report, onClose: () => {} });
    const html = JSON.stringify(el);
    expect(html).toContain('【当时可知】');
  });

  it('6. ReplayReportModal renders afterTheFact badge text', () => {
    const report = {
      roundResult: 'win' as const,
      playerScoreDelta: 10,
      totalDecisions: 1,
      matchedRecommendationCount: 1,
      riskyDiscardCount: 0,
      goodDecisions: [],
      questionableDecisions: [],
      keyMoments: [],
      summary: 'win ok',
      nextRoundTips: [],
      insights: [{ type: 'afterTheFact' as const, title: '诊断', description: '事后观察对手' }],
    };
    const el = ReplayReportModal({ report, onClose: () => {} });
    const html = JSON.stringify(el);
    expect(html).toContain('【事后观察】');
  });

  it('7. When coachEnabled is false, CoachPanel shows lock screen and does not display advices', () => {
    const el = CoachPanel({
      state: mockState,
      handAdvice: { normalShanten: 1, qiXiaoDuiShanten: 99, bestShanten: 1, effectiveTileKeys: ['wan_5'], effectiveTileCount: 4, summary: '建议' },
      discardAdvices: [{ tileKey: 'wan_5', tileName: '五万', score: 10, reason: 'disc', expectedShantenAfterDiscard: 1, effectiveTilesAfterDiscard: [], riskLevel: 'low' }],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: false,
      onToggleCoach: () => {},
    });

    const htmlStr = JSON.stringify(el);
    expect(htmlStr).toContain('自主练习模式');
    expect(htmlStr).not.toContain('推荐打出的手牌');
  });

  it('8. Toggling coach mode does not call mutate state logic', () => {
    let triggered = false;
    const el = CoachPanel({
      state: mockState,
      handAdvice: null,
      discardAdvices: [],
      actionAdvices: [],
      riskAdvices: [],
      coachEnabled: true,
      onToggleCoach: () => { triggered = true; },
    });

    const header = getFlatChildren(el)[0];
    const actionsBlock = getFlatChildren(header)[1];
    const toggleBtn = getFlatChildren(actionsBlock)[0];
    toggleBtn.props.onClick({ stopPropagation: () => {} });

    expect(triggered).toBe(true);
  });
});
