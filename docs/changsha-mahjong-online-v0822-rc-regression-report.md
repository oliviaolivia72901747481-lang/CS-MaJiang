# 长沙麻将多人联网版 v0.8.2.2-RC 退出与重连复核报告

本报告为“长沙麻将多人联网版 v0.8.2.2 主动退出与被动断线优化”的 Release Candidate (RC) 级回归复核质量报告，包含核心联网语义审查、定向与模块测试执行记录、全量回归和打包编译结果。

---

## 一、RC 复核目标

本次复核确认系统完全符合以下 12 项核心联网语义，杜绝网络抖动和刷新引起的异常卡死：
1. **主动退出与被动断线彻底区分**：主动退出即时广播并释放席位/进入永久托管；被动断线保留席位进入重连等待。
2. **连接断开 (disconnect) 不等同于退出 (leaveRoom)**：客户端 `disconnect` 不触发席位释放或 session 注销。
3. **Waiting 阶段刷新保留座位**：等待大厅刷新，60 秒宽限期内座位保留。
4. **Waiting 阶段主动退出即时释放**：大厅点击退出立即释放座位，`seat = null`。
5. **Playing 阶段主动退出进入永久托管**：对局中主动退出，座位不删除，连接状态设为 `left`，由 AI 代替出牌直至游戏结束。
6. **Playing 阶段断线保留座位**：对局中断线不删除座位。
7. **Playing 阶段超阈值进入 AI 托管**：掉线超过 30 秒自动由系统 Bot 代理执行操作并记录日志。
8. **玩家重连恢复控制**：30~120秒内重新上线，AI 托管自动解除，玩家接管出牌。
9. **同名玩家不能顶替座位**：非原 Session 凭证的同名玩家连接时直接拒绝加入/重连。
10. **新 Socket 重连接管后旧 Socket 失效**：重连成功后，旧连接自动被强制 disconnect。
11. **房间 TTL 清理正常工作**：无真人的 waiting 房（5分钟）、 settlement 房（5分钟）、playing 僵尸房（2分钟）自动销毁；有真人在线/重连的房间受保护不被清理。
12. **暗牌信息安全隔离**：非结算阶段下发的数据不包含他人暗牌明细，托管执行也不在公开日志泄露手牌。

---

## 二、采用的测试策略

为了保障质量，同时避免每次小修改运行庞大的仿真 benchmark 测试而降低开发效率，本次回归采用**“快速迭代模式 + 阶段全量回归”**测试策略：
1. **快速定位阶段**：审计 `room-manager.ts`、`connection-manager.ts`、`room-cleanup-scheduler.ts` 等核心代码，排查语义漏洞。
2. **小修阶段**：每次修改单个文件后，使用定向测试仅验证相关测试用例。
3. **模块回归阶段**：对“退出与重连”、“房间清理”、“动作安全”等模块进行分组回归。
4. **全量回归阶段**：复核完成后，运行全量 656 个用例并验证生产打包。

---

## 三、测试运行记录

### 1. 定向测试运行记录
开发与微调阶段，定向测试命令成功通过：
- `npx vitest run room-manager` (8 示例全部通过)
- `npx vitest run rc-regression-supplement` (10 示例全部通过)
- `npx vitest run waiting-reconnect-grace` (5 示例全部通过)
- `npx vitest run room-cleanup-ttl` (7 示例全部通过)

### 2. 模块级回归测试运行记录
执行重连与活动退出模块联合测试：
```bash
npx vitest run waiting-reconnect-grace playing-reconnect-trustee reconnect-session-id exit-ui-flow
```
- **结果**：3 个测试文件，19 个测试用例全部 100% 通过（耗时 3.95s）。

执行暗牌隔离与信息泄露模块联合测试：
```bash
npx vitest run server-visible-view hidden-info-leak
```
- **结果**：2 个测试文件，13 个测试用例全部 100% 通过（耗时 0.69s）。

执行 Socket 与动作安全模块联合测试：
```bash
npx vitest run network-action-guard action-dedupe concurrent-action
```
- **结果**：3 个测试文件，19 个测试用例全部 100% 通过（耗时 0.70s）。

### 3. 全量回归测试运行记录
在全部 RC 修复完成后运行全量 Vitest 回归：
```bash
npm run test -- --run
```
- **结果**：105 个测试文件，656 个测试用例全部 100% 成功通过（耗时 344.07s，无一例失败）。

### 4. npm run build 结果
执行 TypeScript 静态类型检查与 Vite 生产构建打包：
```bash
npm run build
```
- **结果**：`tsc` 编译通过，Vite 成功生成 dist 目录，没有任何打包或依赖报错。

---

## 四、联网语义复核详情

### 1. leaveRoom 阶段语义复核
- **waiting 阶段**：调用 `leaveWaitingRoom` 立即释放席位（`seat = null`），广播通知，若无真人立即设置 `emptySince`。
- **playing 阶段**：调用 `markPlayerLeftDuringGame` 不删除席位，座位保持非空；设置 `connectionState = 'left'`，`connected = false` 并记录 `disconnectedAt`。AI 自动激活并在 0 秒延迟下开始对该玩家进行全对局托管。
- **settlement 阶段**：调用 `leaveSettlementRoom` 设置 `connectionState = 'left'` 并解绑客户端，但服务端仍然在内存中保留该玩家的席位与结算数据，直至 5 分钟 TTL 到期后销毁。
- **代码重构**：删除了通用的 `leaveRoom` 函数，重构为显式的 `leaveWaitingRoom`、`markPlayerLeftDuringGame` 和 `leaveSettlementRoom`。

### 2. disconnect 语义复核
- 确认服务端 `disconnect` 仅捕获物理连接断开，不代表逻辑退出。
- 掉线后保留座位、token、sessionId 与房间，状态设为 `reconnecting`，计算 `disconnectedAt`。

### 3. waiting 阶段重连缓冲复核
- 测试显示刷新页面和短时间掉线不会丢失席位。
- 超过 60 秒宽限期后，`getConnectionStatus` 调度器自动将该席位释放为 `null`。

### 4. playing 阶段断线与托管复核
- 0-30 秒内显示 `reconnecting`，玩家享有操作权。
- 超过 30 秒触发系统托管（`isSeatTrustee` 判定生效），Bot 代替出牌，并在日志写入 `[系统托管出牌]`。
- 玩家重连后，新 Socket 绑定，托管解除，恢复本人手动控制。

### 5. sessionId + token 重连认证复核
- `game:sync` 强制校验 `sessionId` 和 `token`，杜绝 playerName 被假冒。
- 新 Socket 重连成功后，旧 Socket 在 `game:sync` 中被强制 disconnect，且旧连接 record 从 manager 中清除，任何后续 game 操作（如 discard、action）均会抛出 `Unauthorized seat action.` 拒绝执行。

### 6. 房间清理 TTL 复核
- Waiting 空房：5 分钟无真人则清理。
- Playing 房间：若包含 online 玩家或仍在 60 秒宽限期内的 reconnecting 玩家，调度器跳过清理。
- Playing 全员 offline：维持 10 分钟 TTL，防网络波动误删。
- Playing 全员 left：维持 2 分钟 TTL 快速释放内存。
- Playing left + offline 混合：调度器回退到 10 分钟保护期，防误删。
- Settlement 房间：5 分钟 TTL 到期清理。

### 7. 暗牌信息隔离复核
- 回归确认非结算阶段的 `PlayerVisibleView` 对他人手牌和牌墙做了深层级字段擦除，防止通过 F12 调试面板看到暗牌。

---

## 五、修复与补充的问题清单

1. **重构通用 leaveRoom**：拆分为 `leaveWaitingRoom`、`markPlayerLeftDuringGame` 和 `leaveSettlementRoom` 三大特定函数，解决对局中退出错误导致座位变 null 的高危缺陷。
2. **新增 10 个测试场景**：补充覆盖了“旧 Socket 重连后禁止行动”、“all-offline 房间 TTL 10分钟保护”、“等待阶段重连防误删”、“同名不同 sessionId 拒绝抢占”等临界网络条件测试。
3. **修复 Mock Socket 类型**：修复测试中 mock socket 缺少 `disconnect` 函数导致 crash 的缺陷。
4. **补全 Visible View 构造 mock**：在测试中补全 `state.discards`、`pendingActions` 等数组，使广播不报错。

---

## 六、复核结论

本次 RC 级复核已全项通过。v0.8.2.2 阶段退出机制与重连托管逻辑达到了生产就绪水准，**正式允许进入 v0.8.3 真实多人试玩阶段**。

*仍需人工手机验证的问题：*
- 针对真实微信切后台 5 分钟后从系统层级被强杀时，客户端本地 Session 状态是否能优雅展示“重新连接”的 toast 提示（该条仅与微信 Webview 机制有关，不影响服务器稳定性语义）。
