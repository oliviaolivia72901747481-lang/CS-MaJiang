import { Tile } from '../types/tile.js';
import { ScoreEvent } from '../types/score.js';

export interface BirdInput {
  baseScores: ScoreEvent[];
  birdTiles: Tile[];
  dealerSeat: 0 | 1 | 2 | 3;
  winnerSeat: 0 | 1 | 2 | 3;
  winMethod: 'ziMo' | 'dianPao';
  loserSeat?: 0 | 1 | 2 | 3;
  seatToPlayerId: Record<0 | 1 | 2 | 3, string>;
  activeSeats?: number[];
}

export interface BirdResult {
  finalScores: ScoreEvent[];
  birdsHit: { tile: Tile; targetSeat: number; hit: boolean }[];
}

export function getBirdTarget(birdTile: Tile, dealerSeat: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  const rank = birdTile.rank;
  const diff = (rank - 1) % 4;
  return ((dealerSeat + diff) % 4) as 0 | 1 | 2 | 3;
}

export function applyBirdMultiplier(input: BirdInput): BirdResult {
  const { baseScores, birdTiles, dealerSeat, winnerSeat, winMethod, loserSeat, seatToPlayerId, activeSeats } = input;

  const birdsHit: { tile: Tile; targetSeat: number; hit: boolean }[] = [];
  const finalScores = baseScores.map(se => ({ ...se }));

  if (birdTiles.length === 0) {
    return { finalScores, birdsHit };
  }

  if (winMethod === 'dianPao') {
    const actualLoserSeat = loserSeat !== undefined ? loserSeat : 
      (Object.keys(seatToPlayerId).find(k => seatToPlayerId[Number(k) as 0 | 1 | 2 | 3] === baseScores[0]?.fromPlayerId) as unknown as 0 | 1 | 2 | 3);
    
    let multiplier = 1;
    for (const tile of birdTiles) {
      const target = getBirdTarget(tile, dealerSeat);
      const isHit = target === actualLoserSeat;
      if (isHit) {
        multiplier *= 2;
      }
      birdsHit.push({ tile, targetSeat: target, hit: isHit });
    }

    for (const scoreEvent of finalScores) {
      scoreEvent.score *= multiplier;
    }
  } else {
    // ZiMo
    const multipliers: Record<number, number> = {};
    const finalActiveSeats = activeSeats || [0, 1, 2, 3];
    for (const seat of finalActiveSeats) {
      if (seat !== winnerSeat) {
        multipliers[seat] = 1;
      }
    }

    for (const tile of birdTiles) {
      const target = getBirdTarget(tile, dealerSeat);
      let hit = false;
      if (target === winnerSeat) {
        // Hit winner: all payers double
        for (const seat in multipliers) {
          multipliers[seat] *= 2;
        }
        hit = true;
      } else {
        // Hit a specific payer
        if (multipliers[target] !== undefined) {
          multipliers[target] *= 2;
          hit = true;
        }
      }
      birdsHit.push({ tile, targetSeat: target, hit });
    }

    for (const scoreEvent of finalScores) {
      // Find payer seat from playerId
      const payerSeatStr = Object.keys(seatToPlayerId).find(k => seatToPlayerId[Number(k) as 0 | 1 | 2 | 3] === scoreEvent.fromPlayerId);
      if (payerSeatStr !== undefined) {
        const payerSeat = Number(payerSeatStr);
        const m = multipliers[payerSeat] || 1;
        scoreEvent.score *= m;
      }
    }
  }

  return {
    finalScores,
    birdsHit,
  };
}
