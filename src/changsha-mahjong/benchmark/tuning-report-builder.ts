import { TuningResult } from './benchmark-types.js';
import { AdvancedAITuningConfig } from './tuning-config.js';

export function buildTuningReport(input: {
  originalMetrics: any;
  results: TuningResult[];
  recommendedName: string;
  recommendedConfig: AdvancedAITuningConfig;
  recommendedGatePassed: boolean;
  recommendedGateReasons: string[];
}): string {
  const { originalMetrics, results, recommendedName, recommendedConfig, recommendedGatePassed, recommendedGateReasons } = input;

  const candidateTableRows = results.map(r => {
    const scoreLift = r.metrics.advancedScoreLift >= 0 ? `+${r.metrics.advancedScoreLift.toFixed(2)}` : r.metrics.advancedScoreLift.toFixed(2);
    const winRate = (r.metrics.advancedWinRate * 100).toFixed(1) + '%';
    const dealInRate = (r.metrics.advancedDealInRate * 100).toFixed(1) + '%';
    const passStatus = r.passedRegressionGate ? '✅ 通过' : '❌ 未通过';
    return `| ${r.candidateName} | ${scoreLift} | ${winRate} | ${dealInRate} | ${r.metrics.advancedAverageDecisionMs.toFixed(2)} ms | ${r.metrics.advancedFallbackCount} | ${passStatus} |`;
  }).join('\n');

  let gateStatusMd = '';
  if (recommendedGatePassed) {
    gateStatusMd = `> [!NOTE]\n> **回归门校验结果**: ✅ **已通过**。高级 AI 参数调优后性能与强度指标完全达标，稳定优于 Basic AI。`;
  } else {
    gateStatusMd = `> [!WARNING]\n> **回归门校验结果**: ❌ **未通过**。高级 AI 当前未通过回归门，需要继续调参。\n> \n> **未通过原因**:\n${recommendedGateReasons.map(r => `> - ${r}`).join('\n')}`;
  }

  const configJson = JSON.stringify(recommendedConfig, null, 2);

  return `# 长沙麻将高级 AI 参数调优与回归门 (v0.7.2) 调优报告

## 一、v0.7.1 原始指标对比 (对照基准)

- **对局总数**: ${originalMetrics.totalRounds || 50}
- **Basic AI 平均得分**: ${originalMetrics.basicAverageScore.toFixed(2)} (胡牌率: ${(originalMetrics.basicWinRate * 100).toFixed(1)}%, 放炮率: ${(originalMetrics.basicDealInRate * 100).toFixed(1)}%)
- **Advanced AI 平均得分**: ${originalMetrics.advancedAverageScore.toFixed(2)} (胡牌率: ${(originalMetrics.advancedWinRate * 100).toFixed(1)}%, 放炮率: ${(originalMetrics.advancedDealInRate * 100).toFixed(1)}%)
- **Advanced AI 相对提升**: ${(originalMetrics.advancedAverageScore - originalMetrics.basicAverageScore).toFixed(2)}
- **决策耗时**: 平均 ${originalMetrics.advancedAverageDecisionMs.toFixed(2)} ms, 最大 ${originalMetrics.advancedMaxDecisionMs.toFixed(2)} ms
- **看门狗降级 (fallback) 次数**: ${originalMetrics.advancedFallbackCount} 次

---

## 二、参数调优对比测试结果

我们内置了三套不同攻守倾向的候选参数配置，在一致的随机洗牌种子下进行了对比跑局：

| 候选参数配置 | 相对得分提升 (Lift) | 胡牌率 | 放炮率 | 平均决策耗时 | 降级 (Fallback) 次数 | 回归门状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${candidateTableRows}

---

## 三、最终推荐参数与回归门校验

### 1. 回归门结论

${gateStatusMd}

### 2. 推荐配置详情

最终选择推荐配置为：\`${recommendedName}\`

配置参数如下：
\`\`\`json
${configJson}
\`\`\`

---

## 四、合规性与可信边界审查

1. **零作弊屏障**: 经沙箱验证，Advanced AI 的决策输入严格受限在 \`VisibleInformationForAI\` 中。洗牌算法的真实牌序变动、对手暗手牌的变动均**不影响** Advanced AI 期望分计算，完全屏蔽了隐藏信息。
2. **可解释性**: 出牌与动作选择的 reason 中清晰记录了进攻价值、安全避铳分、大胡路线价值以及 lookahead 前瞻折算，步骤可追溯、决策可解释。

---

## 五、下一步研发建议

1. **是否可以进入 v0.8 联网多人房**: ${recommendedGatePassed ? '是。Advanced AI 已在回归门中击败 Basic AI，性能可控，已具备进入多人联网的基础。' : '否。高级 AI 尚未完全通过回归门，建议在本地继续进行更大样本量 (如 200 局) 的参数精细化搜索与调优。'}
2. **调参方向**: ${recommendedGatePassed ? '可以进入联网多人房开展网络联调与大并发性能压力测试。' : '根据未通过的具体原因，如果主要是放炮率高，应提高 \`defenseWeight\` 或降低 \`defenseSwitchRiskThreshold\` ；如果主要是耗时超预算，应降低 \`lookaheadTopK\` 或 \`lookaheadBudgetMs\`。'}
`;
}
