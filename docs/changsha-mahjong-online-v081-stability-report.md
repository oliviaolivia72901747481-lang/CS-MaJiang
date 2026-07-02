# 长沙麻将多人联网稳定性与安全性报告 (v0.8.1)

本报告总结了“长沙麻将联网稳定性质量门 v0.8.1”阶段所实现的架构加固、安全防御策略、异常恢复机制、自动化测试覆盖率及运行指标。

---

## 一、本阶段目标

建立完备的多人联网稳定性质量门，保证多人同时联机在刷新、重连、断线、并发动作、重复点击等日常异常网络场景下对局不崩溃、手牌不漏泄、状态不卡死、规则不爆牌。

---

## 二、新增联网稳定性能力

### 1. 轻量级 Token 会话重连恢复机制
- **模块**：`server/online-session-token.ts`
- **机制**：玩家创建/加入房间成功后，服务器会通过 `crypto.randomBytes(16)` 签发一个跟该房间、座位、昵称绑定的专属 32 位 Token，由前端自动保存至 `localStorage`。
- **刷新恢复**：网页被用户刷新或断网重连后，前端自动调取 Token 向服务端推送 `game:sync` 进行免账号无感知重连，自动归位原座。
- **防止篡改**：Token 不透露任何牌局内部的暗手牌或牌墙信息，仅承载玩家临时席位标识验证。

### 2. Sockets 连接生命周期管理
- **模块**：`server/connection-manager.ts`
- **逻辑**：Socket 单端断开（例如移动端锁屏或暂时无信号）不立刻删除该座位。会话状态置为 `connected = false`，且对局会继续平稳推进。
- **物理席位占用**：保证同一座位只能有唯一的 Socket 控制。当发起新 Socket 重连时，原有的旧 Socket 及连接记录将被立刻解绑作废，规避了同席位多 Socket 篡改冲突。

### 3. 时间序列房间清理策略
- **模块**：`server/room-cleanup-scheduler.ts`
- **逻辑**：通过启动独立的时间片扫描器对全局房态进行生命周期归并：
  - **空置房间 TTL**：在未开局大厅状态下，若该房间无任何真人玩家长达 5 分钟，则物理销毁。
  - **全员掉线 TTL**：对局进行中（`playing`）若全部真人玩家失联超过 10 分钟，则物理销毁。

### 4. 严苛防重放与双击的 `actionId` 去重
- **模块**：`server/action-dedupe.ts`
- **机制**：客户端发起的每个动作（出牌、吃、碰、杠、胡、过）会自动附带一个根据时间随机生成的全局唯一 `actionId`。
- **拦截逻辑**：服务端对处理过的 `actionId` 进行防重记录。同一玩家在毫秒级内双击发出的重放动作将被拦截并默默返回 `ignored: true`，不进行任何对局推进或重复出牌报错。

### 5. 权威 `network-action-guard` 安全沙箱
- **模块**：`server/network-action-guard.ts`
- **机制**：在执行任何 GameState 修改前进行全域沙盒校验。
- **校验点**：
  - 出牌 `tileInstanceId` 是否真的属于当前发包玩家手牌；
  - 响应的吃/碰/杠/胡选项是否确实在 state 待决队列中；
  - 局终后拒绝任何出牌响应动作。

### 6. AI 自动推进与 Robust 容灾兜底
- **模块**：`server/ai-seat-runner.ts`
- **保障**：AI 运转受到并发锁 `actionLock` 保护，绝不在真人动作仍在校验中时并发篡改。
- **容灾 Fallback**：若 AI 计算或 lookahead 过程中遇到异常，会自动 fallback 执行安全出第一张手牌或 Pass，不会挂死线程导致服务端及房间崩溃。

---

## 三、暗牌防泄露物理回归测试

在 [hidden-info-leak.test.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/hidden-info-leak.test.ts) 与 [online-stability-flow.test.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/online-stability-flow.test.ts) 中加入了物理回归测试：
- 断言：`JSON.stringify(viewForSeat0)` 转换的序列化字符串中，绝不包含 Seat 1, 2, 3 手牌的任何 `instanceId`。
- 断言：`JSON.stringify(viewForSeat0)` 不包含牌墙内部具体的牌序和牌值，只能看到牌墙张数。

---

## 四、自动化测试指标与编译状态

- **新增测试文件**（8 个）：
  1. `connection-manager.test.ts`
  2. `online-session-token.test.ts`
  3. `room-cleanup-scheduler.test.ts`
  4. `network-action-guard.test.ts`
  5. `action-dedupe.test.ts`
  6. `reconnect-flow.test.ts`
  7. `concurrent-action.test.ts`
  8. `online-stability-flow.test.ts`
- **新增用例数量**：46 个
- **当前对局总测试用例数**：536 个
- **测试通过率**：100% (536/536 全部通过)
- **编译状态**：`npm run build` 100% 通过（Vite 无任何 TypeScript 类型和打包警告）。

---

## 五、已知限制
1. Token 存放在 `localStorage` 中是明文存储，本版本未作对称加密。
2. 房间清理在对局未开始时为 5 分钟，由于是非公网高防环境，当前暂未设置 IP 频次限制。
