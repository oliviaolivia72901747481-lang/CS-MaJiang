import { describe, it, expect } from 'vitest';
import { canHu, isStandardHuStructure, has258Jiang, getBigHuTypes } from '../engine/hu-checker.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { DEFAULT_RULE_CONFIG } from '../config/default-rule-config.js';

function makeTiles(str: string): Tile[] {
  const parts = str.trim().split(/\s+/);
  return parts.map((part, index) => {
    const rank = parseInt(part[0], 10);
    const suitChar = part[1];
    let suit: 'wan' | 'tong' | 'tiao' = 'wan';
    if (suitChar === 't') suit = 'tong';
    if (suitChar === 's') suit = 'tiao';
    return {
      suit,
      rank: rank as any,
      instanceId: `t_${suit}_${rank}_${index}`,
    };
  });
}

describe('hu-checker', () => {
  it('1. should verify standard 4 groups + 1 pair structure can Hu', () => {
    // 4 groups of runs/triplets + 1 pair = 14 tiles
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    expect(isStandardHuStructure(hand)).toBe(true);
  });

  it('2. should verify small Hu with 258 jiang can Hu', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s'); // jiang is 5s (258)
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('smallHu');
  });

  it('3. should verify small Hu without 258 jiang cannot Hu under default config', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 3s 3s'); // jiang is 3s (not 258)
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(false);
  });

  it('4. should identify PengPengHu', () => {
    const hand = makeTiles('1w 1w 1w 2t 2t 2t 3s 3s 3s 4w 4w 4w 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('pengPengHu');
  });

  it('5. should identify JiangJiangHu', () => {
    // All tiles are 2, 5, 8
    const hand = makeTiles('2w 2w 2w 5t 5t 5t 8s 8s 8s 2s 2s 2s 5w 5w');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('jiangJiangHu');
  });

  it('6. should identify QingYiSe', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7w 8w 9w 2w 3w 4w 5w 5w');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('qingYiSe');
  });

  it('7. should identify QiXiaoDui', () => {
    const hand = makeTiles('1w 1w 2w 2w 3t 3t 4t 4t 5s 5s 8s 8s 9s 9s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('qiXiaoDui');
    expect(result.bigHuTypes).not.toContain('haoHuaQiXiaoDui');
  });

  it('8. should identify HaoHuaQiXiaoDui', () => {
    const hand = makeTiles('1w 1w 1w 1w 3t 3t 4t 4t 5s 5s 8s 8s 9s 9s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('haoHuaQiXiaoDui');
    expect(result.bigHuTypes).not.toContain('qiXiaoDui');
  });

  it('9. should identify GangShangKaiHua', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      context: { isGangShangKaiHua: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('gangShangKaiHua');
  });

  it('10. should identify QiangGangHu', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'dianPao',
      context: { isQiangGangHu: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('qiangGangHu');
  });

  it('11. should identify HaiDiLaoYue', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      context: { isHaiDiLaoYue: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('haiDiLaoYue');
  });

  it('12. should identify HaiDiPao', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'dianPao',
      context: { isHaiDiPao: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('haiDiPao');
  });

  it('13. should identify QuanQiuRen', () => {
    const hand = makeTiles('2s 2s'); // 1 card in hand + 1 winning card
    const melds: Meld[] = [
      { type: 'chi', tiles: makeTiles('1w 2w 3w'), exposed: true },
      { type: 'peng', tiles: makeTiles('5t 5t 5t'), exposed: true },
      { type: 'mingGang', tiles: makeTiles('8s 8s 8s 8s'), exposed: true },
      { type: 'peng', tiles: makeTiles('9w 9w 9w'), exposed: true },
    ];
    const result = canHu({
      hand,
      melds,
      winMethod: 'dianPao',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('quanQiuRen');
  });

  it('14. should identify TianHu', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      context: { isTianHu: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('tianHu');
  });

  it('15. should identify DiHu', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'dianPao',
      context: { isDiHu: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('diHu');
  });

  it('16. should identify QingYiSe + PengPengHu simultaneously', () => {
    const hand = makeTiles('1w 1w 1w 2w 2w 2w 3w 3w 3w 4w 4w 4w 5w 5w');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('qingYiSe');
    expect(result.bigHuTypes).toContain('pengPengHu');
  });

  it('17. should not allow DianPao small Hu if not opened door', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'dianPao',
      context: { hasOpenedDoor: false },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(false);
  });

  it('18. should allow ZiMo small Hu if not opened door', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      context: { hasOpenedDoor: false },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('smallHu');
  });

  it('19. should allow HaiDi Hu if not opened door', () => {
    const hand = makeTiles('1w 2w 3w 4w 5w 6w 7t 8t 9t 2s 3s 4s 5s 5s');
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      context: { hasOpenedDoor: false, isHaiDiLaoYue: true },
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes).toContain('haiDiLaoYue');
  });

  it('20. should prioritize big Hu over small Hu when both are satisfied', () => {
    const hand = makeTiles('1w 1w 1w 2w 2w 2w 3w 3w 3w 4w 4w 4w 5w 5w'); // jiang is 5w (258), so small Hu is valid. But it is also QingYiSe + PengPengHu.
    const result = canHu({
      hand,
      melds: [],
      winMethod: 'ziMo',
      config: DEFAULT_RULE_CONFIG,
    });
    expect(result.canHu).toBe(true);
    expect(result.huCategory).toBe('bigHu');
    expect(result.bigHuTypes.length).toBeGreaterThan(0);
  });
});
