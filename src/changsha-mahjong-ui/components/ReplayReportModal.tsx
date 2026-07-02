import React, { useState } from 'react';
import { ReplayReport } from '../../changsha-mahjong/coach/coach-types.js';
import { buildReplayReportText } from '../../changsha-mahjong/coach/replay-report-builder.js';
import { DecisionCompareView } from './DecisionCompareView.jsx';

export interface ReplayReportModalProps {
  report: ReplayReport;
  onClose: () => void;
}

export function ReplayReportModal({ report, onClose }: ReplayReportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyText = async () => {
    const text = buildReplayReportText(report);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy report text:', err);
    }
  };

  const matchRate = report.totalDecisions > 0 
    ? ((report.matchedRecommendationCount / report.totalDecisions) * 100).toFixed(1) 
    : '100';

  const resultBadgeClass = report.roundResult === 'win' 
    ? 'res-win' 
    : report.roundResult === 'lose' ? 'res-lose' : 'res-draw';

  const resultLabel = report.roundResult === 'win' 
    ? '🏆 胜利' 
    : report.roundResult === 'lose' ? '❌ 失败' : '💨 流局';

  return (
    <div className="replay-modal-overlay">
      <div className="replay-modal-content">
        
        {/* Header */}
        <div className="replay-modal-header">
          <div className="header-left">
            <span className="header-icon">🎓</span>
            <h3>AI 麻将陪练复盘报告</h3>
          </div>
          <button className="btn-close-x" onClick={onClose}>&times;</button>
        </div>

        {/* Body */}
        <div className="replay-modal-body">
          
          {/* Summary Cards */}
          <div className="replay-summary-row">
            <div className={`summary-card-metric ${resultBadgeClass}`}>
              <span className="metric-label">对局结果</span>
              <span className="metric-val">{resultLabel}</span>
            </div>

            <div className="summary-card-metric">
              <span className="metric-label">AI 契合度</span>
              <span className="metric-val text-green">{matchRate}%</span>
            </div>

            <div className="summary-card-metric">
              <span className="metric-label">高险出牌</span>
              <span className={`metric-val ${report.riskyDiscardCount > 0 ? 'text-red' : ''}`}>
                {report.riskyDiscardCount} 次
              </span>
            </div>

            <div className="summary-card-metric">
              <span className="metric-label">积分变动</span>
              <span className={`metric-val ${report.playerScoreDelta > 0 ? 'text-green' : report.playerScoreDelta < 0 ? 'text-red' : ''}`}>
                {report.playerScoreDelta >= 0 ? `+${report.playerScoreDelta}` : report.playerScoreDelta}
              </span>
            </div>
          </div>

          <div className="coach-overall-eval">
            <h4>💡 教练综合评估</h4>
            <p>{report.summary}</p>
          </div>

          {/* Insights Section */}
          {report.insights && report.insights.length > 0 && (
            <div className="replay-section replay-insights-section" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--gold-accent)', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>🔍 局后深度诊断</h4>
              <div className="insights-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.insights.map((ins, idx) => {
                  const prefix = ins.type === 'realTimeKnown' ? '【当时可知】' : '【事后观察】';
                  const badgeColor = ins.type === 'realTimeKnown' ? 'var(--blue-active)' : 'var(--green-deal)';
                  return (
                    <div key={idx} className={`insight-item ${ins.type}`} style={{ fontSize: '13px', lineHeight: '1.5', padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.15)' }}>
                      <span className="insight-badge" style={{ color: badgeColor, fontWeight: 'bold', marginRight: '6px' }}>{prefix}</span>
                      <strong className="insight-title" style={{ color: '#eee', marginRight: '8px' }}>{ins.title}</strong>
                      <span className="insight-desc" style={{ color: '#ccc' }}>{ins.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Moments */}
          {report.keyMoments && report.keyMoments.length > 0 && (
            <div className="replay-section">
              <h4>🕒 关键时机回顾</h4>
              <ul className="key-moments-list">
                {report.keyMoments.map((moment, idx) => (
                  <li key={idx}>
                    <span className="moment-bullet">{idx + 1}</span>
                    <span className="moment-text">{moment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questionable Decisions */}
          {report.questionableDecisions && report.questionableDecisions.length > 0 && (
            <div className="replay-section">
              <h4>⚠️ 有争议决策分析 ({report.questionableDecisions.length})</h4>
              <div className="decisions-compare-list">
                {report.questionableDecisions.map((d, idx) => (
                  <DecisionCompareView key={idx} record={d} />
                ))}
              </div>
            </div>
          )}

          {/* Good Decisions */}
          {report.goodDecisions && report.goodDecisions.length > 0 && (
            <div className="replay-section">
              <h4>🌟 契合最优推荐 ({report.goodDecisions.length})</h4>
              <div className="decisions-compare-list">
                {report.goodDecisions.slice(0, 3).map((d, idx) => (
                  <DecisionCompareView key={idx} record={d} />
                ))}
              </div>
            </div>
          )}

          {/* Next Round Advice */}
          {report.nextRoundTips && report.nextRoundTips.length > 0 && (
            <div className="replay-section next-tips-section">
              <h4>🎯 下一局陪练建议</h4>
              <div className="next-tips-box">
                {report.nextRoundTips.map((tip, idx) => (
                  <div key={idx} className="tip-item-line">
                    <span className="tip-dot">▪</span>
                    <p className="tip-content-text">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="replay-modal-footer">
          <button className="btn-secondary btn-copy" onClick={handleCopyText}>
            {copied ? '✓ 已复制文本' : '📋 复制文本报告'}
          </button>
          
          <button className="btn-primary" onClick={onClose}>
            关闭并返回桌面复盘
          </button>
        </div>

      </div>
    </div>
  );
}
