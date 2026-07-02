import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MobileOnlineGameLayout } from '../components/MobileOnlineGameLayout.jsx';
import { ActionCandidatePanel } from '../components/ActionCandidatePanel.jsx';

// Mock react
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

describe('Mobile Action Bar Tests', () => {
  const mockViewWithActions: any = {
    roomId: '123456',
    seat: 0,
    phase: 'waitingForResponses',
    currentSeat: 1,
    dealerSeat: 0,
    self: {
      seat: 0,
      hand: [
        { suit: 'wan', rank: 1, instanceId: '1' },
        { suit: 'wan', rank: 1, instanceId: '2' }
      ],
      melds: [],
      discards: [],
      score: 1000,
      playerName: 'Alice'
    },
    opponents: [
      { seat: 1, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 1' },
      { seat: 2, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 2' },
      { seat: 3, handCount: 13, melds: [], discards: [], score: 1000, connected: true, isAI: true, playerName: 'Bot 3' }
    ],
    pendingActions: [
      { seat: 0, type: 'hu', priority: 3, tile: { suit: 'wan', rank: 1, instanceId: 'w1_source' } },
      { seat: 0, type: 'peng', priority: 2, tile: { suit: 'wan', rank: 1, instanceId: 'w1_source' } },
      { seat: 0, type: 'pass', priority: 1 }
    ],
    logs: []
  };

  const getActionElements = (el: any) => {
    const children = React.Children.toArray(el.props.children);
    // Find the wrapper containing ActionCandidatePanel
    const actionWrapper = children.find((c: any) => {
      if (!c || !c.props || !c.props.children) return false;
      const subChildren = React.Children.toArray(c.props.children);
      return subChildren.some((sc: any) => sc && sc.props && React.Children.toArray(sc.props.children).some((ri: any) => ri && ri.type === ActionCandidatePanel));
    }) as any;

    if (!actionWrapper) return { candidatePanel: null, passBtn: null };

    const subChildren = React.Children.toArray(actionWrapper.props.children);
    const innerRow = subChildren.find((sc: any) => sc && sc.props && sc.props.style && sc.props.style.display === 'flex') as any;
    if (!innerRow) return { candidatePanel: null, passBtn: null };

    const rowItems = React.Children.toArray(innerRow.props.children);
    const candidatePanel = rowItems.find((ri: any) => ri && ri.type === ActionCandidatePanel) as any;
    const passBtn = rowItems.find((ri: any) => ri && ri.props && ri.props.className && ri.props.className.includes('action-pass')) as any;

    return { candidatePanel, passBtn };
  };

  it('1. renders ActionCandidatePanel and Pass action button in layout', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    
    const { candidatePanel, passBtn } = getActionElements(el);
    expect(candidatePanel).not.toBeNull();
    expect(passBtn).not.toBeNull();
    
    // Check candidates: hu and peng
    expect(candidatePanel.props.candidates.some((c: any) => c.actionType === 'hu')).toBe(true);
    expect(candidatePanel.props.candidates.some((c: any) => c.actionType === 'peng')).toBe(true);
  });

  it('2. Pass button is rendered in the action row', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    const { passBtn } = getActionElements(el);
    expect(passBtn).not.toBeNull();
    expect(passBtn.props.children).toBe('过');
  });

  it('3. buttons and candidates are disabled when actionPending is true', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: true
    }) as any;
    const { candidatePanel, passBtn } = getActionElements(el);
    expect(candidatePanel.props.actionPending).toBe(true);
    expect(passBtn.props.disabled).toBe(true);
  });

  it('4. Pass button has mobile-action-btn class indicating touch dimensions', () => {
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: () => {},
      actionPending: false
    }) as any;
    const { passBtn } = getActionElements(el);
    expect(passBtn.props.className).toContain('mobile-action-btn');
  });

  it('5. clicking pass button calls performAction handler with pass payload', () => {
    const actionSpy = vi.fn();
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: actionSpy,
      actionPending: false
    }) as any;
    const { passBtn } = getActionElements(el);
    passBtn.props.onClick();
    expect(actionSpy).toHaveBeenCalledWith({ type: 'pass' });
  });

  it('6. selecting candidate from candidate panel calls performAction handler with payload', () => {
    const actionSpy = vi.fn();
    const el = MobileOnlineGameLayout({
      view: mockViewWithActions,
      roomId: '123456',
      seat: 0,
      connected: true,
      discardTile: () => {},
      performAction: actionSpy,
      actionPending: false
    }) as any;
    const { candidatePanel } = getActionElements(el);
    
    // Simulate candidate selection
    candidatePanel.props.onSelect({ type: 'peng' });
    expect(actionSpy).toHaveBeenCalledWith({ type: 'peng' });
  });
});
