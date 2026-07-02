import { VisibleInformationForAI, OpponentRead, DefenseEvaluation } from './advanced-ai-types.js';
import { getTileChineseName } from '../coach/hand-advisor.js';
import { Tile } from '../types/tile.js';

export function evaluateDefense(input: {
  visible: VisibleInformationForAI;
  opponentReads: OpponentRead[];
}): DefenseEvaluation[] {
  const { visible, opponentReads } = input;
  const evaluations: DefenseEvaluation[] = [];

  // Get unique tiles in hand
  const uniqueKeys = new Set<string>(visible.hand.map((t: Tile) => `${t.suit}_${t.rank}`));

  // Pre-calculate visible counts for all tile types in the game
  const visibleCounts = new Map<string, number>();
  for (const t of visible.revealedTiles) {
    const key = `${t.suit}_${t.rank}`;
    visibleCounts.set(key, (visibleCounts.get(key) || 0) + 1);
  }

  for (const tileKey of uniqueKeys) {
    const [suit, rankStr] = tileKey.split('_');
    const rank = parseInt(rankStr, 10);
    const tileChineseName = getTileChineseName(tileKey);

    let maxRiskScore = 0;
    const dangerousToSeats: Array<0 | 1 | 2 | 3> = [];
    const reasonsMap: Record<number, string> = {};

    // Count how many copies of this tile are visible on the table (excluding our hand)
    const ourHandCount = visible.hand.filter((t: Tile) => `${t.suit}_${t.rank}` === tileKey).length;
    const tableVisibleCount = Math.max(0, (visibleCounts.get(tileKey) || 0) - ourHandCount);

    for (const opp of opponentReads) {
      const oppSeat = opp.seat;
      const oppDiscards = visible.allDiscards[oppSeat] || [];
      
      // Rule 1: 现物 (Gen / Safe)
      const isOpponentDiscarded = oppDiscards.some((t: Tile) => `${t.suit}_${t.rank}` === tileKey);
      if (isOpponentDiscarded) {
        reasonsMap[oppSeat] = `该牌在玩家 ${oppSeat} 的弃牌河中已出现，对其相对安全（现物）。`;
        continue;
      }

      // Base risk calculation
      let oppRisk = 0;
      let oppReason = '';

      const isShengZhang = tableVisibleCount === 0;

      if (isShengZhang) {
        if (rank >= 4 && rank <= 6) {
          oppRisk = 30; // Unseen middle card
          oppReason = `该牌为未公开的中张生张，可能存在点炮风险。`;
        } else {
          oppRisk = 15; // Unseen terminal card
          oppReason = `该牌为未公开的边角生张，风险相对偏低。`;
        }
      } else {
        if (tableVisibleCount >= 3) {
          oppRisk = 2; // Extinction tile (绝张)
          oppReason = `该牌为绝张（场上已见 ${tableVisibleCount} 张），极难被胡。`;
        } else {
          // If a card is seen on table but not discarded by this player, risk is medium
          oppRisk = rank >= 4 && rank <= 6 ? 16 : 12;
          oppReason = `该牌场上已见 ${tableVisibleCount} 张，风险度较低。`;
        }
      }

      // Rule 2: Dangerous Suits matching
      const isDangerousSuit = opp.dangerousSuits.some(ds => ds.suit === suit);
      if (isDangerousSuit) {
        const suitName = suit === 'wan' ? '万字' : suit === 'tong' ? '筒子' : '条子';
        oppRisk += isShengZhang ? 40 : 20;
        oppReason = `该牌属于玩家 ${oppSeat} 疑似收集的 ${suitName} 清一色花色，放铳风险可能极高。`;
      }

      // Rule 3: Ting status multiplier
      if (opp.isLikelyTing) {
        oppRisk = oppRisk * (1.0 + opp.tingConfidence);
        oppReason = `玩家 ${oppSeat} 疑似已听牌，出牌放铳风险提升。` + oppReason;
      }

      if (oppRisk > maxRiskScore) {
        maxRiskScore = oppRisk;
      }
      if (oppRisk > 25) {
        dangerousToSeats.push(oppSeat);
      }
    }

    // Determine Risk Level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (maxRiskScore > 65) {
      riskLevel = 'critical';
    } else if (maxRiskScore > 40) {
      riskLevel = 'high';
    } else if (maxRiskScore >= 12) {
      riskLevel = 'medium';
    }

    // Combined reason
    let finalReason = '';
    if (riskLevel === 'low') {
      finalReason = `从已公开牌河看，打出 ${tileChineseName} 的风险较低，各家点炮可能较小。`;
    } else {
      const dangerSeatsStr = dangerousToSeats.map((s: number) => `玩家 ${s}`).join('、');
      finalReason = `打出 ${tileChineseName} 可能会对 ${dangerSeatsStr} 造成放铳危险；当前估算最高放铳风险等级为 [${riskLevel}]。`;
    }

    evaluations.push({
      tileKey,
      riskScore: Math.min(100, Math.max(0, maxRiskScore)),
      riskLevel,
      dangerousToSeats,
      reason: finalReason,
    });
  }

  return evaluations;
}
