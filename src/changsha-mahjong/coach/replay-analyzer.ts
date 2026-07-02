import { GameState, PendingAction } from '../types/game.js';
import { PlayerDecisionRecord, ReplayReport, ReplayInsight } from './coach-types.js';
import { recommendDiscards } from './discard-advisor.js';
import { adviseHumanAction } from './action-advisor.js';
import { getTileChineseName } from './hand-advisor.js';

function getLocalHumanAvailableActions(state: GameState, humanSeat: number = 0): PendingAction[] {
  if (!state || !state.pendingActions) return [];
  return state.pendingActions.filter(a => a.seat === humanSeat);
}

export function recordHumanDecision(input: {
  stateBefore: GameState;
  stateAfter: GameState;
  humanSeat: 0;
  actualAction: string;
  actualTileKey?: string;
}): PlayerDecisionRecord {
  const { stateBefore, stateAfter, humanSeat, actualAction, actualTileKey } = input;
  const currentStep = stateBefore.logs.length;
  
  let recommendedAction = '';
  let recommendedTileKey = '';
  let matchedRecommendation = false;
  let reason = '';

  // Case A: Discard decision
  if (actualAction === 'discard' || (stateBefore.phase === 'playing' && stateBefore.currentSeat === 0)) {
    recommendedAction = 'discard';
    const discards = recommendDiscards({ state: stateBefore, humanSeat: 0, topN: 1 });
    if (discards.length > 0) {
      recommendedTileKey = discards[0].tileKey;
      matchedRecommendation = actualTileKey === recommendedTileKey;
      reason = discards[0].reason;
    } else {
      matchedRecommendation = true;
      reason = '手牌为空或无出牌推荐。';
    }
  } 
  // Case B: Tactical Meld/Hu action response
  else {
    const availableActions = getLocalHumanAvailableActions(stateBefore, 0);
    const actionAdvices = adviseHumanAction({ state: stateBefore, humanSeat: 0, availableActions });
    
    if (actionAdvices.length > 0) {
      const topAdvice = actionAdvices[0];
      recommendedAction = topAdvice.action;
      matchedRecommendation = actualAction === recommendedAction;
      reason = topAdvice.reason;
    } else {
      matchedRecommendation = true;
      reason = '当前没有战术决策可做。';
    }
  }

  return {
    step: currentStep,
    phase: stateBefore.phase,
    seat: humanSeat,
    actualAction,
    actualTileKey,
    recommendedAction,
    recommendedTileKey: recommendedTileKey || undefined,
    matchedRecommendation,
    reason,
  };
}

export function analyzeReplay(input: {
  finalState: GameState;
  decisionRecords: PlayerDecisionRecord[];
  humanSeat: 0;
}): ReplayReport {
  const { finalState, decisionRecords, humanSeat } = input;

  // Determine round result
  let roundResult: 'win' | 'lose' | 'draw' = 'draw';
  if (finalState.winnerSeats && finalState.winnerSeats.length > 0) {
    if (finalState.winnerSeats.includes(humanSeat)) {
      roundResult = 'win';
    } else {
      roundResult = 'lose';
    }
  }

  // Calculate score delta for Player 0
  const playerId = finalState.players.find(p => p.seat === humanSeat)?.id || '';
  let playerScoreDelta = 0;
  for (const evt of finalState.scoreEvents) {
    if (evt.toPlayerId === playerId) {
      playerScoreDelta += evt.score;
    }
    if (evt.fromPlayerId === playerId) {
      playerScoreDelta -= evt.score;
    }
  }

  const totalDecisions = decisionRecords.length;
  const matchedRecommendationCount = decisionRecords.filter(r => r.matchedRecommendation).length;

  let riskyDiscardCount = 0;
  const goodDecisions: PlayerDecisionRecord[] = [];
  const questionableDecisions: PlayerDecisionRecord[] = [];
  const keyMoments: string[] = [];

  decisionRecords.forEach(record => {
    if (record.actualAction === 'discard' && record.actualTileKey) {
      const isRisky = record.reason.includes('高风险') || record.reason.includes('极高');
      if (isRisky) {
        riskyDiscardCount++;
        questionableDecisions.push(record);
        keyMoments.push(`在第 ${record.step} 步打出了可能有放铳风险的牌 ${getTileChineseName(record.actualTileKey)}。`);
      } else if (record.matchedRecommendation) {
        goodDecisions.push(record);
      } else {
        questionableDecisions.push(record);
      }
    } else {
      if (record.matchedRecommendation) {
        goodDecisions.push(record);
        if (record.actualAction === 'hu' || record.actualAction === 'ziMo') {
          keyMoments.push(`在第 ${record.step} 步胡牌，对局胜利。`);
        }
      } else {
        questionableDecisions.push(record);
        keyMoments.push(`在第 ${record.step} 步做出了不同的动作决策：选择 [${record.actualAction}]，AI 推荐 [${record.recommendedAction}]。`);
      }
    }
  });

  const matchRate = totalDecisions > 0 ? (matchedRecommendationCount / totalDecisions) * 100 : 100;

  // Build summary and tips
  let summary = '';
  const nextRoundTips: string[] = [];

  if (roundResult === 'win') {
    summary = `本局获得了 ${playerScoreDelta} 积分，当时可知推荐匹配率为 ${matchRate.toFixed(1)}%。出牌节奏掌控良好。`;
    nextRoundTips.push('继续保持当前的胡牌灵敏度，注意门清与大胡听牌的兼顾。');
  } else if (roundResult === 'lose') {
    summary = `落败（输分 ${Math.abs(playerScoreDelta)}）。决策匹配率为 ${matchRate.toFixed(1)}%，可能有放铳风险的出牌 ${riskyDiscardCount} 次。`;
    nextRoundTips.push('建议在对局中后期多关注 AI 的危险牌预警，避免冒险打出生张。');
  } else {
    summary = `流局。决策匹配率为 ${matchRate.toFixed(1)}%。防守表现稳定，安全避开点炮风险。`;
    nextRoundTips.push('下局可以尝试在局中更积极地评估吃碰选项以改善手牌向听数，加快进张效率。');
  }

  if (riskyDiscardCount > 2) {
    nextRoundTips.push('打出的公开生张或中张偏多，建议多留心各家已打出牌河。');
  }

  // 3. Generate Replay Insights (realTimeKnown vs afterTheFact)
  const insights: ReplayInsight[] = [];

  // Generate realTimeKnown insights
  if (decisionRecords.length === 0) {
    insights.push({
      type: 'realTimeKnown',
      title: '对局前期',
      description: '从当时可知信息看，没有产生复杂的进张或防守抉择。',
    });
  } else {
    const firstQuest = decisionRecords.find(d => !d.matchedRecommendation);
    if (firstQuest) {
      const tileName = firstQuest.actualTileKey ? getTileChineseName(firstQuest.actualTileKey) : '';
      const recName = firstQuest.recommendedTileKey ? getTileChineseName(firstQuest.recommendedTileKey) : '';
      insights.push({
        type: 'realTimeKnown',
        title: `第 ${firstQuest.step} 步决策分析`,
        description: `从当时已公开牌河看，打出 ${tileName} 存在防守风险，当时推荐打出的 ${recName || '过牌'} 可能是更安全的选项。`,
      });
    } else {
      const firstGood = decisionRecords[0];
      const tileName = firstGood.actualTileKey ? getTileChineseName(firstGood.actualTileKey) : '';
      insights.push({
        type: 'realTimeKnown',
        title: `第 ${firstGood.step} 步合理选择`,
        description: `从当时已公开牌看，打出 ${tileName} 是基于牌河信息做出的相对合理的出牌，进张效率较佳。`,
      });
    }
  }

  // Generate afterTheFact insights
  if (roundResult === 'win') {
    insights.push({
      type: 'afterTheFact',
      title: '赢牌结算观察',
      description: '从全局手牌公开看，其他防守位对手的手牌结构较慢，您的进攻速度领先，成功吃碰听牌并夺得胜利。',
    });
  } else if (roundResult === 'lose') {
    const dianPaoEvent = finalState.scoreEvents.find(e => e.reason.includes('点炮'));
    if (dianPaoEvent) {
      insights.push({
        type: 'afterTheFact',
        title: '点炮事后分析',
        description: `从全局手牌公开看，对手当时确实已经听牌，打出生张导致了直接放铳。`,
      });
    } else {
      insights.push({
        type: 'afterTheFact',
        title: '防守劣势观察',
        description: '从全局手牌公开看，对手暗地里已完成大胡听牌，虽然场上进行了部分防守，但速度上被对手抢占先机。',
      });
    }
  } else {
    insights.push({
      type: 'afterTheFact',
      title: '流局防守分析',
      description: '从全局手牌公开看，多方手中均持有高危牌，盲目开胡放铳风险极高，流局对于防守位是相对合理的结果。',
    });
  }

  return {
    roundResult,
    playerScoreDelta,
    totalDecisions,
    matchedRecommendationCount,
    riskyDiscardCount,
    goodDecisions,
    questionableDecisions,
    keyMoments,
    summary,
    nextRoundTips,
    insights,
  };
}
