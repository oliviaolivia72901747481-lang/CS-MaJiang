import { Tile } from '../types/tile.js';

export function evaluateTileRisk(input: {
  tile: Tile;
  visibleTiles: Tile[];
  discardsBySeat: Record<0 | 1 | 2 | 3, Tile[]>;
  selfSeat: 0 | 1 | 2 | 3;
  currentTurnCount: number;
}): number {
  const { tile, visibleTiles, discardsBySeat, selfSeat, currentTurnCount } = input;

  // 1. Count visible copies of this tile
  const visibleCount = visibleTiles.filter(
    t => t.suit === tile.suit && t.rank === tile.rank
  ).length;

  if (visibleCount >= 4) {
    return 0; // 100% safe (all 4 copies are visible)
  }

  // 2. Base risk by rank
  let baseRisk = 10;
  if (tile.rank === 4 || tile.rank === 5 || tile.rank === 6) {
    baseRisk = 15;
  } else if (tile.rank === 3 || tile.rank === 7) {
    baseRisk = 12;
  } else if (tile.rank === 2 || tile.rank === 8) {
    baseRisk = 8;
  } else if (tile.rank === 1 || tile.rank === 9) {
    baseRisk = 5;
  }

  // 3. Multiplier based on visible count (unseen factor)
  let unseenMultiplier = 1.0;
  if (visibleCount === 0) {
    unseenMultiplier = 3.5;
  } else if (visibleCount === 1) {
    unseenMultiplier = 2.5;
  } else if (visibleCount === 2) {
    unseenMultiplier = 1.5;
  } else if (visibleCount === 3) {
    unseenMultiplier = 0.5;
  }

  // 4. Progress factor (late game is more dangerous)
  // Max turn count is usually around 40-50 per player, let's treat turn count as total turns in the state
  const progressFactor = Math.max(0.5, Math.min(2.5, 0.5 + currentTurnCount / 40));

  // 5. Evaluate risk against each opponent
  let totalRisk = 0;
  let opponentCount = 0;

  for (let seat = 0; seat < 4; seat++) {
    if (seat === selfSeat) continue;
    opponentCount++;

    const opponentDiscards = discardsBySeat[seat as 0 | 1 | 2 | 3] || [];
    const isSafeAgainstOpponent = opponentDiscards.some(
      t => t.suit === tile.suit && t.rank === tile.rank
    );

    if (isSafeAgainstOpponent) {
      // Safe against this player due to Gen (already discarded it)
      continue;
    }

    let opponentRisk = baseRisk * unseenMultiplier * progressFactor;

    // Check if opponent is doing single-suit hand (QingYiSe)
    // If they have discarded only other suits, or have only discarded 0/1 card of this suit after turn 10
    const suitDiscards = opponentDiscards.filter(t => t.suit === tile.suit).length;
    if (opponentDiscards.length >= 10 && suitDiscards <= 1) {
      opponentRisk *= 2.0; // Higher risk because they might be holding a lot of this suit
    }

    totalRisk += opponentRisk;
  }

  // Average risk across opponents
  const finalRisk = opponentCount > 0 ? totalRisk / opponentCount : 0;

  return Math.max(0, Math.min(100, Math.round(finalRisk)));
}
