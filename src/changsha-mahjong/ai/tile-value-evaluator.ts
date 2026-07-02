import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { AIProfile, TileEvaluation } from './ai-types.js';
import { evaluateHand } from './hand-evaluator.js';
import { evaluateTileRisk } from './risk-evaluator.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function evaluateDiscardCandidates(input: {
  hand: Tile[];
  melds: Meld[];
  visibleTiles: Tile[];
  discardsBySeat: Record<0 | 1 | 2 | 3, Tile[]>;
  selfSeat: 0 | 1 | 2 | 3;
  profile: AIProfile;
}): TileEvaluation[] {
  const { hand, melds, visibleTiles, discardsBySeat, selfSeat, profile } = input;
  const currentTurnCount = Object.values(discardsBySeat).reduce((sum, d) => sum + d.length, 0);

  // Group hand by key to evaluate unique candidates
  const uniqueCandidates = new Map<string, Tile>();
  for (const t of hand) {
    const key = getTileKey(t);
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, t);
    }
  }

  const evaluations: TileEvaluation[] = [];

  for (const [key, t] of uniqueCandidates.entries()) {
    // 1. Temporarily remove one copy of this tile from hand
    const handWithoutT = hand.filter(tile => tile.instanceId !== t.instanceId);

    // 2. Evaluate remaining hand
    const evalResult = evaluateHand(handWithoutT, melds, visibleTiles, profile);

    // 3. Compute baseline discard value
    let discardValue = -(evalResult.bestShanten * 1000) + (evalResult.effectiveTileKeys.length * 15);

    // 4. Check if the tile forms a pair in hand
    const sameRankCountInHand = hand.filter(h => h.suit === t.suit && h.rank === t.rank).length;
    const isPair = sameRankCountInHand >= 2;

    // 5. Jiang tile (2, 5, 8) value
    const isJiangRank = t.rank === 2 || t.rank === 5 || t.rank === 8;
    if (isJiangRank) {
      if (isPair) {
        discardValue -= 150 * profile.weights.pairValue;
      } else {
        discardValue -= 30 * profile.weights.sequenceValue;
      }
    }

    // 6. Pairs potential (QiXiaoDui / PengPengHu)
    if (isPair) {
      const pairPenalty = (evalResult.qiXiaoDuiPotential * profile.weights.qiXiaoDuiPotential +
                           evalResult.pengPengHuPotential * profile.weights.pengPengHuPotential) * 600;
      discardValue -= pairPenalty;
    }

    // 7. QingYiSe potential
    const suits: Array<'wan' | 'tong' | 'tiao'> = ['wan', 'tong', 'tiao'];
    let dominantSuit: 'wan' | 'tong' | 'tiao' | null = null;
    let maxSuitCount = 0;
    for (const suit of suits) {
      const inHand = hand.filter(h => h.suit === suit).length;
      const inMelds = melds.filter(m => m.tiles[0].suit === suit).reduce((sum, m) => sum + m.tiles.length, 0);
      const total = inHand + inMelds;
      if (total > maxSuitCount) {
        maxSuitCount = total;
        dominantSuit = suit;
      }
    }

    let isQysZapai = false;
    let isQysMatch = false;
    if (evalResult.qingYiSePotential > 0.4 && dominantSuit) {
      if (t.suit !== dominantSuit) {
        const qysBonus = evalResult.qingYiSePotential * profile.weights.qingYiSePotential * 1200;
        discardValue += qysBonus;
        isQysZapai = true;
      } else {
        discardValue -= 500 * profile.weights.qingYiSePotential;
        isQysMatch = true;
      }
    }

    // 8. Isolated vs Connected tiles
    const hasNeighbors = hand.some(h => 
      h.instanceId !== t.instanceId &&
      h.suit === t.suit &&
      Math.abs(h.rank - t.rank) <= 2
    );

    let isIsolated = false;
    let isCorner = false;
    if (!hasNeighbors && sameRankCountInHand === 1) {
      discardValue += 120;
      isIsolated = true;
      if (t.rank === 1 || t.rank === 9) {
        discardValue += 40;
        isCorner = true;
      }
    }

    // 9. Evaluate Risk
    const riskValue = evaluateTileRisk({
      tile: t,
      visibleTiles,
      discardsBySeat,
      selfSeat,
      currentTurnCount,
    });

    const riskPenalty = riskValue * profile.weights.riskAvoidance * 10;
    discardValue -= riskPenalty;

    // Construct the active reason why this tile is suitable to discard:
    let reason = '标准出牌评估';
    if (isQysZapai) {
      reason = '清理杂牌以做清一色';
    } else if (isIsolated) {
      reason = isCorner ? '边角孤张' : '孤张优先打出';
    } else if (isPair) {
      reason = '拆对子出牌以优化手牌结构';
    } else if (isJiangRank) {
      reason = '优化手牌将牌结构，打出258牌';
    } else if (isQysMatch) {
      reason = '优化清一色同门牌型结构';
    }

    // Risk-based explanation
    if (riskValue > 30) {
      const allRisks = hand.map(h => evaluateTileRisk({
        tile: h,
        visibleTiles,
        discardsBySeat,
        selfSeat,
        currentTurnCount,
      }));
      const minRisk = Math.min(...allRisks);
      
      if (riskValue === minRisk) {
        reason = `规避高风险牌，避险打出最安全牌（${reason}）`;
      } else {
        reason = `优化手牌结构，冒险打出高风险生张（${reason}）`;
      }
    } else if (riskValue <= 10 && currentTurnCount > 15) {
      reason = `防守阶段，优先打出安全牌（${reason}）`;
    }

    evaluations.push({
      tileKey: key,
      keepValue: -discardValue,
      discardValue,
      riskValue,
      reason,
    });
  }

  return evaluations;
}

export function chooseBestDiscard(input: {
  hand: Tile[];
  melds: Meld[];
  visibleTiles: Tile[];
  discardsBySeat: Record<0 | 1 | 2 | 3, Tile[]>;
  selfSeat: 0 | 1 | 2 | 3;
  profile: AIProfile;
}): Tile {
  const { hand } = input;
  if (hand.length === 0) {
    throw new Error('Hand is empty, cannot choose discard.');
  }

  const evaluations = evaluateDiscardCandidates(input);
  
  // Find candidate with maximum discardValue
  let bestEval = evaluations[0];
  for (const ev of evaluations) {
    if (ev.discardValue > bestEval.discardValue) {
      bestEval = ev;
    }
  }

  // Find a matching tile in hand
  const matchedTile = hand.find(t => getTileKey(t) === bestEval.tileKey);
  if (!matchedTile) {
    // Fallback
    return hand[hand.length - 1];
  }

  return matchedTile;
}
