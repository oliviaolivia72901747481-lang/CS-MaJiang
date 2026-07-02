import { describe, it, expect } from 'vitest';
import { evaluateRoutes } from '../advanced-ai/route-planner.js';
import { Tile } from '../types/tile.js';
import { AIProfile } from '../ai/ai-types.js';

describe('Route Planner tests', () => {
  const baseProfile: AIProfile = {
    type: 'balanced',
    name: '均衡型',
    weights: {
      shanten: 1.0,
      effectiveTiles: 1.0,
      pairValue: 1.0,
      sequenceValue: 1.0,
      qingYiSePotential: 1.0,
      pengPengHuPotential: 1.0,
      qiXiaoDuiPotential: 1.0,
      riskAvoidance: 1.0,
      gangAggression: 1.0,
      chiPengAggression: 1.0,
    },
  };

  it('1. evaluates smallHu route correctly', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
    ];
    const evals = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: baseProfile });
    const smallHu = evals.find(e => e.route === 'smallHu')!;
    expect(smallHu.shanten).toBeLessThanOrEqual(6);
    expect(smallHu.score).toBeGreaterThan(50);
  });

  it('2. evaluates qingYiSe route correctly when hand is dominated by one suit', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];
    const evals = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: baseProfile });
    const qingYiSe = evals.find(e => e.route === 'qingYiSe')!;
    expect(qingYiSe.score).toBeGreaterThan(0);
    expect(qingYiSe.reason).toContain('万字');
  });

  it('3. shuts down qingYiSe route when there are mismatching meld suits', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const melds: any[] = [
      { type: 'peng' as const, tiles: [{ suit: 'tong', rank: 1, instanceId: 't1' }], exposed: true }
    ];
    const evals = evaluateRoutes({ hand, melds, visibleTiles: [], profile: baseProfile });
    const qingYiSe = evals.find(e => e.route === 'qingYiSe')!;
    expect(qingYiSe.shanten).toBe(99);
    expect(qingYiSe.score).toBe(0);
  });

  it('4. evaluates pengPengHu route score based on triplets and pairs count', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1_2' },
      { suit: 'wan', rank: 1, instanceId: 'w1_3' },
      { suit: 'tong', rank: 2, instanceId: 'to2_1' },
      { suit: 'tong', rank: 2, instanceId: 'to2_2' },
      { suit: 'tong', rank: 2, instanceId: 'to2_3' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_1' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_2' },
      { suit: 'tiao', rank: 3, instanceId: 'ti3_3' },
      { suit: 'wan', rank: 4, instanceId: 'w4_1' },
      { suit: 'wan', rank: 4, instanceId: 'w4_2' },
    ];
    const evals = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: baseProfile });
    const pengPeng = evals.find(e => e.route === 'pengPengHu')!;
    expect(pengPeng.shanten).toBeLessThanOrEqual(5);
    expect(pengPeng.score).toBeGreaterThan(30);
  });

  it('5. shuts down qiXiaoDui route if there is any exposed meld', () => {
    const hand: Tile[] = [{ suit: 'wan', rank: 1, instanceId: 'w1' }];
    const melds: any[] = [
      { type: 'peng' as const, tiles: [{ suit: 'wan', rank: 1, instanceId: 'w1' }], exposed: true }
    ];
    const evals = evaluateRoutes({ hand, melds, visibleTiles: [], profile: baseProfile });
    const qiXiaoDui = evals.find(e => e.route === 'qiXiaoDui')!;
    expect(qiXiaoDui.shanten).toBe(99);
    expect(qiXiaoDui.score).toBe(0);
  });

  it('6. evaluates jiangJiangHu route correctly based on non-258 tiles count', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 2, instanceId: 'w2_1' },
      { suit: 'wan', rank: 2, instanceId: 'w2_2' },
      { suit: 'tong', rank: 5, instanceId: 'to5_1' },
      { suit: 'tong', rank: 5, instanceId: 'to5_2' },
      { suit: 'tiao', rank: 8, instanceId: 'ti8_1' },
      { suit: 'tiao', rank: 8, instanceId: 'ti8_2' },
      { suit: 'wan', rank: 5, instanceId: 'w5_1' },
      { suit: 'wan', rank: 8, instanceId: 'w8_1' },
      { suit: 'tiao', rank: 2, instanceId: 'ti2_1' },
      { suit: 'wan', rank: 1, instanceId: 'w1' },
    ];
    const evals = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: baseProfile });
    const jiangJiang = evals.find(e => e.route === 'jiangJiangHu')!;
    expect(jiangJiang.shanten).toBe(1);
    expect(jiangJiang.score).toBeGreaterThan(0);
  });

  it('7. applies bigHu profile bias to qingYiSe/pengPengHu route scores', () => {
    const hand: Tile[] = [
      { suit: 'wan', rank: 1, instanceId: 'w1' },
      { suit: 'wan', rank: 2, instanceId: 'w2' },
      { suit: 'wan', rank: 3, instanceId: 'w3' },
      { suit: 'wan', rank: 4, instanceId: 'w4' },
      { suit: 'wan', rank: 5, instanceId: 'w5' },
      { suit: 'wan', rank: 6, instanceId: 'w6' },
      { suit: 'wan', rank: 7, instanceId: 'w7' },
      { suit: 'wan', rank: 8, instanceId: 'w8' },
      { suit: 'wan', rank: 9, instanceId: 'w9' },
    ];
    const bigHuProfile = { ...baseProfile, type: 'bigHu' as const };
    const evalsNormal = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: baseProfile });
    const evalsBig = evaluateRoutes({ hand, melds: [], visibleTiles: [], profile: bigHuProfile });

    const qingNormal = evalsNormal.find(e => e.route === 'qingYiSe')!.score;
    const qingBig = evalsBig.find(e => e.route === 'qingYiSe')!.score;
    expect(qingBig).toBeGreaterThan(qingNormal);
  });
});
