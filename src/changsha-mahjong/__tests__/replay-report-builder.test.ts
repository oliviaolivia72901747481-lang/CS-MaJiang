import { describe, it, expect } from 'vitest';
import { buildReplayReportText } from '../coach/replay-report-builder.js';
import { ReplayReport } from '../coach/coach-types.js';

describe('replay-report-builder.ts tests', () => {
  const baseReport: ReplayReport = {
    roundResult: 'win',
    playerScoreDelta: 10,
    totalDecisions: 2,
    matchedRecommendationCount: 2,
    riskyDiscardCount: 0,
    goodDecisions: [
      {
        step: 2,
        phase: 'playing',
        seat: 0,
        actualAction: 'discard',
        actualTileKey: 'wan_5',
        recommendedTileKey: 'wan_5',
        matchedRecommendation: true,
        reason: '出牌顺畅。',
      }
    ],
    questionableDecisions: [],
    keyMoments: ['第 2 步胡牌获胜！'],
    summary: '获胜总结。',
    nextRoundTips: ['下局多留神'],
  };

  it('1. should construct comprehensive report text', () => {
    const text = buildReplayReportText(baseReport);
    expect(text).toContain('=== 🎓 长沙麻将 AI 教练局后复盘报告 ===');
    expect(text).toContain('🏆 对局获胜 (Win)');
    expect(text).toContain('【AI推荐匹配率】: 100.0%');
  });

  it('2. should format lose outcome properly', () => {
    const report: ReplayReport = {
      ...baseReport,
      roundResult: 'lose',
      playerScoreDelta: -6,
    };
    const text = buildReplayReportText(report);
    expect(text).toContain('❌ 对局失败 (Lose)');
    expect(text).toContain('-6 分');
  });

  it('3. should format draw outcome properly', () => {
    const report: ReplayReport = {
      ...baseReport,
      roundResult: 'draw',
      playerScoreDelta: 0,
    };
    const text = buildReplayReportText(report);
    expect(text).toContain('💨 对局流局 (Draw)');
    expect(text).toContain('0 分');
  });

  it('4. should list questionable decisions when present', () => {
    const report: ReplayReport = {
      ...baseReport,
      questionableDecisions: [
        {
          step: 5,
          phase: 'playing',
          seat: 0,
          actualAction: 'discard',
          actualTileKey: 'wan_1',
          recommendedTileKey: 'tiao_9',
          matchedRecommendation: false,
          reason: '不推荐此张。',
        }
      ]
    };
    const text = buildReplayReportText(report);
    expect(text).toContain('【有争议/待改进决策】');
    expect(text).toContain('打出 一万');
    expect(text).toContain('AI 推荐 [打出 九条]');
  });

  it('5. should display key moments numbers', () => {
    const text = buildReplayReportText(baseReport);
    expect(text).toContain('1. 第 2 步胡牌获胜！');
  });
});
