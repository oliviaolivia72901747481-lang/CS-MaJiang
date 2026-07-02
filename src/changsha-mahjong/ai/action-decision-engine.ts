import { AIDecision } from './ai-types.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { AIProfile } from './ai-types.js';
import { evaluateHand } from './hand-evaluator.js';
import { PendingAction } from '../types/game.js';

function getTileKey(tile: Tile): string {
  return `${tile.suit}_${tile.rank}`;
}

export function decideAction(input: {
  availableActions: PendingAction[];
  hand: Tile[];
  melds: Meld[];
  visibleTiles: Tile[];
  discardsBySeat: Record<0 | 1 | 2 | 3, Tile[]>;
  selfSeat: 0 | 1 | 2 | 3;
  profile: AIProfile;
}): AIDecision {
  const { availableActions, hand, melds, visibleTiles, selfSeat, profile } = input;

  const myActions = availableActions.filter(a => a.seat === selfSeat);
  if (myActions.length === 0) {
    return {
      action: 'pass',
      score: 0,
      reason: '无可用动作，默认过',
    };
  }

  // 1. Hu/ZiMo is absolute priority
  const huAct = myActions.find(a => a.type === 'hu' || a.type === 'ziMo');
  if (huAct) {
    return {
      action: huAct.type as 'hu' | 'ziMo',
      tileKey: huAct.tile ? getTileKey(huAct.tile) : undefined,
      score: 10000,
      reason: '能胡牌，优先胡牌/自摸',
    };
  }

  const currentEval = evaluateHand(hand, melds, visibleTiles, profile);
  const currentShanten = currentEval.bestShanten;

  const candidateDecisions: Array<{
    action: string;
    tileKey?: string;
    tiles?: string[];
    score: number;
    reason: string;
    rejectedReason?: string;
  }> = [];

  for (const act of myActions) {
    if (act.type === 'pass') {
      continue;
    }

    if (act.type === 'anGang') {
      const score = 70 + profile.weights.gangAggression * 50;
      candidateDecisions.push({
        action: 'anGang',
        tileKey: act.tile ? getTileKey(act.tile) : undefined,
        score,
        reason: '暗杠：安全且可得杠分',
        rejectedReason: '暗杠收益低，选择过',
      });
      continue;
    }

    if (act.type === 'buGang') {
      let score = 65 + profile.weights.gangAggression * 40;
      let rejectedReason = '补杠收益低，选择过';
      if (profile.type === 'defensive') {
        score -= 30;
        rejectedReason = '防守型规避补杠风险（有被抢杠胡风险）';
      }
      candidateDecisions.push({
        action: 'buGang',
        tileKey: act.tile ? getTileKey(act.tile) : undefined,
        score,
        reason: '补杠：得杠分并补张',
        rejectedReason,
      });
      continue;
    }

    if (act.type === 'mingGang') {
      let score = 60 + profile.weights.gangAggression * 45;
      let rejectedReason = '明杠收益低，选择过';
      if (profile.type === 'defensive') {
        score -= 20;
        rejectedReason = '防守型规避明杠风险（暴露手牌且少杠）';
      }
      candidateDecisions.push({
        action: 'mingGang',
        tileKey: act.tile ? getTileKey(act.tile) : undefined,
        score,
        reason: '明杠：得杠分并补张',
        rejectedReason,
      });
      continue;
    }

    if (act.type === 'peng' && act.tile) {
      const pTile = act.tile;
      const clonedHand = hand.filter(t => !(t.suit === pTile.suit && t.rank === pTile.rank)).slice(0, hand.length - 2);
      const newMeld: Meld = {
        type: 'peng',
        tiles: [pTile, pTile, pTile],
        exposed: true,
      };
      const clonedMelds = [...melds, newMeld];
      const afterEval = evaluateHand(clonedHand, clonedMelds, visibleTiles, profile);
      const shantenDiff = currentShanten - afterEval.bestShanten;

      let score = 45 + shantenDiff * 200 + profile.weights.chiPengAggression * 30;
      let reason = '碰牌改善手牌';
      let rejectedReason = '碰牌不改善向听';

      if (afterEval.bestShanten === 0) {
        score += 100;
        reason = '碰牌后听牌';
      }

      if (afterEval.pengPengHuPotential > currentEval.pengPengHuPotential) {
        score += afterEval.pengPengHuPotential * profile.weights.pengPengHuPotential * 150;
        reason = '碰牌有利于碰碰胡';
      }

      if (shantenDiff <= 0 && afterEval.pengPengHuPotential <= currentEval.pengPengHuPotential) {
        score -= 80;
        rejectedReason = '碰牌不改善向听';
      }

      if (profile.type === 'defensive') {
        const afterHandSize = clonedHand.length;
        if (afterHandSize <= 4) {
          score -= 80;
          rejectedReason = '防守型规避过短手牌（避免碰牌）';
        } else if (afterHandSize <= 7) {
          score -= 30;
          rejectedReason = '防守型中后期偏好保留长手牌防守（少碰）';
        }
      }

      candidateDecisions.push({
        action: 'peng',
        tileKey: getTileKey(pTile),
        score,
        reason,
        rejectedReason,
      });
      continue;
    }

    if (act.type === 'chi' && act.tile && act.options) {
      const cTile = act.tile;
      let bestChiScore = -999;
      let bestChiReason = '吃牌改善手牌';
      let bestChiRejectedReason = '吃牌不改善向听';
      let bestChiTiles: string[] = [];

      for (const opt of act.options) {
        if (opt.length < 2) continue;
        const optKeys = opt.map((t: Tile) => getTileKey(t));
        const usedIds = opt.map((t: Tile) => t.instanceId);
        const clonedHand = hand.filter(t => !usedIds.includes(t.instanceId));
        
        const newMeld: Meld = {
          type: 'chi',
          tiles: [cTile, ...opt],
          exposed: true,
        };
        const clonedMelds = [...melds, newMeld];
        const afterEval = evaluateHand(clonedHand, clonedMelds, visibleTiles, profile);
        const shantenDiff = currentShanten - afterEval.bestShanten;

        let score = 40 + shantenDiff * 180 + profile.weights.chiPengAggression * 20;
        let optReason = '吃牌改善手牌';
        let optRejectedReason = '吃牌不改善向听';

        if (afterEval.bestShanten === 0) {
          score += 80;
          optReason = '吃牌后听牌';
        }

        if (shantenDiff <= 0) {
          score -= 90;
          optRejectedReason = '吃牌不改善向听';
        }

        if (profile.type === 'bigHu') {
          score -= 200;
          optRejectedReason = '大胡型倾向保持门清，避免吃牌';
        }

        if (bestChiScore < score) {
          bestChiScore = score;
          bestChiReason = optReason;
          bestChiRejectedReason = optRejectedReason;
          bestChiTiles = optKeys;
        }
      }

      candidateDecisions.push({
        action: 'chi',
        tileKey: getTileKey(cTile),
        tiles: bestChiTiles,
        score: bestChiScore,
        reason: bestChiReason,
        rejectedReason: bestChiRejectedReason,
      });
      continue;
    }
  }

  const passScore = 50;
  let bestCandidate = candidateDecisions.length > 0
    ? candidateDecisions.reduce((best, cur) => cur.score > best.score ? cur : best, candidateDecisions[0])
    : null;

  if (bestCandidate && bestCandidate.score > passScore) {
    return {
      action: bestCandidate.action as any,
      tileKey: bestCandidate.tileKey,
      tiles: bestCandidate.tiles,
      score: bestCandidate.score,
      reason: bestCandidate.reason,
    };
  } else {
    const rejectedReasons: string[] = [];
    for (const cand of candidateDecisions) {
      if (cand.rejectedReason) {
        rejectedReasons.push(cand.rejectedReason);
      }
    }
    const finalReason = rejectedReasons.length > 0
      ? `过牌（原因：${rejectedReasons.join('，且')}）`
      : '选择过，保留手牌现状';

    return {
      action: 'pass',
      score: passScore,
      reason: finalReason,
    };
  }
}
