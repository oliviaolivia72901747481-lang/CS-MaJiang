import { VisibleInformationForAI, OpponentRead } from './advanced-ai-types.js';
import { RouteType } from './advanced-ai-types.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';

export function analyzeOpponents(input: {
  visible: VisibleInformationForAI;
}): OpponentRead[] {
  const { visible } = input;
  const result: OpponentRead[] = [];

  for (let seat = 0; seat < 4; seat++) {
    if (seat === visible.seat) continue;
    const oppSeat = seat as 0 | 1 | 2 | 3;

    const discards = visible.allDiscards[oppSeat] || [];
    const melds = visible.allMelds[oppSeat] || [];
    const totalDiscards = discards.length;

    // 1. Suspected Routes & Confidence
    const suspectedRoutes: Array<{ route: RouteType; confidence: number; reason: string }> = [];

    // QingYiSe Analysis
    const meldSuits = new Set<string>(melds.flatMap((m: Meld) => m.tiles.map((t: Tile) => t.suit)));
    const discardSuits = discards.map((t: Tile) => t.suit);
    const wanDiscards = discardSuits.filter((s: string) => s === 'wan').length;
    const tongDiscards = discardSuits.filter((s: string) => s === 'tong').length;
    const tiaoDiscards = discardSuits.filter((s: string) => s === 'tiao').length;

    let qingYiSeConf = 0;
    let qingYiSeReason = '';
    let targetSuit: 'wan' | 'tong' | 'tiao' | null = null;

    if (meldSuits.size === 1) {
      targetSuit = Array.from(meldSuits)[0] as any;
      if (targetSuit) {
        qingYiSeConf = 0.4 + melds.length * 0.15;
        const otherDiscards = discardSuits.filter((s: string) => s !== targetSuit).length;
        if (otherDiscards > 0 && totalDiscards > 0) {
          qingYiSeConf += Math.min(0.3, (otherDiscards / totalDiscards) * 0.3);
        }
        qingYiSeReason = `从公开副露看，该玩家倾向于做${targetSuit === 'wan' ? '万字' : targetSuit === 'tong' ? '筒子' : '条子'}清一色。`;
      }
    } else if (meldSuits.size === 0 && totalDiscards >= 5) {
      // Analyze discards to see if one suit is completely untouched
      if (wanDiscards >= 2 && tongDiscards >= 2 && tiaoDiscards === 0) {
        qingYiSeConf = 0.5;
        targetSuit = 'tiao';
        qingYiSeReason = '从公开弃牌看，疑似在收集条子清一色。';
      } else if (wanDiscards >= 2 && tiaoDiscards >= 2 && tongDiscards === 0) {
        qingYiSeConf = 0.5;
        targetSuit = 'tong';
        qingYiSeReason = '从公开弃牌看，疑似在收集筒子清一色。';
      } else if (tongDiscards >= 2 && tiaoDiscards >= 2 && wanDiscards === 0) {
        qingYiSeConf = 0.5;
        targetSuit = 'wan';
        qingYiSeReason = '从公开弃牌看，疑似在收集万字清一色。';
      }
    }

    if (qingYiSeConf > 0.3 && targetSuit) {
      suspectedRoutes.push({
        route: 'qingYiSe',
        confidence: Math.min(0.95, qingYiSeConf),
        reason: qingYiSeReason,
      });
    }

    // PengPengHu Analysis
    const pengCount = melds.filter((m: Meld) => m.type === 'peng' || m.type === 'mingGang' || m.type === 'buGang' || m.type === 'anGang').length;
    if (pengCount >= 2) {
      const conf = Math.min(0.95, pengCount * 0.3);
      suspectedRoutes.push({
        route: 'pengPengHu',
        confidence: conf,
        reason: `从公开副露看，碰杠副露达 ${pengCount} 次，倾向于碰碰胡路线。`,
      });
    }

    // QiXiaoDui / MenQing Analysis
    if (melds.length === 0 && totalDiscards >= 6) {
      const conf = Math.min(0.8, 0.2 + (totalDiscards - 4) * 0.06);
      suspectedRoutes.push({
        route: 'qiXiaoDui',
        confidence: conf,
        reason: '该玩家至今无副露，倾向于保持门清或做七小对大胡。',
      });
    }

    // JiangJiangHu Analysis
    const isAllJiangTiles = (tiles: Tile[]) => tiles.every((t: Tile) => t.rank === 2 || t.rank === 5 || t.rank === 8);
    const meldTiles = melds.flatMap((m: Meld) => m.tiles);
    if (meldTiles.length > 0 && isAllJiangTiles(meldTiles) && isAllJiangTiles(discards)) {
      suspectedRoutes.push({
        route: 'jiangJiangHu',
        confidence: 0.6,
        reason: '副露及弃牌中全为二五八，可能在筹划将将胡。',
      });
    }

    // Default Route
    if (suspectedRoutes.length === 0) {
      suspectedRoutes.push({
        route: 'smallHu',
        confidence: 0.5,
        reason: '该玩家出牌较平稳，推测为普通胡路线。',
      });
    }

    // Sort by confidence descending
    suspectedRoutes.sort((a, b) => b.confidence - a.confidence);

    // 2. Dangerous Suits
    const dangerousSuits: Array<{ suit: 'wan' | 'tong' | 'tiao'; confidence: number; reason: string }> = [];
    if (targetSuit) {
      dangerousSuits.push({
        suit: targetSuit,
        confidence: Math.min(0.95, qingYiSeConf + 0.1),
        reason: `由于疑似做该花色的清一色，此花色对其可能属于高危花色。`,
      });
    } else {
      // Guess based on few discards
      const suits: Array<'wan' | 'tong' | 'tiao'> = ['wan', 'tong', 'tiao'];
      const counts = [wanDiscards, tongDiscards, tiaoDiscards];
      const minVal = Math.min(...counts);
      const minIdx = counts.indexOf(minVal);
      const target = suits[minIdx];
      // If it's significantly lower than others
      const total = wanDiscards + tongDiscards + tiaoDiscards;
      if (total >= 6 && minVal <= total * 0.15) {
        dangerousSuits.push({
          suit: target,
          confidence: 0.45,
          reason: `该玩家很少打出${target === 'wan' ? '万字' : target === 'tong' ? '筒子' : '条子'}，可能对此类牌有较深需求。`,
        });
      }
    }

    // 3. Ting Probability & Reason
    let tingConfidence = 0;
    let tingReason = '对局处于初期，该玩家可能尚未听牌。';

    if (melds.length >= 4) {
      tingConfidence = 0.99;
      tingReason = '该玩家已露四副牌，手牌仅剩单张，可能已经听牌。';
    } else if (melds.length === 3) {
      tingConfidence = 0.85;
      tingReason = '该玩家副露已达三副，根据局势推测听牌概率较高。';
    } else {
      // Heuristics based on discard progress
      const baseConf = Math.min(0.7, (totalDiscards / 18) * 0.6);
      tingConfidence = baseConf;
      tingReason = `根据当前局势进展，其听牌概率约为 ${(tingConfidence * 100).toFixed(0)}%。`;

      // Check if they recently discarded a dangerous tile (rank 4, 5, 6 which was unseen)
      if (totalDiscards > 8) {
        const lastDiscard = discards[discards.length - 1];
        if (lastDiscard && (lastDiscard.rank === 4 || lastDiscard.rank === 5 || lastDiscard.rank === 6)) {
          tingConfidence = Math.min(0.9, tingConfidence + 0.2);
          tingReason = '该玩家在中后期打出中张生牌，可能已经完成听牌。';
        }
      }
    }

    result.push({
      seat: oppSeat,
      suspectedRoutes,
      dangerousSuits,
      isLikelyTing: tingConfidence > 0.65,
      tingConfidence,
      reason: tingReason,
    });
  }

  return result;
}
