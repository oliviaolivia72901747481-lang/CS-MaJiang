import React from 'react';
import { DiscardAdvice } from '../../changsha-mahjong/coach/coach-types.js';

export interface DiscardSuggestionPanelProps {
  suggestions: DiscardAdvice[];
  onSuggestionClick?: (tileKey: string) => void;
}

export function DiscardSuggestionPanel({ suggestions, onSuggestionClick }: DiscardSuggestionPanelProps) {
  if (!suggestions || suggestions.length === 0) {
    return <div className="no-suggestions">无可推荐的出牌</div>;
  }

  const getRiskClass = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'risk-badge-high';
      case 'medium': return 'risk-badge-medium';
      default: return 'risk-badge-low';
    }
  };

  const getRiskText = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return '高风险';
      case 'medium': return '中风险';
      default: return '低风险';
    }
  };

  return (
    <div className="discard-suggestions-panel">
      {suggestions.map((s, idx) => {
        const isBest = idx === 0;
        return (
          <div 
            key={s.tileKey} 
            className={`suggestion-item ${isBest ? 'suggestion-best' : ''}`}
            onClick={() => onSuggestionClick?.(s.tileKey)}
            title="点击可在手牌中标记此牌"
          >
            <div className="suggestion-row-top">
              <span className="suggestion-tile-name">
                {isBest && <span className="best-star">★ 推荐</span>}
                {s.tileName}
              </span>
              
              <span className={`risk-badge ${getRiskClass(s.riskLevel)}`}>
                {getRiskText(s.riskLevel)}
              </span>
            </div>
            
            <p className="suggestion-reason">{s.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
