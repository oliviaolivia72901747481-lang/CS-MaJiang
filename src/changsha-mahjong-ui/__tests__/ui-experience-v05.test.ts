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

import { TileView } from '../components/TileView.jsx';
import { ActionPanel } from '../components/ActionPanel.jsx';
import { SettlementModal } from '../components/SettlementModal.jsx';
import { RuleConfigPanel } from '../components/RuleConfigPanel.jsx';
import { GameLogPanel } from '../components/GameLogPanel.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';
import { PendingAction, GameLogEntry } from '../../changsha-mahjong/types/game.js';

// Helper to flatten children arrays in React elements for simplified test assertions
function getFlatChildren(element: any): any[] {
  if (!element || !element.props || !element.props.children) return [];
  const children = element.props.children;
  if (Array.isArray(children)) {
    return children.flat(Infinity).filter(Boolean);
  }
  return [children].filter(Boolean);
}

describe('v0.5 Visual Experience and Interaction Quality Gate', () => {
  beforeEach(() => {
    (React as any).clearMocks();
  });

  describe('1. TileView Visual States', () => {
    const tile: Tile = { suit: 'wan', rank: 5, instanceId: 'w5' };

    it('1. should show correct rank and suit text for front', () => {
      const el = TileView({ tile, hidden: false });
      expect(el.props.className).toContain('tile-front');
      const children = getFlatChildren(el);
      expect(children[0].props.children).toBe(5);
      expect(children[1].props.children).toBe('万');
    });

    it('2. should show tile-back class and back face symbol when hidden', () => {
      const el = TileView({ tile, hidden: true });
      expect(el.props.className).toContain('tile-back');
      const children = getFlatChildren(el);
      expect(children[0].props.children).toBe('🀫');
    });

    it('3. should contain selected class when selected is true', () => {
      const el = TileView({ tile, selected: true });
      expect(el.props.className).toContain('selected');
    });

    it('4. should contain disabled class when disabled is true', () => {
      const el = TileView({ tile, disabled: true });
      expect(el.props.className).toContain('disabled');
      expect(el.props.onClick).toBeUndefined();
    });

    it('5. should apply correct suit-wan class', () => {
      const el = TileView({ tile: { suit: 'wan', rank: 1, instanceId: 'w1' } });
      expect(el.props.className).toContain('suit-wan');
    });

    it('6. should apply correct suit-tong class', () => {
      const el = TileView({ tile: { suit: 'tong', rank: 2, instanceId: 'to2' } });
      expect(el.props.className).toContain('suit-tong');
    });

    it('7. should apply correct suit-tiao class', () => {
      const el = TileView({ tile: { suit: 'tiao', rank: 3, instanceId: 'ti3' } });
      expect(el.props.className).toContain('suit-tiao');
    });

    it('8. should contain is-latest-discard class when latest discard is true', () => {
      const el = TileView({ tile, isLatestDiscard: true });
      expect(el.props.className).toContain('is-latest-discard');
    });

    it('9. should render latest discard dot overlay when latest discard is true', () => {
      const el = TileView({ tile, isLatestDiscard: true });
      const children = getFlatChildren(el);
      expect(children[2].props.className).toBe('latest-discard-indicator');
    });
  });

  describe('2. ActionPanel Interactive Grouping', () => {
    const actionTile: Tile = { suit: 'tong', rank: 2, instanceId: 't2' };
    
    it('10. should group actions into Hu, Melds, and Pass groups', () => {
      const actions: PendingAction[] = [
        { seat: 0, type: 'hu', priority: 3, tile: actionTile },
        { seat: 0, type: 'peng', priority: 2, tile: actionTile },
        { seat: 0, type: 'pass', priority: 0 },
      ];
      const panel = ActionPanel({ actions, onActionClick: () => {} });
      const container = getFlatChildren(panel)[1];
      const groups = getFlatChildren(container);
      expect(groups[0].props.className).toContain('action-group-hu');
      expect(groups[1].props.className).toContain('action-group-melds');
      expect(groups[2].props.className).toContain('action-group-pass');
    });

    it('11. should prioritize ZiMo or Hu inside Hu group', () => {
      const actions: PendingAction[] = [
        { seat: 0, type: 'ziMo', priority: 3, tile: actionTile },
      ];
      const panel = ActionPanel({ actions, onActionClick: () => {} });
      const container = getFlatChildren(panel)[1];
      const huGroup = getFlatChildren(container)[0];
      const huBtn = getFlatChildren(huGroup)[0];
      const textSpan = getFlatChildren(huBtn)[1];
      expect(textSpan.props.children).toBe('自摸胡');
    });

    it('12. should support clicking actions and trigger handler', () => {
      let clicked = false;
      const actions: PendingAction[] = [{ seat: 0, type: 'hu', priority: 3, tile: actionTile }];
      const panel = ActionPanel({ actions, onActionClick: () => { clicked = true; } });
      const container = getFlatChildren(panel)[1];
      const huGroup = getFlatChildren(container)[0];
      getFlatChildren(huGroup)[0].props.onClick();
      expect(clicked).toBe(true);
    });

    it('13. should prevent duplicate clicks on actions', () => {
      let clicks = 0;
      const actions: PendingAction[] = [{ seat: 0, type: 'hu', priority: 3, tile: actionTile }];
      
      // Render first time
      let panel = ActionPanel({ actions, onActionClick: () => { clicks++; } });
      let container = getFlatChildren(panel)[1];
      let huGroup = getFlatChildren(container)[0];
      let btn = getFlatChildren(huGroup)[0];
      
      btn.props.onClick();
      
      // Simulate re-render: reset stateIndex, re-evaluate ActionPanel
      (React as any).resetStateIndex();
      panel = ActionPanel({ actions, onActionClick: () => { clicks++; } });
      container = getFlatChildren(panel)[1];
      huGroup = getFlatChildren(container)[0];
      btn = getFlatChildren(huGroup)[0];

      expect(btn.props.disabled).toBe(true);
      btn.props.onClick(); // should do nothing since disabled is true
      expect(clicks).toBe(1);
    });

    it('14. should render multiple Chi combos as option buttons', () => {
      const actions: PendingAction[] = [
        {
          seat: 0,
          type: 'chi',
          priority: 1,
          tile: actionTile,
          options: [
            [{ suit: 'tong', rank: 3, instanceId: 't3' }, { suit: 'tong', rank: 4, instanceId: 't4' }],
            [{ suit: 'tong', rank: 1, instanceId: 't1' }, { suit: 'tong', rank: 3, instanceId: 't3' }]
          ],
        }
      ];
      const panel = ActionPanel({ actions, onActionClick: () => {} });
      const container = getFlatChildren(panel)[1];
      const meldsGroup = getFlatChildren(container)[0];
      expect(getFlatChildren(meldsGroup).length).toBe(2);
    });

    it('15. should render pass button last in pass group', () => {
      const actions: PendingAction[] = [
        { seat: 0, type: 'pass', priority: 0 }
      ];
      const panel = ActionPanel({ actions, onActionClick: () => {} });
      const container = getFlatChildren(panel)[1];
      const passGroup = getFlatChildren(container)[0];
      expect(passGroup.props.className).toContain('action-group-pass');
      expect(getFlatChildren(passGroup)[0].props.children).toBe('过');
    });
  });

  describe('3. SettlementModal Layout and Lookups', () => {
    const mockState: any = {
      phase: 'settlement',
      roundEnded: true,
      winnerSeats: [0],
      dealerSeat: 0,
      lastDiscard: { tile: { suit: 'wan', rank: 3, instanceId: 'w3' }, fromSeat: 1 },
      birdTiles: [{ suit: 'tiao', rank: 1, instanceId: 'bird1' }],
      scoreEvents: [
        { fromPlayerId: 'player_1', toPlayerId: 'player_0', score: 10, reason: '胡牌 [清一色]' }
      ],
      players: [
        { seat: 0, id: 'player_0', name: '我', score: 10, melds: [], hand: [] },
        { seat: 1, id: 'player_1', name: '机器人 1', score: -10, melds: [], hand: [] },
        { seat: 2, id: 'player_2', name: '机器人 2', score: 0, melds: [], hand: [] },
        { seat: 3, id: 'player_3', name: '机器人 3', score: 0, melds: [], hand: [] },
      ]
    };

    it('16. should display winner summary card when win occurs', () => {
      const el = SettlementModal({ state: mockState, onRestart: () => {}, onClose: () => {} });
      const body = getFlatChildren(el)[0].props.children[1];
      const card = getFlatChildren(body)[0];
      expect(card.props.className).toContain('winner-card');
      expect(getFlatChildren(card)[0].props.children.join('')).toContain('我');
    });

    it('17. should display draw card when winnerSeats is empty', () => {
      const drawState = { ...mockState, winnerSeats: [] };
      const el = SettlementModal({ state: drawState, onRestart: () => {}, onClose: () => {} });
      const body = getFlatChildren(el)[0].props.children[1];
      const card = getFlatChildren(body)[0];
      expect(card.props.className).toContain('draw-card');
    });

    it('18. should map player ID to friendly seat name in score events', () => {
      const el = SettlementModal({ state: mockState, onRestart: () => {}, onClose: () => {} });
      const body = getFlatChildren(el)[0].props.children[1];
      const eventsSection = getFlatChildren(body)[1];
      const listDiv = getFlatChildren(eventsSection)[1];
      const eventItem = getFlatChildren(listDiv)[0];
      const playersSpan = getFlatChildren(eventItem)[1];
      expect(getFlatChildren(playersSpan).join('')).toContain('机器人 1 ➔ 玩家本人 (我)');
    });

    it('19. should flag hit target for birds successfully', () => {
      const el = SettlementModal({ state: mockState, onRestart: () => {}, onClose: () => {} });
      const body = getFlatChildren(el)[0].props.children[1];
      const birdSection = getFlatChildren(body)[2];
      const birdDisplay = getFlatChildren(birdSection)[1];
      const birdCard = getFlatChildren(birdDisplay)[0];
      expect(birdCard.props.className).toContain('bird-hit');
    });

    it('20. should trigger onRestart callback on restart button click', () => {
      let restart = false;
      const el = SettlementModal({ state: mockState, onRestart: () => { restart = true; }, onClose: () => {} });
      const footer = getFlatChildren(el)[0].props.children[2];
      getFlatChildren(footer)[0].props.onClick();
      expect(restart).toBe(true);
    });

    it('21. should trigger onClose callback on close button click', () => {
      let close = false;
      const el = SettlementModal({ state: mockState, onRestart: () => {}, onClose: () => { close = true; } });
      const footer = getFlatChildren(el)[0].props.children[2];
      getFlatChildren(footer)[1].props.onClick();
      expect(close).toBe(true);
    });
  });

  describe('4. RuleConfigPanel Actions & Locking', () => {
    it('22. should toggle expand and collapse of config body', () => {
      let panel = RuleConfigPanel({ locked: false });
      const header = getFlatChildren(panel)[0];
      expect(panel.props.className).toContain('collapsed');
      
      header.props.onClick();
      (React as any).resetStateIndex();
      panel = RuleConfigPanel({ locked: false });
      expect(getFlatChildren(panel)[1]).toBeDefined();
    });

    it('23. should display locked badge in header when locked is true', () => {
      const panel = RuleConfigPanel({ locked: true });
      const header = getFlatChildren(panel)[0];
      expect(JSON.stringify(header)).toContain('🔒 已锁定');
    });

    it('24. should disable selects and checkboxes when locked is true', () => {
      const statesMap = (React as any).getMockStatesMap();
      statesMap.set('state_0', false); // force collapsed state to false
      (React as any).clearMocks();
      statesMap.set('state_0', false);
      
      const panel = RuleConfigPanel({ locked: true });
      const body = getFlatChildren(panel)[1];
      const form = getFlatChildren(body).find(c => c.props && c.props.className === 'config-form');
      
      const scoreModeSelect = getFlatChildren(form)[0].props.children[1];
      expect(scoreModeSelect.props.disabled).toBe(true);
      
      const openDoorGroup = getFlatChildren(form)[1].props.children[1];
      const openDoorInput = getFlatChildren(openDoorGroup)[0];
      expect(openDoorInput.props.disabled).toBe(true);
    });

    it('25. should trigger config callback when saved', () => {
      const statesMap = (React as any).getMockStatesMap();
      statesMap.set('state_0', false); // expanded
      (React as any).clearMocks();
      statesMap.set('state_0', false);
      
      let config: any = null;
      const panel = RuleConfigPanel({ onConfigChange: (c) => { config = c; }, locked: false });
      const body = getFlatChildren(panel)[1];
      const form = getFlatChildren(body).find(c => c.props && c.props.className === 'config-form');
      const formChildren = getFlatChildren(form);
      const actions = formChildren[formChildren.length - 1];
      const saveBtn = getFlatChildren(actions)[0];
      
      saveBtn.props.onClick();
      expect(config).not.toBeNull();
      expect(config.scoreMode).toBe('changsha_6_7');
    });
  });

  describe('5. GameLogPanel Tag and AI Reason Render', () => {
    it('26. should categorize discard logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '打出牌', detail: 'wan_5' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-discard');
    });

    it('27. should categorize draw logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '摸牌', detail: 'tong_3' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-draw');
    });

    it('28. should categorize peng logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '碰牌', detail: 'tiao_2' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-peng');
    });

    it('29. should categorize chi logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '吃牌', detail: 'tiao_2' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-chi');
    });

    it('30. should categorize gang logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '杠牌', detail: 'wan_1' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-gang');
    });

    it('31. should categorize hu logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '胡牌', detail: 'wan_3' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-hu');
    });

    it('32. should categorize system logs', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'ended', action: '对局流局', detail: '' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      expect(line.props.className).toContain('type-system');
    });

    it('33. should extract AI reason from detail correctly', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '打出牌', detail: 'wan_5：大胡型倾向门清' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      const aiReasonDiv = getFlatChildren(line)[1];
      expect(aiReasonDiv.props.className).toContain('log-ai-reason');
      expect(getFlatChildren(aiReasonDiv).join('')).toContain('大胡型倾向门清');
    });

    it('34. should display friendly tile name in main detail instead of raw key', () => {
      const logs: GameLogEntry[] = [{ step: 1, phase: 'playing', action: '打出牌', detail: 'wan_5：大胡型倾向门清' }];
      const panel = GameLogPanel({ logs });
      const body = getFlatChildren(panel)[1];
      const line = getFlatChildren(body)[0];
      const lineMain = getFlatChildren(line)[0];
      const mainDetail = getFlatChildren(lineMain)[4];
      expect(getFlatChildren(mainDetail).join('')).toBe('(5万)');
    });

    it('35. should support collapsed logs display', () => {
      const statesMap = (React as any).getMockStatesMap();
      statesMap.set('state_0', true); // collapsed is true
      (React as any).clearMocks();
      statesMap.set('state_0', true);
      
      const panel = GameLogPanel({ logs: [] });
      expect(getFlatChildren(panel)[1]).toBeFalsy();
    });
  });
});
