# 长沙麻将基础 AI 策略 v0.3 完成情况报告

## 已实现模块
- **ai-types.ts**: 定义了 AI 相关的类型和接口，包括 `AIProfile`、`TileEvaluation`、`HandEvaluation`、`AIDecision`。
- **ai-profiles.ts**: 实现了 4 种性格：快胡型 (`fastHu`)、大胡型 (`bigHu`)、防守型 (`defensive`)、均衡型 (`balanced`) 的权重配置。
- **shanten-calculator.ts**: 实现了普通向听数（回溯法）与七小对向听数的计算，支持听牌返回 0 和已胡牌返回 -1。
- **hand-evaluator.ts**: 实现了手牌整体评估，计算有效进张、搭子、对子、孤张数量，并评估清一色、碰碰胡、七小对的潜力。
- **tile-value-evaluator.ts**: 枚举手牌，计算各张牌的打出价值和保留价值，优先打出孤张、边张，结合性格保留 258 牌与对子。
- **risk-evaluator.ts**: 评估舍牌的危险度（0-100分），支持绝张安全、已打同类牌安全（Gen安全）、中后期生张中张加分、以及某家可能做清一色时的门子生张风险加分。
- **action-decision-engine.ts**: 评估吃、碰、杠、过动作的相对收益，具有“有胡必胡”最高优先级，防守型 AI 限制短手牌下的碰/杠操作。
- **ai-player.ts**: 提供了统一的接口 `chooseAIDiscard` 和 `chooseAIAction`，完美对接状态机。

## 修改模块
- **bot-controller.ts**: 接入新的 AI Player 决策逻辑，支持不同 AI Profile 的分配，当异常时能安全回退到最小 Bot 策略，并在对局中收集记录决策原因。
- **console-simulator.ts**: 修改 `simulateOneRound` 选项，支持传参指定不同 AI 性格 profile 配置。
- **game-log.ts**: 修改 `addLog`，支持在日志中动态附加 AI 决策的详细 `reason`（例如：规避高风险牌、孤张优先打出、做清一色等）。
- **game-engine.ts**: 修改 `stepGame` 中的 playing 阶段手牌张数断言，将固定的 14 张校验改为了适应已吃/碰/杠副露的 $14 - 3 \times \text{melds.length}$，防止状态机在 AI 碰吃杠后崩溃。
- **player.ts**: `Player` 接口新增可选属性 `aiProfile?: string`。

## 测试文件
- **shanten-calculator.test.ts**: 13 个测试通过。
- **hand-evaluator.test.ts**: 7 个测试通过。
- **tile-value-evaluator.test.ts**: 10 个测试通过。
- **risk-evaluator.test.ts**: 10 个测试通过。
- **action-decision-engine.test.ts**: 10 个测试通过。
- **ai-player.test.ts**: 3 个测试通过。
- 加上原有的 90 个测试和 simulator 测试，总共有 141 个测试。

## 测试数量
- **原有测试**: 90 个
- **新增测试**: 51 个
- **总测试**: 141 个
- **Vitest 通过情况**: 全部 141 个测试通过。

## 关键能力
- **是否能计算向听**: 是 (普通向听与七小对向听)
- **是否能评估有效进张**: 是 (虚拟进张法)
- **是否能选择合理出牌**: 是 (手牌出牌价值排序，孤张优先，保留对子与将)
- **是否能判断吃碰杠**: 是 (回溯吃碰后手牌的向听提升情况与性格加成)
- **是否能基础防守**: 是 (Gen安全，绝张安全，防守性格中后期规避生张)
- **是否支持不同 AI 性格**: 是 (支持 fastHu, bigHu, defensive, balanced)
- **是否能完整跑完一局**: 是
- **是否保持牌数守恒**: 是 (全流程包含结算扎鸟阶段，108 张牌完美守恒)

## 已知限制
- **是否仍然不是高手 AI**: 是 (无深层防守和深度读牌)
- **是否尚未使用搜索算法**: 是
- **是否尚未使用大模型**: 是
- **是否尚未接入 UI**: 是 (本阶段为核心规则和 AI 闭环)

## 下一阶段建议
- **v0.4**: 浏览器可玩 UI (Canvas / 3D / HTML5 交互)
- **v0.5**: AI 提示与复盘分析辅助功能
- **v0.6**: 更强 AI：加入蒙特卡洛树搜索 (MCTS) 或启发式的高级防守防铳算法
