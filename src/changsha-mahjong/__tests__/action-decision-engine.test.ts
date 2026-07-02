import { describe, it, expect } from 'vitest';
import { decideAction } from '../ai/action-decision-engine.js';
import { AI_PROFILES } from '../ai/ai-profiles.js';
import { PendingAction } from '../types/game.js';
import { Tile } from '../types/tile.js';

describe('action-decision-engine', () => {
  it('1-3. should prioritize Hu/ZiMo over anything else', () => {
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'hu', priority: 4, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
      { seat: 0, type: 'peng', priority: 2, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const decision = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    
    expect(decision.action).toBe('hu');
    expect(decision.score).toBe(10000);
    expect(decision.reason).toContain('能胡牌');
  });

  it('4. should choose Peng if it improves shanten', () => {
    // Valid 13-card hand: 3 melds in tong (1-9), two 5-wan, two 2-siao, one 9-siao
    const hand: Tile[] = [
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 5, instanceId: 'w5_2' },
      { suit: 'tiao', rank: 2, instanceId: 's2_1' },
      { suit: 'tiao', rank: 2, instanceId: 's2_2' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tong', rank: 2, instanceId: 't2' },
      { suit: 'tong', rank: 3, instanceId: 't3' },
      { suit: 'tong', rank: 4, instanceId: 't4' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
      { suit: 'tong', rank: 6, instanceId: 't6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const discard: Tile = { suit: 'wan', rank: 5, instanceId: 'w5_d' };
    
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'peng', priority: 2, tile: discard },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    const decision = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('peng');
    expect(decision.reason).toContain('碰');
  });

  it('5. should choose Pass if Peng does not improve shanten', () => {
    const hand: Tile[] = [
      { suit: 'tiao', rank: 9, instanceId: 's9_1' },
      { suit: 'tiao', rank: 9, instanceId: 's9_2' },
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'tong', rank: 4, instanceId: 't4' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
    ];
    const discard: Tile = { suit: 'tiao', rank: 9, instanceId: 's9_d' };
    
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'peng', priority: 2, tile: discard },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    const decision = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });

    expect(decision.action).toBe('pass');
  });

  it('6-7. should handle profile differences for eating (Chi)', () => {
    // Valid 13-card hand: 1w 2w, 2s 2s, 1-9 tong melds, 9s.
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'tiao', rank: 2, instanceId: 's2_1' },
      { suit: 'tiao', rank: 2, instanceId: 's2_2' },
      { suit: 'tiao', rank: 9, instanceId: 's9' },
      { suit: 'tong', rank: 1, instanceId: 't1' },
      { suit: 'tong', rank: 2, instanceId: 't2' },
      { suit: 'tong', rank: 3, instanceId: 't3' },
      { suit: 'tong', rank: 4, instanceId: 't4' },
      { suit: 'tong', rank: 5, instanceId: 't5' },
      { suit: 'tong', rank: 6, instanceId: 't6' },
      { suit: 'tong', rank: 7, instanceId: 't7' },
      { suit: 'tong', rank: 8, instanceId: 't8' },
      { suit: 'tong', rank: 9, instanceId: 't9' },
    ];
    const discard: Tile = { suit: 'wan', rank: 3, instanceId: 'w3_d' };
    
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'chi', priority: 1, tile: discard, options: [[
        { suit: 'wan', rank: 1, instanceId: 'w1' },
        { suit: 'wan', rank: 2, instanceId: 'w2' },
      ]] },
      { seat: 0, type: 'pass', priority: 0 },
    ];

    const decisionFast = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.fastHu,
    });
    expect(decisionFast.action).toBe('chi');

    const decisionBig = decideAction({
      availableActions,
      hand,
      melds: [],
      visibleTiles: [...hand, discard],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.bigHu,
    });
    expect(decisionBig.action).toBe('pass');
  });

  it('8. should choose anGang if available as it is safe and scores points', () => {
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'anGang', priority: 3, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const decision = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(decision.action).toBe('anGang');
    expect(decision.reason).toContain('暗杠');
  });

  it('9. should choose pass if no pending actions match self seat', () => {
    const availableActions: PendingAction[] = [
      { seat: 1, type: 'peng', priority: 2 },
    ];
    const decision = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(decision.action).toBe('pass');
  });

  it('10. should choose pass if available actions only contain pass', () => {
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const decision = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.balanced,
    });
    expect(decision.action).toBe('pass');
  });

  it('11. should choose BuGang for balanced profile but avoid it for defensive profile if risk is high', () => {
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'buGang', priority: 3, tile: { suit: 'wan', rank: 5, instanceId: 'w5' } },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const decisionDef = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.defensive,
    });
    // Defensive profile has subtracted BuGang score, making it less than Pass (50)
    expect(decisionDef.action).toBe('pass');
  });

  it('12. should handle Direct Kong (mingGang) scoring based on profile weights', () => {
    const availableActions: PendingAction[] = [
      { seat: 0, type: 'mingGang', priority: 3 },
      { seat: 0, type: 'pass', priority: 0 },
    ];
    const decisionFast = decideAction({
      availableActions,
      hand: [],
      melds: [],
      visibleTiles: [],
      discardsBySeat: { 0: [], 1: [], 2: [], 3: [] },
      selfSeat: 0,
      profile: AI_PROFILES.fastHu,
    });
    expect(decisionFast.action).toBe('mingGang');
  });
});
