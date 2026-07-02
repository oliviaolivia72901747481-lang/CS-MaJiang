# 长沙麻将多人联网版 v0.8.3 完成情况报告报告

## 一、阶段目标

本项目阶段完成了“v0.8.3：2–4 人可变人数局与可选 AI 模式”的核心研发与回归复核。我们将原本固定的 4 人联网麻将，重构为支持 2 人、3 人、4 人灵活开局，并支持真人玩家与可选 AI 的自由组合。本局游戏中的所有发牌、摸牌、吃碰杠胡动作、回合轮转、结算计分以及客户端视图，均围绕动态的 `activeSeats` 运行，非本局参与者的 `inactiveSeats`（空席位）完全不参与任何游戏与业务逻辑。

---

## 二、核心改造说明

### 1. `activeSeats` 数据结构与抽象
- 服务端新增 `src/changsha-mahjong-network/server/active-seats.ts` 公共工具模块。
- 实现了以下 8 个关于活跃席位计算的核心辅助函数：
  - `normalizeActiveSeats`
  - `assertValidActiveSeats`
  - `isActiveSeat`
  - `getNextActiveSeat`
  - `getPreviousActiveSeat`
  - `getActiveOpponents`
  - `getActivePlayerCount`
  - `assertActiveSeat`
- 完全杜绝了原有的 `(seat + 1) % 4` 环状下家算法，改由 `getNextActiveSeat(activeSeats, currentSeat)` 计算。2 人局下家即为对家，3 人局下家动态循环，4 人局向下兼容。

### 2. 服务端开局与 AI 补齐逻辑重构
- 扩展 `startOnlineRound` 接口，支持 `requestedPlayerCount` 和 `fillAIToPlayerCount` 参数。
- 支持房主随时添加单个机器人（`room:add-ai`）或一键补满到指定人数（`room:fill-ai`）。AI 只在用户明确操作时才加入，不再默认强制填满 4 人局。
- 增加开局规则权威校验：禁止 0 真人开局、禁止 1 真人 0 AI 开局、人数不在 2-4 人区间内拒绝开局。

### 3. 游戏与规则引擎适配
- **发牌逻辑**：`dealInitialHands` 仅将手牌派发给 `activeSeats`，庄家 14 张，闲家 13 张，非参与席位不发牌。牌墙牌种不裁剪，总数保持 108 守恒。
- **吃碰杠胡判断**：吃牌限制在 `getNextActiveSeat` 的下家，碰杠胡响应群体过滤为 `getActiveOpponents`。非参与席位的出牌和操作一律被 `validateNetworkAction` 校验拦截。
- **回合流转**：`moveToNextSeat` 逻辑严格基于 activeSeats。在进入海底捞月等特殊多阶段选择时，最大通过限制自动降低至本局活跃人数。
- **结算与鸟分**：`calculateGangScore` / `calculateStartingHuScore` / `calculateHuBaseScore` / `calculateFinalScoreWithBird` 全部由 `activeSeats` 过滤限制。自摸仅从活跃对手处计分，inactive 席位不增减分、不中鸟、不进排名。

### 4. PlayerVisibleView 与暗牌安全防护
- 重构 `buildPlayerVisibleView`，仅展示活跃玩家作为 opponents。
- 非本局参与的空座位不出现在 components 数据流中，其连接状态和手牌完全被物理隔离。
- 结算前严格对所有对手的暗牌进行逻辑隐藏，不输出 instanceId。

### 5. 退出/断线/重连/托管兼容
- 完美继承了 v0.8.2.2 确立的退出与重连逻辑体系。
- 仅对本局 `activeSeats` 且是真人的席位跟踪 socket 断连、进入 `reconnecting` 以及超时 `trustee`（AI 托管）流转，空席位或已退出的席位不做重连与离线检测，不占用多余的后台资源。

---

## 三、测试结果总结

本次开发过程中我们采取了“快速迭代模式 + 阶段全量回归”的测试策略。最终在代码合并完成后执行了全量测试：

1. **测试覆盖**
   - **原有测试**：656 个
   - **新增测试**：41 个（包括 `active-seats.test.ts`、`variable-player-start.test.ts`、`variable-player-deal.test.ts`、`variable-player-turn-order.test.ts`、`variable-player-actions.test.ts`、`variable-player-settlement.test.ts`、`variable-player-visible-view.test.ts`、`variable-player-ai-fill.test.ts`、`variable-player-reconnect-trustee.test.ts` 等专有文件）
   - **总测试数**：697 个

2. **全量测试通过情况**
   - `npm test` 运行结果：**697/697 tests passed** (100% 通过率)。

3. **类型与构建检查**
   - `npx tsc --noEmit` 成功运行，无任何语法、类型或严苛模式下的编译报错。
   - `npm run build` 成功输出生产构建，无任何编译及依赖链缺失报错。
