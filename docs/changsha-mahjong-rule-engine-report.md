# 长沙麻将规则引擎 v0.1 开发报告

本报告总结了“长沙麻将规则引擎 v0.1”的开发成果。本项目旨在以 TypeScript 实现一个完全脱离 UI 与网络、具备高度可测试性与可配置性的核心游戏规则引擎，为后续游戏开发奠定扎实的基础。

## 已实现内容

项目结构完整补齐并实现了以下核心组件：

### 1. 类型定义 (`src/changsha-mahjong/types/`)
* **[tile.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/tile.ts)**：定义 Suit（万、筒、条）、Rank（1-9）与 Tile 结构（包含 instanceId 以支持唯一区分）。
* **[meld.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/meld.ts)**：定义 MeldType（吃、碰、明杠、补杠、暗杠）与 Meld（副牌面子）结构。
* **[player.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/player.ts)**：定义 Player 结构，包括手牌、吃碰杠、打出牌、累积分数、是否开门标识等。
* **[rule-config.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/rule-config.ts)**：定义规则配置（支持 `changsha_6_7` 与 `changsha_6_6` 计分模式，配置自摸分值、起手胡分数、杠牌分、扎鸟规则、开门点炮校验等）。
* **[score.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/score.ts)**：定义 `ScoreEvent`（包含来源、去向、分值和原由）与各类计分输入接口。
* **[game.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/types/game.ts)**：定义 `GameState` 与胡牌计算所需的 `HuCheckInput` 及 `HuResult`。

### 2. 核心引擎功能 (`src/changsha-mahjong/engine/`)
* **[tile-engine.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/tile-engine.ts)**：生成 108 张长沙麻将牌，提供牌面等价判断、排序与数量计数辅助函数。
* **[wall-engine.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/wall-engine.ts)**：支持伪随机洗牌（支持 deterministic seed 传入便于单元测试）以及发牌分配逻辑（庄家 14 张，闲家 13 张）。
* **[action-engine.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/action-engine.ts)**：校验吃、碰、明杠、补杠、暗杠的合法性并提取可用动作选项（如吃牌组合）。
* **[hu-checker.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/hu-checker.ts)**：
  * 利用回溯搜索高效判断标准的 `3n + 2` 胡牌组合。
  * 实现小胡 258 做将校验与没开门点炮限制逻辑。
  * 识别 12 种典型大胡（碰碰胡、将将胡、清一色、七小对、豪华七小对、杠上开花、抢杠胡、海底捞月、海底炮、全求人、天胡、地胡）。
* **[starting-hu-checker.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/starting-hu-checker.ts)**：识别起手胡（缺一色、板板胡、六六顺、四喜）。
* **[bird-engine.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/bird-engine.ts)**：提供鸟牌座次映射（159庄、26下、37对、48上）与鸟分加倍逻辑（点炮仅放炮人翻倍、自摸命中胡家全员翻倍、命中闲家对应人翻倍）。
* **[score-engine.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/engine/score-engine.ts)**：根据规则计算杠钱、起手胡分（含庄家加成）、胡牌基础分（支持 6_7 与 6_6 模式、大胡叠加）以及进行扎鸟后的最终积分加权。

---

## 测试文件与通过情况

我们使用 **Vitest** 框架编写了完全隔离的单元测试，覆盖了 7 个核心测试套件，共有 **61 个测试用例**（每个用例均包含多个断言，总断言数超 100 个），所有测试均已 **100% 成功通过**：

| 测试文件 | 覆盖的核心规则/功能 | 测试用例数 | 状态 |
| :--- | :--- | :---: | :---: |
| `tile-engine.test.ts` | 108张牌生成、花色与点数分布、唯一 ID、牌排序与计数等 | 6 | 通过 (Passed) |
| `wall-engine.test.ts` | 伪随机洗牌种子一致性、发牌手牌数（庄14闲13）、牌的守恒及去重 | 3 | 通过 (Passed) |
| `action-engine.test.ts` | 吃（仅上家/同花色顺子）、碰、直杠、补杠与暗杠合法性 | 8 | 通过 (Passed) |
| `hu-checker.test.ts` | 小胡及258做将、12类大胡识别、清一色+碰碰胡叠加、没开门限制等 | 20 | 通过 (Passed) |
| `starting-hu-checker.test.ts` | 缺一色、板板胡、六六顺、四喜、多起手胡共存识别 | 5 | 通过 (Passed) |
| `bird-engine.test.ts` | 扎鸟位置判定、点炮胡及自摸下不同中鸟情况的分数加权 | 8 | 通过 (Passed) |
| `score-engine.test.ts` | 小胡点炮/自摸、大胡（6/7 与 6/6）、大胡叠加、起手胡与庄家额外计分、扎鸟叠加 | 14 | 通过 (Passed) |

* **总测试用例数**：61 个
* **测试通过率**：100%
* **测试运行耗时**：~800ms

---

## 已知限制

1. **一炮多响未在本阶段直接合并输出**：当有多人胡同一张牌时，引擎提供了 `canHu` 的纯函数计算，但在高级游戏流程状态机（未实现）中，需要将这些单人结果收集起来进行最终的多响分数结算（例如“截胡”或“多响”规则配置）。
2. **状态管理**：本引擎仅为无状态的纯规则集合，不包含游戏局中的回放记录、超时托管或具体轮转状态机。

---

## 下一阶段建议

1. **状态机实现 (Game State Machine)**：基于当前纯规则引擎，设计并开发包含 Draw (摸牌)、Discard (出牌)、Action Priority (吃碰杠胡优先级决策阶段)、Score Settle (积分计算结算) 的游戏轮转状态机。
2. **AI 决策引擎 (Simple AI Player)**：实现基于当前可用行动（如 `getChiOptions`、碰杠胡决策）的启发式 AI 玩家。
3. **命令行版本 (CLI Demo)**：可编写一个简单的终端交互界面，演示玩家与 3 个 AI 进行对局，以验证引擎在完整对局周期中的行为正确性。
