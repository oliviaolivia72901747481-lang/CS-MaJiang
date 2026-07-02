import React, { useState } from 'react';
import { GameState } from '../../changsha-mahjong/types/game.js';
import {
  HandAdvice,
  DiscardAdvice,
  ActionAdvice,
  RiskAdvice,
} from '../../changsha-mahjong/coach/coach-types.js';
import { HintCard } from './HintCard.jsx';
import { EffectiveTilesView } from './EffectiveTilesView.jsx';
import { DiscardSuggestionPanel } from './DiscardSuggestionPanel.jsx';
import { RiskWarningPanel } from './RiskWarningPanel.jsx';

export interface CoachPanelProps {
  state: GameState;
  handAdvice: HandAdvice | null;
  discardAdvices: DiscardAdvice[];
  actionAdvices: ActionAdvice[];
  riskAdvices: RiskAdvice[];
  coachEnabled: boolean;
  onToggleCoach: () => void;
  onSuggestionClick?: (tileKey: string) => void;
}

export function CoachPanel({
  state,
  handAdvice,
  discardAdvices,
  actionAdvices,
  riskAdvices,
  coachEnabled,
  onToggleCoach,
  onSuggestionClick,
}: CoachPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    setCollapsed(prev => !prev);
  };

  const getShantenLabel = (shanten: number) => {
    if (shanten === -1) return '已胡牌';
    if (shanten === 0) return '听牌';
    return `${shanten}向听`;
  };

  return (
    <div className={`coach-panel-container ${collapsed ? 'coach-collapsed' : ''} ${!coachEnabled ? 'coach-disabled-view' : ''}`}>
      {/* Panel Header */}
      <div className="coach-panel-header" onClick={handleToggleCollapse}>
        <div className="header-title-block">
          <span className="header-icon-label">🎓</span>
          <span className="header-text-label">AI 陪练助手</span>
          {coachEnabled && handAdvice && (
            <span className="shanten-header-badge">
              {getShantenLabel(handAdvice.bestShanten)}
            </span>
          )}
        </div>

        <div className="header-actions-block" onClick={e => e.stopPropagation()}>
          <button 
            className={`btn-toggle-coach-mode ${coachEnabled ? 'btn-active' : 'btn-inactive'}`}
            onClick={onToggleCoach}
            title={coachEnabled ? '一键隐藏 AI 提示进行自主练习' : '开启 AI 提示教练'}
          >
            {coachEnabled ? '👁 提示开' : '🙈 提示关'}
          </button>
          
          <button className="btn-collapse-toggle-arrow" onClick={handleToggleCollapse}>
            {collapsed ? '＋' : '－'}
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {coachEnabled && !collapsed && (
        <div className="coach-panel-body">
          
          {/* 1. Shanten summary */}
          {handAdvice && (
            <div className="shanten-summary-box">
              <div className="shanten-metrics-row">
                <div className="metric-box">
                  <span className="box-title">普通胡</span>
                  <span className="box-val">{getShantenLabel(handAdvice.normalShanten)}</span>
                </div>
                <div className="metric-box">
                  <span className="box-title">七小对</span>
                  <span className="box-val">{getShantenLabel(handAdvice.qiXiaoDuiShanten)}</span>
                </div>
              </div>
              <p className="summary-text-p">{handAdvice.summary}</p>
            </div>
          )}

          {/* 2. Action Advice (Melds response) */}
          {actionAdvices && actionAdvices.length > 0 && (
            <HintCard title="吃碰杠过战术建议" icon="⚡">
              <div className="action-advices-list">
                {actionAdvices.map((adv, idx) => (
                  <div key={idx} className={`action-advice-item ${adv.recommend ? 'adv-rec' : 'adv-no-rec'}`}>
                    <div className="action-adv-header">
                      <span className="action-adv-name">
                        {adv.recommend ? '👉 ' : ''}
                        {adv.action === 'chi' ? '吃牌' : adv.action === 'peng' ? '碰牌' : adv.action === 'gang' ? '杠牌' : adv.action === 'hu' ? '胡牌' : '过牌'}
                      </span>
                      <span className="action-adv-status">
                        {adv.recommend ? '推荐' : '不推荐'}
                      </span>
                    </div>
                    <p className="action-adv-reason">{adv.reason}</p>
                  </div>
                ))}
              </div>
            </HintCard>
          )}

          {/* 3. Discard Suggestions */}
          {discardAdvices && discardAdvices.length > 0 && (
            <HintCard title="推荐打出的手牌 (玩家视角估计)" icon="💡">
              <DiscardSuggestionPanel 
                suggestions={discardAdvices} 
                onSuggestionClick={onSuggestionClick}
              />
            </HintCard>
          )}

          {/* 4. Risk warnings */}
          {riskAdvices && riskAdvices.length > 0 && (
            <HintCard title="手牌防守危险度 (根据当前牌河推测)" icon="🚨">
              <RiskWarningPanel risks={riskAdvices} />
            </HintCard>
          )}

          {/* 5. Effective Tiles */}
          {handAdvice && handAdvice.effectiveTileKeys && (
            <HintCard title="有效进张 (基于已公开牌扣减)" icon="🎯">
              <EffectiveTilesView 
                effectiveTileKeys={handAdvice.effectiveTileKeys} 
                state={state}
              />
            </HintCard>
          )}

        </div>
      )}

      {/* Disabled Practice View */}
      {(!coachEnabled) && !collapsed && (
        <div className="coach-practice-placeholder">
          <div className="lock-icon-art">🔒</div>
          <p>AI 提示已隐藏，当前为自主练习模式。</p>
          <button className="btn-enable-coach-btn" onClick={onToggleCoach}>
            开启 AI 陪练提示
          </button>
        </div>
      )}
    </div>
  );
}
