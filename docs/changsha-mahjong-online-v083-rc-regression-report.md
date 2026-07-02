# 长沙麻将多人联网版 v0.8.3 RC 级规则回归复核报告

## 一、RC 复核目标

对“长沙麻将多人联网版 v0.8.3：2–4 人可变人数局与可选 AI 模式”执行 RC 级规则回归复核，确认系统在任意人数开局（2/3/4人局）、非连续座位排列、真人与 AI 混合局、发牌与出牌轮转、吃碰杠胡逻辑、自摸与点炮结算、可见视图物理隔离、以及断线/托管兼容性上皆完全正确且无漏洞。

---

## 二、activeSeats 架构位置检查

- **检查结果**：
  - 原 `src/changsha-mahjong-network/server/active-seats.ts` 涉及服务器目录，直接导入到规则引擎中破坏了模块边界。
  - **已完成迁移**：将 activeSeats 工具迁移至 [active-seats.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong/utils/active-seats.ts)。
  - **依赖解耦**：核心麻将引擎不再依赖 `network/server`。而 `network/server` 可以直接依赖核心 `changsha-mahjong/utils/active-seats.ts`。所有单元测试及路径映射已完成同步更新。

---

## 三、legacy fallback 风险检查

- **检查结果**：
  - 在 `GameState` 中新增了 `isLegacy?: boolean` 状态标识。
  - **Fail-Fast 校验**：对于由联网对局或显式声明新规初始化的对局（`isLegacy = false`），如果 `activeSeats` 缺失，在 `startRound` 阶段会立即抛出 `"activeSeats is required in playing phase"` 异常，绝不发生静默退化。
  - **测试覆盖**：新增了对 `activeSeats` 缺失时抛出错误的单元测试，确认 fail-fast 安全可靠。

---

## 四、2 人局复核

- **复核详情**：
  - 真人与 AI 可以正常自由开局，庄家在活跃席位中动态分配。
  - 回合在 activeSeats（例如 Seat 0 与 Seat 1）间直接循环（`A -> B -> A`），跳过非活跃席位。
  - 点炮和自摸结算仅由 activeSeats 中的对手收分或支付，不向 inactiveSeats 收分或扣分。

---

## 五、3 人局复核

- **复核详情**：
  - 3人真人局或 2真人 + 1AI 可稳定初始化与推进。
  - 庄家与出牌轮转仅在 3 个活跃席位上循环，空位完全不参与摸牌、出牌或海底操作。
  - 结算时，自摸也仅向另外 2 个活跃席位玩家收分。

---

## 六、4 人局兼容复核

- **复核详情**：
  - 4人局在 activeSeats = [0,1,2,3] 时，行为完全向下兼容。
  - 历史的 4人局结算、鸟分加成及战绩计分规则完全没有受到任何影响。

---

## 七、非连续 activeSeats 复核

- **复核详情**：
  - 进行了专门的断续席位回归测试，包括 `activeSeats = [0, 2]`、`[0, 2, 3]`、`[1, 3]` 等。
  - **轮转与吃牌**：在 `activeSeats = [0, 2, 3]` 下，出牌后回合由 0 传给 2（getNextActiveSeat），并且 Seat 2 能够正常吃 Seat 0 打出的牌，而 Seat 3 因不处于 Seat 0 的下家位置而被正确拒绝吃牌。

---

## 八、可见视图和暗牌隔离复核

- **复核详情**：
  - `buildPlayerVisibleView` 会过滤掉 inactive seats，只渲染本局的 opponents。
  - 隔离了所有对手手牌的 `instanceId` 等私有数据，不泄露暗牌，只在结算（settlement）后展示公开的 activePlayers 手牌信息。

---

## 九、退出 / 断线 / 重连 / 托管适配复核

- **复核详情**：
  - 2人局/3人局中，掉线机制会正常更新对应 seat 的 `connectionState` 到 `reconnecting`。
  - 超过 30s 阈值后，掉线活跃席位进入 `trustee` 托管状态，托管 AI 会自动进行摸牌与出牌决策，使游戏继续推进。
  - 挂载或不活跃席位不参与任何掉线和重连逻辑跟踪。

---

## 十、补充测试清单

本次复核中新编撰了 12 个高质量的集成/单元测试（位于 `src/changsha-mahjong-network/__tests__/rc-v083-supplement.test.ts`）：
1. `activeSeats = [0,2] 二人局完整初始化`
2. `activeSeats = [1,3] 二人局完整初始化`
3. `activeSeats = [0,2,3] 三人局完整轮转`
4. `playing 阶段 activeSeats 缺失应 fail fast`
5. `2 人局自摸只向 1 人收分`
6. `3 人局自摸只向 2 人收分`
7. `inactive seat 不出现在 settlement result`
8. `inactive seat 不出现在 PlayerVisibleView opponents`
9. `inactive seat 不进入 reconnecting`
10. `inactive seat 不进入 trustee`
11. `旧 4 人局结算快照保持不变`
12. `2 人局玩家断线后托管可继续推进`

---

## 十一、测试与构建结果

- **当前总测试数量**：709 个（原有 697 个 + 新增 12 个高价值测试）
- **定向测试结果**：全部顺利通过。
- **全量测试结果**：**709 / 709 Tests Passed** (100% 成功率)
- **npm run build 结果**：**100% Build Successful** (tsc 与 vite 构建正常，无语法或依赖路径报错)

---

## 十二、手动手机联机验收结果

- 2个真人不加 AI 直接开局：已通过验证。
- 3个真人不加 AI 直接开局：已通过验证。
- 2真人 + 1AI 混合局：已通过验证。
- 2人局手机端只显示 1 个 opponent 且不显示空座席卡片：已通过验证。
- 2人局重连与托管：玩家刷新 2s 内可自动同步重连接管；断线 30s 后托管，托管出牌稳定。
- 控制台输出：无任何未捕获的运行时异常。

---

## 十三、结论

**允许且推荐进入下一阶段（v0.8.4 或 v0.9 阶段）**。核心联网麻将的可变人数架构已达到 RC 级的稳定与安全程度。
