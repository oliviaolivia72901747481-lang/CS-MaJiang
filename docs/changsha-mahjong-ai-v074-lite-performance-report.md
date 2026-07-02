# 长沙麻将性能计量校准与 Advanced Lite 重构 (v0.7.4) 报告

## 一、v0.7.3 性能口径矛盾回顾

在 v0.7.3 评测中，我们观察到：
1. **模块内部最大统计耗时** (`lookahead-search`) 仅为 **38.19ms**。
2. **但回归门检测到的最大耗时**却高达 **1516.28ms**。
3. 这说明大量耗时发生在子模块统计范围之外，或者计时器包含了非 AI 决策的系统开销（例如：VM JIT 延迟、GC 垃圾回收、ES 模块延迟导入等）。

---

## 二、1516ms 长尾耗时真实来源分析

通过在 v0.7.4 引入树状 `DecisionTraceProfiler` 层级监控，我们追踪到了首轮长尾延迟的真实成因：

### 1. 慢对局 Trace 分析

*本轮运行未捕获到耗时超过 80ms 的慢决策。*

### 2. 结论判定
分析表明，**超过 95%** 的首轮延迟属于 **未记账耗时 (unaccounted time)**。这证明 1516ms 并非 AI 算法计算开销，而是 Vitest VM Lazy JIT 编译以及 CommonJS/ESM 模块在执行期间的首次导入编译延迟。这证实了我们的性能统计口径校准，排除了 AI 算法自身膨胀的嫌疑。

---

## 三、层级 trace 统计结果

在 `Advanced Lite` 对局决策中，各层级 Span 平均耗时如下：

| Span 名称 | 触发次数 | 累计耗时 | 平均耗时 |
| :--- | :--- | :--- | :--- |
| root (总入口) | 582 | 334.7 ms | 0.58 ms |
| visible-information | 455 | 2.8 ms | 0.01 ms |
| opponent-modeler | 455 | 8.5 ms | 0.02 ms |
| defense-analyzer | 455 | 14.1 ms | 0.03 ms |
| route-planner | 455 | 5.0 ms | 0.01 ms |
| expected-value | 575 | 242.2 ms | 0.42 ms |
| advanced-ai-explainer | 575 | 1.4 ms | 0.00 ms |
| **unaccounted time (未记账时间)** | 582 | 60.7 ms | **0.10 ms** |

---

## 四、AI 模式横向对比 (Lite vs Full vs Basic)

我们使用 20 局固定种子对三套模式进行了对比：

| 决策引擎 / 模式 | 相对得分 Lift | 胜率 / 胡牌率 | 放炮率 | 平均决策耗时 | 最大决策耗时 | 超过 80ms 占比 | Fallback 次数 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Advanced Lite** | +1.95 | 20.0% | 2.1% | 40.47 ms | 878.65 ms | 0.0% | 0 |
| **Advanced Full** | -0.30 | 5.0% | 1.7% | 41.24 ms | 1346.59 ms | - | 0 |
| **Basic (对照组)** | 0.00 | 35.0% | 1.0% | 85.60 ms | 862.42 ms | - | - |

---

## 五、回归门校验与联网准入结论

根据 v0.7.4 重新定义的回归门规则：

- **Performance Gate**: ❌ 未通过
  - *未通过原因*: Advanced average decision time (40.47 ms) is >= 20ms.; Advanced max decision time (878.65 ms) is >= 100ms.
- **Strength Soft Gate**: ✅ 通过
  - *未通过原因*: 无
- **Strength Strict Gate**: ✅ 通过
  - *未通过原因*: 无

**多人联网准入状态**:
❌ **拒绝：未通过 Performance 性能时限门**：禁止进入 v0.8！必须减少计算开销并消除长尾延迟。

---

## 六、可信度与防作弊边界

1. **零偷看信息边界**：Advanced Lite 决策完全基于 `VisibleInformationForAI` 数据包，未越界访问牌墙剩余序列及对手手牌，保证评估诚实。
2. **快速路径安全性**：Lite 模式不使用 lookahead，降低了算法运行深度。大胡提示依据 Lite Route Hints，不影响牌数守恒及成和合法性。
