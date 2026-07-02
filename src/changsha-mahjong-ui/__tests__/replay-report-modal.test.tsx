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

import { ReplayReportModal } from '../components/ReplayReportModal.jsx';
import { ReplayReport } from '../../changsha-mahjong/coach/coach-types.js';

function getFlatChildren(element: any): any[] {
  if (!element || !element.props || !element.props.children) return [];
  const children = element.props.children;
  if (Array.isArray(children)) {
    return children.flat(Infinity).filter(Boolean);
  }
  return [children].filter(Boolean);
}

const mockReport: ReplayReport = {
  roundResult: 'win',
  playerScoreDelta: 12,
  totalDecisions: 3,
  matchedRecommendationCount: 2,
  riskyDiscardCount: 1,
  goodDecisions: [
    { step: 1, phase: 'playing', seat: 0, actualAction: 'discard', actualTileKey: 'wan_5', recommendedTileKey: 'wan_5', matchedRecommendation: true, reason: '优秀' }
  ],
  questionableDecisions: [
    { step: 2, phase: 'playing', seat: 0, actualAction: 'discard', actualTileKey: 'tiao_9', recommendedTileKey: 'wan_5', matchedRecommendation: false, reason: '有争议' }
  ],
  keyMoments: ['打得很棒'],
  summary: '优秀复盘',
  nextRoundTips: ['注意防守'],
};

describe('ReplayReportModal UI Component tests', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  it('1. should show metrics correctly in modal', () => {
    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => {},
    });

    const body = getFlatChildren(el)[0].props.children[1];
    const metricsRow = getFlatChildren(body)[0];
    const cards = getFlatChildren(metricsRow);
    
    expect(cards[0].props.className).toContain('res-win');
    expect(getFlatChildren(cards[1])[1].props.children.join('')).toBe('66.7%');
  });

  it('2. should trigger close callback on close button click', () => {
    let closed = false;
    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => { closed = true; },
    });

    const footer = getFlatChildren(el)[0].props.children[2];
    const closeBtn = getFlatChildren(footer)[1];
    closeBtn.props.onClick();
    expect(closed).toBe(true);
  });

  it('3. should render coach overall summary text', () => {
    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => {},
    });

    const body = getFlatChildren(el)[0].props.children[1];
    const evalBox = getFlatChildren(body)[1];
    const pText = getFlatChildren(evalBox)[1];
    expect(pText.props.children).toBe('优秀复盘');
  });

  it('4. should render key moments list', () => {
    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => {},
    });

    const body = getFlatChildren(el)[0].props.children[1];
    const keyMomentsSection = getFlatChildren(body)[2];
    const list = getFlatChildren(keyMomentsSection)[1];
    expect(getFlatChildren(list).length).toBe(1);
  });

  it('5. should copy report text on copy button click', async () => {
    const originalClipboard = global.navigator.clipboard;
    let copiedText = '';
    const mockClipboard = {
      writeText: async (t: string) => { copiedText = t; }
    };
    Object.defineProperty(global.navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    });

    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => {},
    });

    const footer = getFlatChildren(el)[0].props.children[2];
    const copyBtn = getFlatChildren(footer)[0];
    await copyBtn.props.onClick();

    expect(copiedText).toContain('🎓 长沙麻将 AI 教练局后复盘报告');

    // restore clipboard
    Object.defineProperty(global.navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true
    });
  });

  it('6. should render questionable decisions list', () => {
    const el = ReplayReportModal({
      report: mockReport,
      onClose: () => {},
    });

    const body = getFlatChildren(el)[0].props.children[1];
    const questionableSection = getFlatChildren(body)[3];
    expect(questionableSection.props.className).not.toContain('compare-matched');
  });
});
