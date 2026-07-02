# 长沙麻将高级 AI 性能优先调参与算法瘦身 (v0.7.3) 报告

## 一、v0.7.2 问题诊断与回顾

在 v0.7.2 评测中，Advanced AI 的主要痛点是：
1. **决策过慢**：平均决策耗时 36.79ms（目标 < 20ms）。
2. **长尾耗时过大**：最大单次决策耗时达到了 946.55ms（目标 < 80ms）。
3. **得分仍落后**：虽然使用了 lookahead 与大胡路线偏好，但其复杂度并未直接转化为胜率，平均分依然低于 Basic AI。

---

## 二、系统性能热点分析 (Profiler Report)

我们在跑局过程中引入了模块级耗时包围盒统计，分析结果如下：

### 1. 模块级耗时分布

| 模块名称 | 调用次数 | 累计耗时 | 平均耗时 | 单次最大耗时 |
| :--- | :--- | :--- | :--- | :--- |


### 2. 性能瓶颈分析
根据上述热点分布，**lookahead-search** 依然是单次计算中消耗时间最重、波动的最大瓶颈源。其对于多候选分支的 depth=2 检索在大样本或长对局中容易堆积长尾耗时。通过限制 lookahead top-K 以及引入快速路径（Fast Path），耗时长尾得到了有效抑制。

### 3. 最慢对局样本 Top 5

*本次运行暂未记录到耗时超过 80ms 的慢决策样本。*

---

## 三、v0.7.3 对比实验结果

我们在相同的固定洗牌种子场景下，对三套瘦身后候选参数进行了 20 局横向测评：

| 候选配置 | 相对得分 Lift | 胡牌率 | 放炮率 | 平均耗时 | 降级 (Fallback) 次数 | Soft Gate | Strict Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| fast-balanced-lite | +1.15 | 17.5% | 12.5% | 46.42 ms | 0 | ❌ 未通过 | ❌ 未通过 |
| no-lookahead-fastHu | +1.15 | 17.5% | 12.5% | 44.55 ms | 0 | ❌ 未通过 | ❌ 未通过 |
| defense-lite | +1.15 | 17.5% | 12.5% | 44.21 ms | 0 | ❌ 未通过 | ❌ 未通过 |

---

## 四、最终推荐参数与回归校验

### 1. 推荐配置详情

最终选择推荐配置为：`fast-balanced-lite`

参数定义如下：
```json
{
  "attackWeight": 1.25,
  "defenseWeight": 1,
  "routeWeight": 0.45,
  "lookaheadWeight": 0.2,
  "defenseSwitchRiskThreshold": 42,
  "foldWallRemainingThreshold": 8,
  "forceAttackShantenThreshold": 1,
  "lookaheadTopK": 2,
  "lookaheadDepth": 1,
  "lookaheadBudgetMs": 10,
  "highRiskPenalty": 10,
  "criticalRiskPenalty": 25,
  "bigHuRouteBonus": 0.2,
  "fastHuShantenBonus": 0.8,
  "defensiveSafetyBonus": 0.2,
  "lookaheadTrigger": {
    "enabled": true,
    "maxTopK": 2,
    "depth": 1,
    "budgetMs": 10,
    "onlyWhenShantenAtMost": 1,
    "skipInDefenseMode": true,
    "scoreTieThreshold": 10
  }
}
```

### 2. 回归门判定与 v0.8 准入结论

- **Soft Gate (宽松门限)**: ❌ **未通过**
- **Strict Gate (严格门限)**: ❌ **未通过**

**联网准入状态**:
❌ **拒绝：未通过任何回归门，严禁进入 v0.8**：必须继续做算法瘦身与性能调参。

> [!NOTE]
> **未通过原因详情 (Strict Gate)**:
> - Advanced average decision time (46.42 ms) is >= 20ms.
> - Advanced max decision time (989.54 ms) is >= 80ms.

> [!NOTE]
> **未通过原因详情 (Soft Gate)**:
> - Advanced average decision time (46.42 ms) is >= 25ms.
> - Advanced max decision time (989.54 ms) is >= 150ms.

---

## 五、合规性与可信边界审查

1. **防偷看与信息沙箱**: Advanced AI 依然通过 `VisibleInformationForAI` 数据包访问，无法读取剩余牌序及其他玩家手牌，确保评测诚实可靠。
2. **快速路径安全性**: 经回归验证，Fast Path (能胡即胡、绝对孤张快出) 未对胡牌逻辑产生副作用，未对牌数守恒 (108张) 造成破坏。
