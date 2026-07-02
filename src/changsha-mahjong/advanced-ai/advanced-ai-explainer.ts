import { AdvancedAIDecision } from './advanced-ai-types.js';
import { getTileChineseName } from '../coach/hand-advisor.js';

export function explainAdvancedDecision(decision: AdvancedAIDecision): string {
  const { action, tileKey, strategyMode, selectedRoute, expectedValue, riskScore } = decision;

  let modeStr = '攻守平衡';
  if (strategyMode === 'attack') modeStr = '积极进攻';
  else if (strategyMode === 'forceWin') modeStr = '听牌强攻';
  else if (strategyMode === 'defense') modeStr = '稳健防守';
  else if (strategyMode === 'fold') modeStr = '彻底弃牌防点炮';

  let routeStr = '混合折中';
  if (selectedRoute === 'smallHu') routeStr = '小胡快胡';
  else if (selectedRoute === 'qingYiSe') routeStr = '清一色大胡';
  else if (selectedRoute === 'pengPengHu') routeStr = '碰碰胡大胡';
  else if (selectedRoute === 'qiXiaoDui') routeStr = '七小对大胡';
  else if (selectedRoute === 'jiangJiangHu') routeStr = '将将胡大胡';

  if (action === 'discard' && tileKey) {
    const tileName = getTileChineseName(tileKey);
    const riskLevelStr = riskScore > 60 ? '极高' : riskScore > 35 ? '较高' : '较低';
    
    return `选择打出 ${tileName}：当前在 [${modeStr}] 模式下，锁定的目标为 [${routeStr}] 路线。此牌在玩家视角评估下的放铳风险为 ${riskScore.toFixed(0)}（风险${riskLevelStr}），出牌估算期望得分为 ${expectedValue.toFixed(0)}。打出此牌是当前基于公开牌信息做出的合理选择。`;
  }

  let actionName = '过牌';
  if (action === 'chi') actionName = '吃牌';
  else if (action === 'peng') actionName = '碰牌';
  else if (action === 'mingGang' || action === 'buGang' || action === 'anGang') actionName = '杠牌';
  else if (action === 'hu') actionName = '胡牌';

  return `选择进行 [${actionName}]：当前处于 [${modeStr}] 状态，目标路线为 [${routeStr}]。此动作在当前期望值决策下的评分是 ${expectedValue.toFixed(0)}，符合当前的防避铳与牌效路线规划。`;
}
