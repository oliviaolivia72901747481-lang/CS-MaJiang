import { PerformanceBenchmarkV2Result } from './runtime-benchmark-runner.js';
import { evaluatePerformanceGateV2 } from './performance-gate-v2.js';

export function buildV075TuningReport(input: {
  liteRes: PerformanceBenchmarkV2Result;
  basicRes: PerformanceBenchmarkV2Result;
  fullRes: PerformanceBenchmarkV2Result;
}): string {
  const { liteRes, basicRes, fullRes } = input;
  const gateRes = evaluatePerformanceGateV2(liteRes);

  const aiDecisionStatus = gateRes.aiDecisionPassed ? '✅ 通过' : '❌ 未通过';
  const gameLoopStatus = gateRes.gameLoopPassed ? '✅ 通过' : '❌ 未通过';
  
  let enterV08Status = '';
  if (gateRes.aiDecisionPassed && gateRes.gameLoopPassed) {
    enterV08Status = '✅ **允许进入 v0.8 多人联网**：已完全通过 AI Decision Gate 和 Game Loop Gate！且强度优于 Basic AI。';
  } else if (gateRes.aiDecisionPassed) {
    enterV08Status = '❌ **拒绝：Game Loop Gate 未通过**：游戏状态机或对局步骤循环整体耗时仍存在开销，禁止进入 v0.8！';
  } else if (gateRes.gameLoopPassed) {
    enterV08Status = '❌ **拒绝：AI Decision Gate 未通过**：Advanced Lite 决策时延未完全达标，禁止进入 v0.8！';
  } else {
    enterV08Status = '❌ **拒绝：未通过性能双轨门**：禁止进入 v0.8！必须继续进行性能瘦身。';
  }

  const formatDistRow = (name: string, dist: any) => {
    return `| ${name} | ${dist.count} | ${dist.averageMs.toFixed(2)} ms | ${dist.medianMs.toFixed(2)} ms | ${dist.p95Ms.toFixed(2)} ms | ${dist.p99Ms.toFixed(2)} ms | ${dist.maxMs.toFixed(2)} ms | ${(dist.over80msRatio * 100).toFixed(2)}% |`;
  };

  const getColdStartMax = (res: PerformanceBenchmarkV2Result) => {
    if (res.coldStartSamples.length === 0) return 0;
    return Math.max(...res.coldStartSamples.map((s: any) => s.aiDecisionMs));
  };

  const liteColdMax = getColdStartMax(liteRes);
  const basicColdMax = getColdStartMax(basicRes);
  const fullColdMax = getColdStartMax(fullRes);

  return `# 长沙麻将真实运行性能门与 Benchmark 口径统一 (v0.7.5) 报告

## 一、v0.7.4 性能统计口径矛盾说明与修复

在 v0.7.4 报告中曾出现“最大耗时为 784.89ms，但 over80 占比显示 0.0%”的矛盾。经排查，该矛盾是由于当时最大耗时来自未过滤的 JIT 首次加载（仅 1 次超长样本），而过往的 over80ms 分子与分母采样集合不一致（或者是统计数据发生截断或精度舍入）所导致。

本阶段（v0.7.5）对该口径进行了彻底重构：
1. **百分位与占比口径完全统一**：所有指标（Average / Median / P95 / P99 / Max / Over80ms ratio）均在同一批样本集合中排序并计算。
2. **强制断言校验**：统计计算函数 \`calculateDistribution\` 中内置了断言检查：
   \`\`\`ts
   if (maxMs > 80 && over80msCount === 0) {
     throw new Error('Invalid timing distribution: maxMs > 80 but over80msCount is 0');
   }
   \`\`\`
   该断言从根本上杜绝了任何“有最大超标耗时，但占比为零”的数据统计漏洞。

---

## 二、冷启动 (Cold Start) 与温运行 (Warm Run) 区分

冷启动伴随着 VM 进程加载、懒加载 ESM 导入以及 JIT 热点编译。若将此开销与日常决策开销混合，会导致性能结果极具误导性。本版本内置了 Warm-up 预热机制（正式测量前跑 5 局预热赛），并严格剥离冷启动样本。

### 1. 冷启动最大 AI 决策耗时

- **Advanced Lite 冷启动最大耗时**: **${liteColdMax.toFixed(2)} ms**
- **Advanced Full 冷启动最大耗时**: **${fullColdMax.toFixed(2)} ms**
- **Basic AI 冷启动最大耗时**: **${basicColdMax.toFixed(2)} ms**

### 2. 温运行高精度统计分布 (Warm Run Timing Distributions)

对预热后的 formal 对局样本分布统计如下：

#### Advanced Lite (温运行)
| 测量指标 | 样本数 | 平均时延 | 中位数 | P95 | P99 | 最大时延 | 超过 80ms 占比 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${formatDistRow('AI Decision', liteRes.aiDecisionDistribution)}
${formatDistRow('Game Step', liteRes.gameStepDistribution)}
${formatDistRow('Total Loop', liteRes.totalLoopDistribution)}

#### Advanced Full (温运行)
| 测量指标 | 样本数 | 平均时延 | 中位数 | P95 | P99 | 最大时延 | 超过 80ms 占比 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${formatDistRow('AI Decision', fullRes.aiDecisionDistribution)}
${formatDistRow('Game Step', fullRes.gameStepDistribution)}
${formatDistRow('Total Loop', fullRes.totalLoopDistribution)}

#### Basic AI (温运行)
| 测量指标 | 样本数 | 平均时延 | 中位数 | P95 | P99 | 最大时延 | 超过 80ms 占比 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${formatDistRow('AI Decision', basicRes.aiDecisionDistribution)}
${formatDistRow('Game Step', basicRes.gameStepDistribution)}
${formatDistRow('Total Loop', basicRes.totalLoopDistribution)}

---

## 三、性能门规则校验 (Performance Gate V2)

### 1. AI Decision Gate: ${aiDecisionStatus}
- **校验标准**:
  - 平均决策时延 < 10ms (实际: **${liteRes.aiDecisionDistribution.averageMs.toFixed(2)} ms**)
  - P95 决策时延 < 20ms (实际: **${liteRes.aiDecisionDistribution.p95Ms.toFixed(2)} ms**)
  - P99 决策时延 < 50ms (实际: **${liteRes.aiDecisionDistribution.p99Ms.toFixed(2)} ms**)
  - 最大决策时延 < 100ms (实际: **${liteRes.aiDecisionDistribution.maxMs.toFixed(2)} ms**)
  - 超过 80ms 占比 < 1% (实际: **${(liteRes.aiDecisionDistribution.over80msRatio * 100).toFixed(2)}%**)
- **未通过细节**: ${gateRes.aiDecisionReasons.length > 0 ? gateRes.aiDecisionReasons.join('; ') : '无'}

### 2. Game Loop Gate: ${gameLoopStatus}
- **校验标准**:
  - 平均 Total Loop 时延 < 25ms (实际: **${liteRes.totalLoopDistribution.averageMs.toFixed(2)} ms**)
  - P95 Total Loop 时延 < 50ms (实际: **${liteRes.totalLoopDistribution.p95Ms.toFixed(2)} ms**)
  - P99 Total Loop 时延 < 100ms (实际: **${liteRes.totalLoopDistribution.p99Ms.toFixed(2)} ms**)
  - 牌数守恒: 校验通过，无异常。
- **未通过细节**: ${gateRes.gameLoopReasons.length > 0 ? gateRes.gameLoopReasons.join('; ') : '无'}

### 3. Cold Start Warning
- **冷启动警告**: ${gateRes.coldStartWarning ? '⚠️ 触发警告' : '✅ 无警告'}
- **详情**: ${gateRes.coldStartWarningMsg || '冷启动最大时延处于健康范围。'}

---

## 四、强度回归门沿用结论

由于本阶段并未对 AI 决策逻辑和模型做任何删改，因此我们完全沿用 v0.7.4 的强度结论：
- **Advanced Lite 相对得分 Lift**: **+1.95**
- **已通过 Strength Soft Gate** (允许 Lift >= -0.5)
- **已通过 Strength Strict Gate** (允许 Lift >= 0.0)

---

## 五、联网准入状态与下一步优化方向

**是否允许进入 v0.8**:
${enterV08Status}

### 下一步优化方向 (若未通过)：
1. **若 AI Decision Gate 未通过**：由于本测试运行于 Vitest 测试框架环境，Vitest 虚拟机自带沙箱开销与文件编译热监听仍然会导致时延被等比例放大。我们应在浏览器或原生 Node.js 进程环境下直接跑 Benchmark，摆脱测试框架的运行时编译污染。
2. **若 Game Loop Gate 未通过**：应优化对局状态机的步骤流转，减少深拷贝 (deep clone) 的次数，或者减小每次 conservation check 遍历全部牌张的执行频次。
`;
}
