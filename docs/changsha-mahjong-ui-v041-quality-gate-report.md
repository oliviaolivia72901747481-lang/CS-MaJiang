# 长沙麻将浏览器 UI v0.4.1 可玩性质量门审计报告

本阶段对单机浏览器版本进行了细致的稳定性与交互防御审计，确保用户在极端交互（高频狂刷按钮、非自己回合强行出牌、结算期操作等）下，前端状态机和后端数据引擎依然保持高稳定性。

---

## 检查与修复内容清单

### 1. 重复点击保护 (Duplicate Click Protection)
- **现状/问题**：在 React 异步渲染周期内，若用户极快地连续双击或多次点击“出牌”或“吃碰杠”，可能触发多次事件处理器。
- **审计与修复**：在 `useMahjongGame` 钩子中新增了一个同步的 `isActionBusyRef = useRef(false)` 忙标识锁。在执行打牌和吃碰杠开始时立即将其置为 `true`，并利用 React 的 `useEffect` 在 `state` 渲染刷新后自动恢复为 `false`，从而在 closure 级别成功拦截所有高频二次点击动作。
- **验证**：编写测试 `should protect against duplicate discard clicks`，连续同步执行两次 `discardSelectedTile`，手牌数仅被扣减一次，完美拦截。

### 2. 非法动作保护 (Illegal Action Protection)
- **现状/问题**：非当前回合或等待响应阶段，点击出牌仍被尝试执行。
- **审计与修复**：
  - `discardSelectedTile` 增加了前置断言：必须满足 `state.phase === 'playing' && state.currentSeat === 0`。
  - `performHumanAction` 增加了动作合法性检测：所提交的战术动作必须匹配当前可用动作 `getHumanAvailableActions(state, 0)` 中的选项，假冒或过期的动作会被直接丢弃。
- **验证**：编写测试 `should protect against illegal discards`，模拟在非己方回合或输入虚假牌型，引擎均强行忽略，状态不发生任何改变。

### 3. 动作按钮合法性 (Action Panel Legitimacy)
- **现状/问题**：AI 打牌后，玩家必须仅限呈现可执行的动作。
- **审计与修复**：`availableHumanActions` 完全绑定自 `pendingActions` 中 seat 0 的条目。没有可胡、碰、吃时，对应操作按钮会被彻底隐藏或禁用。吃牌有多种选择时，点击“吃”会自动弹出子组合供点选，且点击“过”会清除动作进入下一回合。

### 4. AI 自动推进防重入 (AI Stepping Anti-Reentrancy)
- **现状/问题**：若组件发生短时间多次重渲染，AI 定时推进器可能在原定时器未清理的情况下，并发跑出多个 step 导致爆牌或卡死。此外，若前一个定时器被 cleanup 清理，Stepping Ref 无法自动恢复导致对局卡死。
- **审计与修复**：
  - 在 `useEffect` 清理函数中不仅执行了 `clearTimeout(timer)`，还增加了 `isSteppingRef.current = false` 的清理操作，确保在任意中断或更新后，AI 定时流程能再次顺利排程。
  - 增加了对 settlement（结算阶段）的前置早停判断，防止结算发生后 AI 自动推进。
- **验证**：测试 `should prevent re-entrant AI stepping and handle cleanup` 验证 cleanup 的引用清理状态，无重入行为。

### 5. 结算弹窗状态锁定 (Settlement Locking)
- **现状/问题**：胡牌或流局结算弹出后，若用户仍可通过快捷键或后台残留动作继续游戏。
- **审计与修复**：在出牌、选择牌、操作动作的所有业务路径中，前置加入 `if (state.roundEnded || state.phase === 'ended' || state.phase === 'settlement') return;` 的最高优先级拦截，将 UI 推进完全锁定。

### 6. 再来一局重置 (Restart Game Reset)
- **现状/问题**：重置未擦除临时标识或堆栈残留。
- **审计与修复**：在 `resetGame` 中完全重置 `state`, `selectedTileInstanceId`, 并同步归零 `isActionBusyRef.current` 与 `isSteppingRef.current`，从而使下一次 round 的分发完全从洁净的白纸状态重新生成。
- **验证**：测试 `should reset all states correctly on reset and restart` 通过。

### 7. DebugPanel 牌数守恒 (Debug Panel Tile Audit)
- **现状/问题**：需要确保任何状态下牌数恒为 108 张。
- **审计与修复**：`assertTileConservation` 被完全用于每一条关键的业务状态转移（摸牌、打牌、吃碰杠）。如果 hands、melds、discards、wall 和 birdTiles 之和不为 108，立刻断言并抛出异常。
- **验证**：测试 `should assert conservation strictly and detect issues` 证明正常时守恒，人为偷掉一张牌时会抛出 conservation 错误。

### 8. 日志去重 (Log Deduplication)
- **现状/问题**：重复执行的事件记录可能导致日志控制台刷屏。
- **审计与修复**：在 `game-log.ts` 的 `addLog` 方法中前置执行排重比对。如新日志的 action、seat、detail 与 logs 数组最后一条相同，则判定为重复操作并直接返回原 state，实现全局去重。
- **验证**：测试 `should deduplicate repeat log entries` 验证通过。

---

## 测试数据统计

- **原有测试数**：156
- **新增 UI 可玩性测试数**：8
- **总测试数**：164
- **测试通过率**：100% (164 / 164 tests passed cleanly)
- **npm run build 构建状态**：完全成功 (Success)
