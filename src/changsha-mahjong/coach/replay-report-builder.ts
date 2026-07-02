import { ReplayReport } from './coach-types.js';
import { getTileChineseName } from './hand-advisor.js';

export function buildReplayReportText(report: ReplayReport): string {
  const resultText = report.roundResult === 'win' 
    ? '🏆 对局获胜 (Win)' 
    : report.roundResult === 'lose' 
      ? '❌ 对局失败 (Lose)' 
      : '💨 对局流局 (Draw)';

  const matchRate = report.totalDecisions > 0 
    ? ((report.matchedRecommendationCount / report.totalDecisions) * 100).toFixed(1) 
    : '100';

  let txt = `=== 🎓 长沙麻将 AI 教练局后复盘报告 ===\n`;
  txt += `【对局结果】: ${resultText}\n`;
  txt += `【积分变动】: ${report.playerScoreDelta >= 0 ? `+${report.playerScoreDelta}` : report.playerScoreDelta} 分\n`;
  txt += `【决策数量】: ${report.totalDecisions} 次\n`;
  txt += `【AI推荐匹配率】: ${matchRate}%\n`;
  txt += `【高风险出牌次数】: ${report.riskyDiscardCount} 次\n\n`;

  txt += `【复盘总结】:\n${report.summary}\n\n`;

  if (report.insights && report.insights.length > 0) {
    txt += `【局后深度诊断】:\n`;
    report.insights.forEach(ins => {
      const prefix = ins.type === 'realTimeKnown' ? '【当时可知】' : '【事后观察】';
      txt += `  - ${prefix}${ins.title}: ${ins.description}\n`;
    });
    txt += `\n`;
  }

  if (report.keyMoments && report.keyMoments.length > 0) {
    txt += `【关键转折点】:\n`;
    report.keyMoments.forEach((m, idx) => {
      txt += `  ${idx + 1}. ${m}\n`;
    });
    txt += `\n`;
  }

  if (report.goodDecisions && report.goodDecisions.length > 0) {
    txt += `【优秀决策展示】:\n`;
    report.goodDecisions.slice(0, 3).forEach(d => {
      const tileStr = d.actualTileKey ? `打出 ${getTileChineseName(d.actualTileKey)}` : d.actualAction;
      txt += `  - 第 ${d.step} 步，实际选择 [${tileStr}]。AI评价: ${d.reason}\n`;
    });
    txt += `\n`;
  }

  if (report.questionableDecisions && report.questionableDecisions.length > 0) {
    txt += `【有争议/待改进决策】:\n`;
    report.questionableDecisions.slice(0, 3).forEach(d => {
      const actualTileStr = d.actualTileKey ? `打出 ${getTileChineseName(d.actualTileKey)}` : d.actualAction;
      const recTileStr = d.recommendedTileKey ? `打出 ${getTileChineseName(d.recommendedTileKey)}` : d.recommendedAction;
      txt += `  - 第 ${d.step} 步，实际选择 [${actualTileStr}]，而 AI 推荐 [${recTileStr}]。\n`;
      txt += `    AI解析: ${d.reason}\n`;
    });
    txt += `\n`;
  }

  if (report.nextRoundTips && report.nextRoundTips.length > 0) {
    txt += `【下一局改进建议】:\n`;
    report.nextRoundTips.forEach((tip, idx) => {
      txt += `  ${idx + 1}. ${tip}\n`;
    });
  }

  return txt;
}
