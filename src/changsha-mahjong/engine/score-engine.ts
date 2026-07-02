import type { ScoreEvent, GangScoreInput, StartingHuScoreInput, HuScoreInput, FinalScoreInput } from '../types/score.js';
import { applyBirdMultiplier } from './bird-engine.js';

export type { GangScoreInput, StartingHuScoreInput, HuScoreInput, FinalScoreInput };

export function calculateGangScore(input: GangScoreInput): ScoreEvent[] {
  const { gangType, playerSeat, fromSeat, seatToPlayerId, config, activeSeats } = input;
  const events: ScoreEvent[] = [];
  const toPlayerId = seatToPlayerId[playerSeat];
  const finalActiveSeats = activeSeats || [0, 1, 2, 3];

  if (gangType === 'mingGang') {
    if (fromSeat !== undefined) {
      const fromPlayerId = seatToPlayerId[fromSeat];
      events.push({
        fromPlayerId,
        toPlayerId,
        score: config.gang.mingGang,
        reason: 'mingGang',
      });
    }
  } else if (gangType === 'buGang') {
    for (const seat of finalActiveSeats) {
      if (seat !== playerSeat) {
        events.push({
          fromPlayerId: seatToPlayerId[seat],
          toPlayerId,
          score: config.gang.buGang,
          reason: 'buGang',
        });
      }
    }
  } else if (gangType === 'anGang') {
    for (const seat of finalActiveSeats) {
      if (seat !== playerSeat) {
        events.push({
          fromPlayerId: seatToPlayerId[seat],
          toPlayerId,
          score: config.gang.anGang,
          reason: 'anGang',
        });
      }
    }
  }

  return events;
}

export function calculateStartingHuScore(input: StartingHuScoreInput): ScoreEvent[] {
  const { winnerSeat, startingHuTypes, seatToPlayerId, dealerSeat, config, activeSeats } = input;
  if (startingHuTypes.length === 0) {
    return [];
  }

  const events: ScoreEvent[] = [];
  const toPlayerId = seatToPlayerId[winnerSeat];
  const isWinnerDealer = winnerSeat === dealerSeat;

  const baseScorePerHu = config.startingHu.scoreEach;
  const dealerBonusPerHu = isWinnerDealer ? config.startingHu.dealerBonusEach : 0;
  const totalScorePerPayer = (baseScorePerHu + dealerBonusPerHu) * startingHuTypes.length;
  const finalActiveSeats = activeSeats || [0, 1, 2, 3];

  for (const seat of finalActiveSeats) {
    if (seat !== winnerSeat) {
      events.push({
        fromPlayerId: seatToPlayerId[seat],
        toPlayerId,
        score: totalScorePerPayer,
        reason: startingHuTypes.join('+'),
      });
    }
  }

  return events;
}

export function calculateHuBaseScore(input: HuScoreInput): ScoreEvent[] {
  const { winnerSeat, winMethod, loserSeat, isSmallHu, bigHuTypes, seatToPlayerId, config, activeSeats } = input;
  const events: ScoreEvent[] = [];
  const toPlayerId = seatToPlayerId[winnerSeat];
  const finalActiveSeats = activeSeats || [0, 1, 2, 3];

  const hasBigHu = bigHuTypes.length > 0;

  if (hasBigHu) {
    const stackingCount = config.bigHu.allowStacking ? bigHuTypes.length : 1;
    if (winMethod === 'dianPao') {
      if (loserSeat !== undefined) {
        events.push({
          fromPlayerId: seatToPlayerId[loserSeat],
          toPlayerId,
          score: config.bigHu.dianPao * stackingCount,
          reason: bigHuTypes.join('+'),
        });
      }
    } else {
      // ziMo
      for (const seat of finalActiveSeats) {
        if (seat !== winnerSeat) {
          events.push({
            fromPlayerId: seatToPlayerId[seat],
            toPlayerId,
            score: config.bigHu.ziMoEach * stackingCount,
            reason: bigHuTypes.join('+'),
          });
        }
      }
    }
  } else if (isSmallHu) {
    if (winMethod === 'dianPao') {
      if (loserSeat !== undefined) {
        events.push({
          fromPlayerId: seatToPlayerId[loserSeat],
          toPlayerId,
          score: config.smallHu.dianPao,
          reason: 'smallHu',
        });
      }
    } else {
      // ziMo
      for (const seat of finalActiveSeats) {
        if (seat !== winnerSeat) {
          events.push({
            fromPlayerId: seatToPlayerId[seat],
            toPlayerId,
            score: config.smallHu.ziMoEach,
            reason: 'smallHu',
          });
        }
      }
    }
  }

  return events;
}

export function calculateFinalScoreWithBird(input: FinalScoreInput): ScoreEvent[] {
  const { baseScores, birdTiles, dealerSeat, winnerSeat, winMethod, loserSeat, seatToPlayerId, config, activeSeats } = input;
  
  if (!config.bird.enabled || birdTiles.length === 0) {
    return baseScores.map(se => ({ ...se }));
  }

  const birdResult = applyBirdMultiplier({
    baseScores,
    birdTiles,
    dealerSeat,
    winnerSeat,
    winMethod,
    loserSeat,
    seatToPlayerId,
    activeSeats,
  } as any);

  return birdResult.finalScores;
}
