import { describe, it, expect } from 'vitest';
import { getBirdTarget, applyBirdMultiplier, BirdInput } from '../engine/bird-engine.js';
import { Tile } from '../types/tile.js';
import { ScoreEvent } from '../types/score.js';

describe('bird-engine', () => {
  it('1-4. should verify getBirdTarget mapping for ranks', () => {
    const dealerSeat = 0; // Dealer is seat 0
    // 1, 5, 9 -> Dealer (seat 0)
    expect(getBirdTarget({ suit: 'wan', rank: 1, instanceId: '' }, dealerSeat)).toBe(0);
    expect(getBirdTarget({ suit: 'tong', rank: 5, instanceId: '' }, dealerSeat)).toBe(0);
    expect(getBirdTarget({ suit: 'tiao', rank: 9, instanceId: '' }, dealerSeat)).toBe(0);

    // 2, 6 -> Lower house (seat 1)
    expect(getBirdTarget({ suit: 'wan', rank: 2, instanceId: '' }, dealerSeat)).toBe(1);
    expect(getBirdTarget({ suit: 'tong', rank: 6, instanceId: '' }, dealerSeat)).toBe(1);

    // 3, 7 -> Opposite house (seat 2)
    expect(getBirdTarget({ suit: 'wan', rank: 3, instanceId: '' }, dealerSeat)).toBe(2);
    expect(getBirdTarget({ suit: 'tong', rank: 7, instanceId: '' }, dealerSeat)).toBe(2);

    // 4, 8 -> Upper house (seat 3)
    expect(getBirdTarget({ suit: 'wan', rank: 4, instanceId: '' }, dealerSeat)).toBe(3);
    expect(getBirdTarget({ suit: 'tong', rank: 8, instanceId: '' }, dealerSeat)).toBe(3);
  });

  const seatToPlayerId = {
    0: 'p0',
    1: 'p1',
    2: 'p2',
    3: 'p3',
  };

  it('5. should double loser score if bird targets loser in DianPao', () => {
    const baseScores: ScoreEvent[] = [
      { fromPlayerId: 'p1', toPlayerId: 'p0', score: 6, reason: 'bigHu' }
    ];
    const birdTile: Tile = { suit: 'wan', rank: 2, instanceId: '' };
    
    const input: BirdInput = {
      baseScores,
      birdTiles: [birdTile],
      dealerSeat: 0,
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      seatToPlayerId,
    };

    const result = applyBirdMultiplier(input);
    expect(result.finalScores[0].score).toBe(12);
    expect(result.birdsHit[0].hit).toBe(true);
  });

  it('6. should not double score if bird targets winner in DianPao', () => {
    const baseScores: ScoreEvent[] = [
      { fromPlayerId: 'p1', toPlayerId: 'p0', score: 6, reason: 'bigHu' }
    ];
    const birdTile: Tile = { suit: 'wan', rank: 1, instanceId: '' };
    
    const input: BirdInput = {
      baseScores,
      birdTiles: [birdTile],
      dealerSeat: 0,
      winnerSeat: 0,
      winMethod: 'dianPao',
      loserSeat: 1,
      seatToPlayerId,
    };

    const result = applyBirdMultiplier(input);
    expect(result.finalScores[0].score).toBe(6);
    expect(result.birdsHit[0].hit).toBe(false);
  });

  it('7. should double all payer scores if bird targets winner in ZiMo', () => {
    const baseScores: ScoreEvent[] = [
      { fromPlayerId: 'p1', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
      { fromPlayerId: 'p2', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
      { fromPlayerId: 'p3', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
    ];
    const birdTile: Tile = { suit: 'wan', rank: 5, instanceId: '' };
    
    const input: BirdInput = {
      baseScores,
      birdTiles: [birdTile],
      dealerSeat: 0,
      winnerSeat: 0,
      winMethod: 'ziMo',
      seatToPlayerId,
    };

    const result = applyBirdMultiplier(input);
    expect(result.finalScores[0].score).toBe(14);
    expect(result.finalScores[1].score).toBe(14);
    expect(result.finalScores[2].score).toBe(14);
    expect(result.birdsHit[0].hit).toBe(true);
  });

  it('8. should double only the specific payer score if bird targets a specific payer in ZiMo', () => {
    const baseScores: ScoreEvent[] = [
      { fromPlayerId: 'p1', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
      { fromPlayerId: 'p2', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
      { fromPlayerId: 'p3', toPlayerId: 'p0', score: 7, reason: 'bigHu' },
    ];
    const birdTile: Tile = { suit: 'wan', rank: 3, instanceId: '' };
    
    const input: BirdInput = {
      baseScores,
      birdTiles: [birdTile],
      dealerSeat: 0,
      winnerSeat: 0,
      winMethod: 'ziMo',
      seatToPlayerId,
    };

    const result = applyBirdMultiplier(input);
    const p1Event = result.finalScores.find(se => se.fromPlayerId === 'p1')!;
    const p2Event = result.finalScores.find(se => se.fromPlayerId === 'p2')!;
    const p3Event = result.finalScores.find(se => se.fromPlayerId === 'p3')!;
    
    expect(p1Event.score).toBe(7);
    expect(p2Event.score).toBe(14);
    expect(p3Event.score).toBe(7);
    expect(result.birdsHit[0].hit).toBe(true);
  });
});
