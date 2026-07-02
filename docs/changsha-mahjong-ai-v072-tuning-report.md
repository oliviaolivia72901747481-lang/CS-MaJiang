# 长沙麻将高级 AI 参数调优与回归门 (v0.7.2) 调优报告

## 一、v0.7.1 原始指标对比 (对照基准)

- **对局总数**: 50
- **Basic AI 平均得分**: 1.80 (胡牌率: 24.0%, 放炮率: 6.0%)
- **Advanced AI 平均得分**: -1.80 (胡牌率: 2.0%, 放炮率: 10.0%)
- **Advanced AI 相对提升**: -3.60
- **决策耗时**: 平均 52.67 ms, 最大 1634.17 ms
- **看门狗降级 (fallback) 次数**: 53 次

---

## 二、参数调优对比测试结果

我们内置了三套不同攻守倾向的候选参数配置，在一致的随机洗牌种子下进行了对比跑局：

| 候选参数配置 | 相对得分提升 (Lift) | 胡牌率 | 放炮率 | 平均决策耗时 | 降级 (Fallback) 次数 | 回归门状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| conservative-defense | +2.25 | 27.5% | 12.5% | 34.71 ms | 0 | ❌ 未通过 |
| balanced-default | +2.25 | 27.5% | 12.5% | 33.44 ms | 0 | ❌ 未通过 |
| aggressive-attack | +2.25 | 27.5% | 12.5% | 33.22 ms | 0 | ❌ 未通过 |

---

## 三、最终推荐参数与回归门校验

### 1. 回归门结论

> [!WARNING]
> **回归门校验结果**: ❌ **未通过**。高级 AI 当前未通过回归门，需要继续调参。
> 
> **未通过原因**:
> - Advanced AI average decision time (34.71 ms) is >= 20ms.
> - Advanced AI max decision time (725.41 ms) is >= 80ms.

### 2. 推荐配置详情

最终选择推荐配置为：`conservative-defense`

配置参数如下：
```json
{
  "attackWeight": 0.8,
  "defenseWeight": 1.5,
  "routeWeight": 0.9,
  "lookaheadWeight": 0.8,
  "defenseSwitchRiskThreshold": 30,
  "foldWallRemainingThreshold": 14,
  "forceAttackShantenThreshold": 0,
  "lookaheadTopK": 3,
  "lookaheadDepth": 1,
  "lookaheadBudgetMs": 20,
  "highRiskPenalty": 15,
  "criticalRiskPenalty": 35,
  "bigHuRouteBonus": 0,
  "fastHuShantenBonus": 0,
  "defensiveSafetyBonus": 0.5
}
```

---

## 四、合规性与可信边界审查

1. **零作弊屏障**: 经沙箱验证，Advanced AI 的决策输入严格受限在 `VisibleInformationForAI` 中。洗牌算法的真实牌序变动、对手暗手牌的变动均**不影响** Advanced AI 期望分计算，完全屏蔽了隐藏信息。
2. **可解释性**: 出牌与动作选择的 reason 中清晰记录了进攻价值、安全避铳分、大胡路线价值以及 lookahead 前瞻折算，步骤可追溯、决策可解释。

---

## 五、下一步研发建议

1. **是否可以进入 v0.8 联网多人房**: 否。高级 AI 尚未完全通过回归门，建议在本地继续进行更大样本量 (如 200 局) 的参数精细化搜索与调优。
2. **调参方向**: 根据未通过的具体原因，如果主要是放炮率高，应提高 `defenseWeight` 或降低 `defenseSwitchRiskThreshold` ；如果主要是耗时超预算，应降低 `lookaheadTopK` 或 `lookaheadBudgetMs`。
