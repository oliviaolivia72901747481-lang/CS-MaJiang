import React from 'react';
import { RiskAdvice } from '../../changsha-mahjong/coach/coach-types.js';

export interface RiskWarningPanelProps {
  risks: RiskAdvice[];
}

export function RiskWarningPanel({ risks }: RiskWarningPanelProps) {
  if (!risks || risks.length === 0) {
    return <div className="no-risks">手牌极为安全</div>;
  }

  const getRiskClass = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'risk-item-high';
      case 'medium': return 'risk-item-medium';
      default: return 'risk-item-low';
    }
  };

  const getRiskLabel = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return '危 🚨';
      case 'medium': return '平 ⚠️';
      default: return '安 🛡️';
    }
  };

  return (
    <div className="risk-warning-panel">
      <div className="risk-warning-list">
        {risks.map(r => (
          <div 
            key={r.tileKey} 
            className={`risk-warning-item ${getRiskClass(r.riskLevel)}`}
            title={r.reason}
          >
            <span className="risk-icon-label">{getRiskLabel(r.riskLevel)}</span>
            <span className="risk-tile-title">{r.tileName}</span>
            <span className="risk-score-value">值: {Math.round(r.riskScore)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
