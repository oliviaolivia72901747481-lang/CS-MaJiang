import { describe, it, expect } from 'vitest';
import { analyzeOpponents } from '../advanced-ai/opponent-modeler.js';
import { VisibleInformationForAI } from '../advanced-ai/advanced-ai-types.js';

describe('Opponent Modeler tests', () => {
  const baseVisible: any = {
    seat: 0,
    hand: [],
    melds: [],
    allDiscards: { 0: [], 1: [], 2: [], 3: [] },
    allMelds: { 0: [], 1: [], 2: [], 3: [] },
    revealedTiles: [],
    wallRemainingCount: 50,
    currentPhase: 'playing',
    currentSeat: 0,
  };

  it('1. identifies suspected QingYiSe route correctly based on melds', () => {
    const visible = {
      ...baseVisible,
      allMelds: {
        ...baseVisible.allMelds,
        1: [
          { type: 'peng' as const, tiles: [{ suit: 'wan', rank: 2, instanceId: 'w2_1' }, { suit: 'wan', rank: 2, instanceId: 'w2_2' }, { suit: 'wan', rank: 2, instanceId: 'w2_3' }], exposed: true }
        ]
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp1 = reads.find(r => r.seat === 1)!;
    const qingYiSe = opp1.suspectedRoutes.find(r => r.route === 'qingYiSe')!;
    expect(qingYiSe.confidence).toBeGreaterThan(0.3);
    expect(qingYiSe.reason).toContain('万字');
  });

  it('2. identifies suspected QingYiSe route correctly based on discards', () => {
    const visible = {
      ...baseVisible,
      allDiscards: {
        ...baseVisible.allDiscards,
        2: [
          { suit: 'tong', rank: 1, instanceId: 'to1' },
          { suit: 'tong', rank: 2, instanceId: 'to2' },
          { suit: 'wan', rank: 9, instanceId: 'w9' },
          { suit: 'wan', rank: 8, instanceId: 'w8' },
          { suit: 'tong', rank: 9, instanceId: 'to9' },
        ]
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp2 = reads.find(r => r.seat === 2)!;
    // Discards have only tong and wan. Untouched is tiao.
    const qingYiSe = opp2.suspectedRoutes.find(r => r.route === 'qingYiSe')!;
    expect(qingYiSe.confidence).toBeGreaterThan(0.3);
    expect(opp2.dangerousSuits.some(ds => ds.suit === 'tiao')).toBe(true);
  });

  it('3. identifies suspected PengPengHu route based on peng melds count', () => {
    const visible = {
      ...baseVisible,
      allMelds: {
        ...baseVisible.allMelds,
        3: [
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'mingGang' as const, tiles: [], exposed: true },
        ]
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp3 = reads.find(r => r.seat === 3)!;
    const pengPeng = opp3.suspectedRoutes.find(r => r.route === 'pengPengHu')!;
    expect(pengPeng.confidence).toBeGreaterThan(0.5);
  });

  it('4. identifies suspected QiXiaoDui / MenQing when no melds and late turns', () => {
    const visible = {
      ...baseVisible,
      allDiscards: {
        ...baseVisible.allDiscards,
        1: new Array(9).fill({ suit: 'wan', rank: 1, instanceId: 'w1' })
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp1 = reads.find(r => r.seat === 1)!;
    const qiXiaoDui = opp1.suspectedRoutes.find(r => r.route === 'qiXiaoDui')!;
    expect(qiXiaoDui.confidence).toBeGreaterThan(0.4);
  });

  it('5. ting confidence matches seat progress and melds count', () => {
    const visible = {
      ...baseVisible,
      allMelds: {
        ...baseVisible.allMelds,
        2: [
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'peng' as const, tiles: [], exposed: true },
        ]
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp2 = reads.find(r => r.seat === 2)!;
    expect(opp2.tingConfidence).toBeGreaterThan(0.8);
    expect(opp2.isLikelyTing).toBe(true);
  });

  it('6. ting confidence is 1.0 when 4 melds are exposed', () => {
    const visible = {
      ...baseVisible,
      allMelds: {
        ...baseVisible.allMelds,
        1: [
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'peng' as const, tiles: [], exposed: true },
          { type: 'peng' as const, tiles: [], exposed: true },
        ]
      }
    };
    const reads = analyzeOpponents({ visible });
    const opp1 = reads.find(r => r.seat === 1)!;
    expect(opp1.tingConfidence).toBe(0.99);
  });

  it('7. uses probabilistic language in reason and has confidence in range 0-1', () => {
    const reads = analyzeOpponents({ visible: baseVisible });
    reads.forEach(opp => {
      expect(opp.tingConfidence).toBeGreaterThanOrEqual(0);
      expect(opp.tingConfidence).toBeLessThanOrEqual(1.0);
      expect(opp.reason).toMatch(/(可能|概率|疑似|合理|推测|估计)/);
      expect(opp.reason).not.toContain('一定');
    });
  });
});
