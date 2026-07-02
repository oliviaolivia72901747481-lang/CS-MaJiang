import { GameState } from '../types/game.js';
import { PendingAction } from '../types/game.js';
import { ActionAdvice } from './coach-types.js';
import { calculateBestShanten } from '../ai/shanten-calculator.js';
import { getTileChineseName } from './hand-advisor.js';
import { Tile } from '../types/tile.js';
import { Meld } from '../types/meld.js';
import { buildVisibleStateForCoach } from './visible-state.js';

export function adviseHumanAction(input: {
  state: GameState;
  humanSeat: 0;
  availableActions: PendingAction[];
}): ActionAdvice[] {
  const { state, humanSeat, availableActions } = input;
  const visibleState = buildVisibleStateForCoach(state, humanSeat);
  const hand = visibleState.humanHand;
  const melds = visibleState.humanMelds;

  // 1. Filter: Only analyze actions for humanSeat (seat 0)
  const filteredActions = (availableActions || []).filter(act => act.seat === humanSeat);

  if (filteredActions.length === 0) return [];

  const shantenResult = calculateBestShanten(hand, melds);
  const currentNormalShanten = shantenResult.normalShanten;
  const qixiaoDuiShanten = shantenResult.qiXiaoDuiShanten;
  const isCloseToQiXiaoDui = qixiaoDuiShanten <= 3; // 3 shanten or less for QiXiaoDui

  const advices: ActionAdvice[] = [];

  for (const act of filteredActions) {
    const tileName = act.tile ? getTileChineseName(`${act.tile.suit}_${act.tile.rank}`) : '';
    const actionMapped = (act.type.includes('Gang') ? 'gang' : act.type === 'ziMo' ? 'hu' : act.type) as any;

    switch (act.type) {
      case 'hu':
      case 'ziMo':
        advices.push({
          action: 'hu',
          recommend: true,
          score: 10000,
          reason: act.type === 'ziMo' 
            ? `🎉 强烈推荐自摸胡牌！直接赢得分数并结束本局。` 
            : `🎉 强烈推荐胡牌！赢分自玩家点炮，直接赢得胜利。`,
        });
        break;

      case 'peng':
        if (act.tile) {
          const matchingTiles = hand.filter(t => t.suit === act.tile!.suit && t.rank === act.tile!.rank);
          const handAfterMeld = hand.filter(t => {
            const isMatch = t.suit === act.tile!.suit && t.rank === act.tile!.rank;
            return !isMatch;
          });
          const newMeld: Meld = {
            type: 'peng',
            tiles: [act.tile, matchingTiles[0] || act.tile, matchingTiles[1] || act.tile],
            exposed: true,
          };
          const shantenAfter = calculateBestShanten(handAfterMeld, [...melds, newMeld]).normalShanten;

          let pengRecommend = false;
          let pengScore = 30;
          let pengReason = '';

          if (isCloseToQiXiaoDui) {
            pengRecommend = false;
            pengScore = 10;
            pengReason = `碰牌 ${tileName} 会破坏门清听牌结构，导致无法胡七小对，建议过牌保持手牌形态。`;
          } else if (shantenAfter < currentNormalShanten) {
            pengRecommend = true;
            pengScore = 80;
            pengReason = `碰牌 ${tileName} 能将手牌推进至 ${shantenAfter} 向听，有利于更快听牌。`;
          } else {
            pengRecommend = false;
            pengScore = 30;
            pengReason = `碰牌 ${tileName} 不会改善手牌向听数，建议过牌保持手牌防守空间。`;
          }

          advices.push({
            action: 'peng',
            recommend: pengRecommend,
            score: pengScore,
            reason: pengReason,
          });
        }
        break;

      case 'chi':
        if (act.tile && act.options && act.options.length > 0) {
          // 8. Explain each eat combination option individually
          for (let optIdx = 0; optIdx < act.options.length; optIdx++) {
            const opt = act.options[optIdx];
            const handAfterMeld = hand.filter(t => !opt.some(o => o.instanceId === t.instanceId));
            const newMeld: Meld = {
              type: 'chi',
              tiles: [act.tile, ...opt],
              exposed: true,
            };
            const shantenAfter = calculateBestShanten(handAfterMeld, [...melds, newMeld]).normalShanten;
            
            const optString = opt.map(t => getTileChineseName(`${t.suit}_${t.rank}`)).join('和');

            let optRecommend = false;
            let optScore = 25;
            let optReason = '';

            if (isCloseToQiXiaoDui) {
              optRecommend = false;
              optScore = 5;
              optReason = `【吃牌: 用 ${optString} 吃】做七小对需要保持门清，吃牌将彻底丧失七小对大胡路径，建议过牌。`;
            } else if (shantenAfter < currentNormalShanten) {
              optRecommend = true;
              optScore = 70 - optIdx;
              optReason = `【吃牌: 用 ${optString} 吃】吃牌能将手牌推进至 ${shantenAfter} 向听，有利于更快听牌。`;
            } else {
              optRecommend = false;
              optScore = 25;
              optReason = `【吃牌: 用 ${optString} 吃】吃牌不会改善向听，且公开副露会降低防守安全度，建议过牌。`;
            }

            advices.push({
              action: 'chi',
              recommend: optRecommend,
              score: optScore,
              reason: optReason,
            });
          }
        }
        break;

      case 'anGang':
      case 'buGang':
      case 'mingGang': {
        const gangLabel = act.type === 'anGang' ? '暗杠' : act.type === 'buGang' ? '补杠' : '明杠';
        const remainingWall = visibleState.wallRemainingCount;

        let gangRecommend = false;
        let gangScore = 150;
        let gangReason = '';

        if (remainingWall < 10) {
          gangRecommend = false;
          gangScore = 15;
          gangReason = `局势已进入尾声（牌墙仅剩 ${remainingWall} 张），杠牌可能增加他人放铳风险，建议谨慎过牌。`;
        } else {
          gangRecommend = true;
          gangScore = 150;
          gangReason = `推荐选择${gangLabel} ${tileName}！杠牌可直接获得杠钱积分，且能进行杠上补张，有概率摸得杠上开花。`;
        }

        advices.push({
          action: 'gang',
          recommend: gangRecommend,
          score: gangScore,
          reason: gangReason,
        });
        break;
      }

      case 'pass':
        advices.push({
          action: 'pass',
          recommend: true,
          score: 50,
          reason: `选择过牌。保持手牌门清及防守灵活度，有利于伺机求胡或进行安全防守。`,
        });
        break;

      default:
        advices.push({
          action: actionMapped,
          recommend: false,
          score: 10,
          reason: `常规动作选项。`,
        });
    }
  }

  // Sort: prioritize recommended actions, then sort by score descending
  return advices.sort((a, b) => {
    if (a.recommend !== b.recommend) {
      return a.recommend ? -1 : 1;
    }
    return b.score - a.score;
  });
}
