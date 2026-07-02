import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ActionSourceTileBanner } from '../components/ActionSourceTileBanner.jsx';
import { ActionCandidatePanel } from '../components/ActionCandidatePanel.jsx';
import { ActionCandidateGroup } from '../utils/action-highlight-utils.js';

// Mock Tile
const mockTile = { suit: 'wan' as any, rank: 6 as any, instanceId: 'w6' };

// Mock Candidates
const mockCandidates: ActionCandidateGroup[] = [
  {
    id: 'chi-0',
    actionType: 'chi',
    label: '吃 5万6万7万',
    sourceSeat: 2,
    sourcePlayerLabel: '玩家2',
    sourceTile: mockTile as any,
    handTiles: [
      { suit: 'wan' as any, rank: 5 as any, instanceId: 'w5' },
      { suit: 'wan' as any, rank: 7 as any, instanceId: 'w7' }
    ],
    tiles: [
      { suit: 'wan' as any, rank: 5 as any, instanceId: 'w5' },
      mockTile as any,
      { suit: 'wan' as any, rank: 7 as any, instanceId: 'w7' }
    ],
    submitPayload: { type: 'chi', optionId: 'wan_5,wan_6,wan_7' }
  },
  {
    id: 'peng-0',
    actionType: 'peng',
    label: '碰 6万',
    sourceSeat: 2,
    sourcePlayerLabel: '玩家2',
    sourceTile: mockTile as any,
    handTiles: [
      { suit: 'wan' as any, rank: 6 as any, instanceId: 'w6a' },
      { suit: 'wan' as any, rank: 6 as any, instanceId: 'w6b' }
    ],
    tiles: [mockTile as any, { suit: 'wan' as any, rank: 6 as any, instanceId: 'w6a' }, { suit: 'wan' as any, rank: 6 as any, instanceId: 'w6b' }],
    submitPayload: { type: 'peng' }
  }
];

describe('Action UI Components tests', () => {
  it('1. ActionSourceTileBanner displays owner identity and source tile', () => {
    const sourceEvent = {
      seat: 2,
      playerLabel: '玩家2',
      tile: mockTile as any,
      tileKey: 'wan_6'
    };
    const el = ActionSourceTileBanner({ sourceEvent }) as any;
    expect(el).not.toBeNull();
    const textSpan = el.props.children[0];
    expect(textSpan.props.children.join('')).toContain('响应来源: 玩家2 打出');
    const tileView = el.props.children[1].props.children;
    expect(tileView.props.tile).toEqual(mockTile);
    expect(tileView.props.highlightType).toBe('source');
  });

  it('2. ActionCandidatePanel displays all option badges', () => {
    const el = ActionCandidatePanel({
      candidates: mockCandidates,
      actionPending: false,
      onSelect: () => {}
    }) as any;

    expect(el).not.toBeNull();
    const groups = el.props.children;
    expect(groups).toHaveLength(2);

    const firstGroupLabel = groups[0].props.children[0];
    expect(firstGroupLabel.props.children).toBe('吃');

    const secondGroupLabel = groups[1].props.children[0];
    expect(secondGroupLabel.props.children).toBe('碰');
  });

  it('3. Clicking candidate option calls onSelect callback with correct payload', () => {
    const selectSpy = vi.fn();
    const el = ActionCandidatePanel({
      candidates: mockCandidates,
      actionPending: false,
      onSelect: selectSpy
    }) as any;

    const groups = el.props.children;
    groups[0].props.onClick();
    expect(selectSpy).toHaveBeenCalledWith({ type: 'chi', optionId: 'wan_5,wan_6,wan_7' });

    groups[1].props.onClick();
    expect(selectSpy).toHaveBeenCalledWith({ type: 'peng' });
  });

  it('4. Hovering candidates triggers onHoverCandidate callback', () => {
    const hoverSpy = vi.fn();
    const el = ActionCandidatePanel({
      candidates: mockCandidates,
      actionPending: false,
      onSelect: () => {},
      onHoverCandidate: hoverSpy
    }) as any;

    const groups = el.props.children;
    
    // Mouse enter first group
    groups[0].props.onMouseEnter();
    expect(hoverSpy).toHaveBeenCalledWith('chi-0');

    // Mouse leave
    groups[0].props.onMouseLeave();
    expect(hoverSpy).toHaveBeenCalledWith(null);
  });
});
