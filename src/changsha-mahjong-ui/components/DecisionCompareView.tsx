import React from 'react';
import { PlayerDecisionRecord } from '../../changsha-mahjong/coach/coach-types.js';
import { getTileChineseName } from '../../changsha-mahjong/coach/hand-advisor.js';

export interface DecisionCompareViewProps {
  record: PlayerDecisionRecord;
}

export function DecisionCompareView({ record }: DecisionCompareViewProps) {
  const formatChoice = (action: string, tileKey?: string) => {
    if (action === 'discard' && tileKey) {
      return `打出 ${getTileChineseName(tileKey)}`;
    }
    const map: Record<string, string> = {
      chi: '吃牌',
      peng: '碰牌',
      gang: '杠牌',
      anGang: '暗杠',
      buGang: '补杠',
      mingGang: '明杠',
      hu: '胡牌',
      ziMo: '自摸胡',
      pass: '过牌',
      discard: '出牌',
    };
    return map[action] || action;
  };

  return (
    <div className={`decision-compare-card ${record.matchedRecommendation ? 'compare-matched' : 'compare-mismatched'}`}>
      <div className="compare-header">
        <span className="compare-step">第 {record.step} 步 ({record.phase === 'playing' ? '摸打' : '决策'})</span>
        <span className={`compare-status-badge ${record.matchedRecommendation ? 'status-ok' : 'status-warn'}`}>
          {record.matchedRecommendation ? '🟢 契合推荐' : '🟡 有所分歧'}
        </span>
      </div>

      <div className="compare-grid">
        <div className="compare-column">
          <div className="compare-label">玩家实际选择</div>
          <div className="compare-value value-actual">{formatChoice(record.actualAction, record.actualTileKey)}</div>
        </div>
        <div className="compare-column">
          <div className="compare-label">AI 推荐最优解</div>
          <div className="compare-value value-recommend">
            {record.recommendedAction 
              ? formatChoice(record.recommendedAction, record.recommendedTileKey) 
              : '无推荐'}
          </div>
        </div>
      </div>

      <div className="compare-reason">
        <strong>教练分析：</strong>{record.reason}
      </div>
    </div>
  );
}
