import { describe, it, expect } from 'vitest';
import { calculateGangScore, calculateStartingHuScore, calculateHuBaseScore, calculateFinalScoreWithBird } from '../engine/score-engine.js';
import { DEFAULT_RULE_CONFIG, RULE_CONFIG_6_6 } from '../config/default-rule-config.js';
import { ScoreEvent } from '../types/score.js';
import { Tile } from '../types/tile.js';

describe('score-engine', () => {
  const seatToPlayerId = {
    0: 'p0',
    1: 'p1',
    2: 'p2',
    3: 'p3',
  };

  it('1. should verify small Hu DianPao score is 1', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      isSmallHu: true,
      bigHuTypes: [],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(1);
    expect(events[0].fromPlayerId).toBe('p1');
    expect(events[0].toPlayerId).toBe('p0');
    expect(events[0].score).toBe(1);
  });

  it('2. should verify small Hu ZiMo score is 2 for each payer', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: true,
      bigHuTypes: [],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.score).toBe(2);
      expect(e.toPlayerId).toBe('p0');
    }
  });

  it('3. should verify big Hu DianPao score is 6', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      isSmallHu: false,
      bigHuTypes: ['qiXiaoDui'],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(1);
    expect(events[0].score).toBe(6);
  });

  it('4. should verify big Hu ZiMo score is 7 each under 6/7 scoreMode', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: false,
      bigHuTypes: ['qiXiaoDui'],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.score).toBe(7);
    }
  });

  it('5. should verify big Hu ZiMo score is 6 each under 6/6 scoreMode', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: false,
      bigHuTypes: ['qiXiaoDui'],
      seatToPlayerId,
      config: RULE_CONFIG_6_6,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.score).toBe(6);
    }
  });

  it('6. should verify QingYiSe + PengPengHu DianPao score is 12 (6+6)', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      isSmallHu: false,
      bigHuTypes: ['qingYiSe', 'pengPengHu'],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(1);
    expect(events[0].score).toBe(12);
  });

  it('7. should verify QingYiSe + PengPengHu ZiMo score is 14 each in 6/7 scoreMode (7+7)', () => {
    const events = calculateHuBaseScore({
      winnerSeat: 0,
      winMethod: 'ziMo',
      isSmallHu: false,
      bigHuTypes: ['qingYiSe', 'pengPengHu'],
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.score).toBe(14);
    }
  });

  it('8. should verify MingGang (straight gang) score is 2 from discarder', () => {
    const events = calculateGangScore({
      gangType: 'mingGang',
      playerSeat: 0,
      fromSeat: 1,
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(1);
    expect(events[0].fromPlayerId).toBe('p1');
    expect(events[0].toPlayerId).toBe('p0');
    expect(events[0].score).toBe(2);
  });

  it('9. should verify BuGang (supplementary gang) score is 1 from each other player', () => {
    const events = calculateGangScore({
      gangType: 'buGang',
      playerSeat: 0,
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.toPlayerId).toBe('p0');
      expect(e.score).toBe(1);
    }
  });

  it('10. should verify AnGang (dark gang) score is 3 from each other player', () => {
    const events = calculateGangScore({
      gangType: 'anGang',
      playerSeat: 0,
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.toPlayerId).toBe('p0');
      expect(e.score).toBe(3);
    }
  });

  it('11. should verify single starting Hu score is 2 from each other player', () => {
    const events = calculateStartingHuScore({
      winnerSeat: 1,
      startingHuTypes: ['queYiSe'],
      seatToPlayerId,
      dealerSeat: 0,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.toPlayerId).toBe('p1');
      expect(e.score).toBe(2);
    }
  });

  it('12. should verify dealer single starting Hu score is 3 from each other player', () => {
    const events = calculateStartingHuScore({
      winnerSeat: 0,
      startingHuTypes: ['queYiSe'],
      seatToPlayerId,
      dealerSeat: 0,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.toPlayerId).toBe('p0');
      expect(e.score).toBe(3);
    }
  });

  it('13. should verify two starting Hus score is 4 from each other player', () => {
    const events = calculateStartingHuScore({
      winnerSeat: 1,
      startingHuTypes: ['queYiSe', 'banBanHu'],
      seatToPlayerId,
      dealerSeat: 0,
      config: DEFAULT_RULE_CONFIG,
    });
    expect(events.length).toBe(3);
    for (const e of events) {
      expect(e.toPlayerId).toBe('p1');
      expect(e.score).toBe(4);
    }
  });

  it('14. should verify correct doubling after Zha Niao', () => {
    const baseScores: ScoreEvent[] = [
      { fromPlayerId: 'p1', toPlayerId: 'p0', score: 6, reason: 'bigHu' },
    ];
    const birdTile: Tile = { suit: 'wan', rank: 2, instanceId: '' };
    
    const events = calculateFinalScoreWithBird({
      baseScores,
      birdTiles: [birdTile],
      dealerSeat: 0,
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      seatToPlayerId,
      config: DEFAULT_RULE_CONFIG,
    });
    
    expect(events[0].score).toBe(12);
  });
});
