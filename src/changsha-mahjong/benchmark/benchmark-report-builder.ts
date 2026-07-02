import { BenchmarkResult } from './benchmark-types.js';

export function buildBenchmarkReport(result: BenchmarkResult): string {
  const { totalRounds, completedRounds, drawRounds, playerMetrics, performance } = result;

  const basicMetrics = playerMetrics.filter(m => m.aiEngine === 'basic');
  const advMetrics = playerMetrics.filter(m => m.aiEngine === 'advanced');

  const basicTotalScore = basicMetrics.reduce((sum, m) => sum + m.scoreDelta, 0);
  const basicAvgScore = basicMetrics.length > 0 && completedRounds > 0 
    ? basicTotalScore / completedRounds / basicMetrics.length 
    : 0;

  const advTotalScore = advMetrics.reduce((sum, m) => sum + m.scoreDelta, 0);
  const advAvgScore = advMetrics.length > 0 && completedRounds > 0 
    ? advTotalScore / completedRounds / advMetrics.length 
    : 0;

  const scoreDelta = advAvgScore - basicAvgScore;

  // Rates for basic
  const basicWinCount = basicMetrics.reduce((sum, m) => sum + m.winCount, 0);
  const basicWinRate = basicMetrics.length > 0 && completedRounds > 0
    ? (basicWinCount / completedRounds / basicMetrics.length) * 100
    : 0;

  const basicDealInCount = basicMetrics.reduce((sum, m) => sum + m.dealInCount, 0);
  const basicDealInRate = basicMetrics.length > 0 && completedRounds > 0
    ? (basicDealInCount / completedRounds / basicMetrics.length) * 100
    : 0;

  // Rates for advanced
  const advWinCount = advMetrics.reduce((sum, m) => sum + m.winCount, 0);
  const advWinRate = advMetrics.length > 0 && completedRounds > 0
    ? (advWinCount / completedRounds / advMetrics.length) * 100
    : 0;

  const advDealInCount = advMetrics.reduce((sum, m) => sum + m.dealInCount, 0);
  const advDealInRate = advMetrics.length > 0 && completedRounds > 0
    ? (advDealInCount / completedRounds / advMetrics.length) * 100
    : 0;

  const advBigHuCount = advMetrics.reduce((sum, m) => sum + m.bigHuCount, 0);
  const advBigHuRate = advMetrics.length > 0 && completedRounds > 0
    ? (advBigHuCount / completedRounds / advMetrics.length) * 100
    : 0;

  const advZiMoCount = advMetrics.reduce((sum, m) => sum + m.ziMoCount, 0);
  const advZiMoRate = advMetrics.length > 0 && completedRounds > 0
    ? (advZiMoCount / completedRounds / advMetrics.length) * 100
    : 0;

  let conclusion = '';
  if (advMetrics.length > 0 && basicMetrics.length > 0) {
    if (scoreDelta > 2 && advDealInRate < basicDealInRate) {
      conclusion = 'Advanced AI 性能与避铳能力均优于 Basic AI。';
    } else {
      conclusion = 'Advanced AI 在当前参数下的优势尚不明显，建议继续调参优化。';
    }
  } else {
    conclusion = '缺乏对照组（四家均使用同种引擎），本次测试主要用于性能或性格对照基准。';
  }

  let warningStr = '';
  if (completedRounds < 15) {
    warningStr = '> [!WARNING]\n> 样本量有限，结果仅作为回归参考，不能视为统计显著结论。\n\n';
  }

  const playerRows = playerMetrics.map(m => {
    const winRate = completedRounds > 0 ? (m.winCount / completedRounds) * 100 : 0;
    const dealInRate = completedRounds > 0 ? (m.dealInCount / completedRounds) * 100 : 0;
    const avgScore = completedRounds > 0 ? m.scoreDelta / completedRounds : 0;
    return `| 玩家 ${m.seat} | ${m.aiEngine} | ${m.profile} | ${avgScore.toFixed(2)} | ${winRate.toFixed(1)}% | ${dealInRate.toFixed(1)}% |`;
  }).join('\n');

  return `# 长沙麻将 AI 强度评测与性能基准报告

${warningStr}## 一、评测概览

- **对局总数**: ${totalRounds}
- **完成局数**: ${completedRounds}
- **流局数**: ${drawRounds}
- **流局率**: ${completedRounds > 0 ? ((drawRounds / completedRounds) * 100).toFixed(1) : '0.0'}%

## 二、AI 强度对比统计

| 玩家 (Seat) | AI 引擎 | 性格配置 | 平均得分 | 胡牌率 | 放炮率 |
| :--- | :--- | :--- | :--- | :--- | :--- |
${playerRows}

### 综合对比摘要

- **Basic AI 平均得分**: ${basicAvgScore.toFixed(2)}
- **Advanced AI 平均得分**: ${advAvgScore.toFixed(2)}
- **Advanced AI 相对提升**: ${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(2)}
- **胡牌率对比**: Advanced AI (${advWinRate.toFixed(1)}%) vs Basic AI (${basicWinRate.toFixed(1)}%)
- **放炮率对比**: Advanced AI (${advDealInRate.toFixed(1)}%) vs Basic AI (${basicDealInRate.toFixed(1)}%)
- **Advanced AI 大胡率**: ${advBigHuRate.toFixed(1)}%
- **Advanced AI 自摸率**: ${advZiMoRate.toFixed(1)}%

## 三、性能与稳定性基准

- **总决策次数**: ${performance.totalDecisionCount}
- **平均决策耗时**: ${performance.averageDecisionMs.toFixed(2)} ms
- **最大决策耗时**: ${performance.maxDecisionMs.toFixed(2)} ms
- **超预算决策数 (>20ms)**: ${performance.overBudgetDecisionCount}
- **深度降级 (fallback) 次数**: ${performance.fallbackCount}

## 四、评测结论

**结论**: ${conclusion}
`;
}
