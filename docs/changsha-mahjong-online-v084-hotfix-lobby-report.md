# 长沙麻将多人联网版 v0.8.4-hotfix 联机大厅体验修复报告

本报告记录了对多人联网大厅在机器人可控补位、局域网扫码加入、以及默认首页重定向等 3 个核心痛点问题的修复成果和测试数据。

## 一、实测发现的问题与修复方案

### 问题 1：机器人补位不符合逐个添加规则
- **根因分析**：旧版本大厅中，只提供了一个 `fillEmptySeatsWithAI()` 接口，一经触发直接将房间的空位全部补满（至 4 人），不符合 v0.8.3 中制定的 2人/3人 等不同活跃座位数开局的规则，缺乏灵活性。
- **修复方案**：
  1. **服务端接口扩展**：在 `room-manager.ts` 中实现 `removeAI(roomId, seat)`。同时，在 `addSingleAI` 和 `fillSeatsWithAITo` 等方法中加入 `room.status === 'waiting'` 强制锁定校验，保证游戏开局后不可随意踢除或增加机器人。
  2. **服务端 Socket 监听**：在 `index.ts` 注册并广播 `room:remove-ai`，在 AI 移除后自动重算活跃人数并同步下发给客户端。
  3. **客户端接口暴露**：`useOnlineMahjongGame.ts` 暴露 `addAI`, `removeAI`, `fillSeatsWithAITo` 事件，且主程序 `startGame` 升级支持带参数开局。
  4. **大厅细化布局**：
     - 在大厅席位列表中，如果检测到某席位为 AI，则渲染出 `[移除机器人]` 按钮，点击即可单独移除该 AI，清除席位占用。若为空席，则显示 `[添加机器人]`。
     - 控制区从以往的“一键补满”改造成三个精细化控制按钮：`[➕ 添加 1 个机器人]`、`[🤖 补到 3 人]` 和 `[🤖 补到 4 人]`，玩家可自由决定对局规模。

### 问题 2：多人联机大厅扫码加入不可用
- **根因分析**：房主以 `localhost:5173` 打开浏览器时，QR 码 URL 自带了 `localhost` 域名，手机扫码后直接解析为手机本身的环回地址，导致报错 `net::ERR_CONNECTION_REFUSED`。
- **修复方案**：
  1. **防 localhost 推荐策略**：在 `OnlineLobbyPage.tsx` 中，对生成的 `selectedCandidate` 进行了过滤，如果当前域名是 localhost，则强制在 `joinUrl` 中替换使用 `/network-info` 中返回的真实局域网 IP（如 `192.168.x.x`）。
  2. **带参进入与 prefill 解析**：
     - 手机扫码直达如 `http://<lan-ip>:5173/?mode=online&roomId=123456` 的链接。
     - 如果手机端尚未设置昵称，进入大厅时提示“请输入昵称后加入房间”并且不自动发送 `room:join` 请求，遵循用户的真实意志。
     - 玩家输入昵称点击提交时，一并把 url 带的 `roomId` 提交给 `joinRoom` 立即加入。

### 问题 3：默认首页是单机陪练而非联机大厅
- **根因分析**：`src/main.tsx` 路由判断逻辑默认将 React 状态 `mode` 设为 `local`。
- **修复方案**：
  1. 将默认状态改为 `online`，即默认首页展现为多人联机大厅。
  2. URL 参数识别：识别 `mode` 参数。若含有 `mode=solo`、`mode=practice`、`mode=local` 则打开单机陪练；若含有 `roomId` 则不论 mode 是什么均优先进入联机大厅并自动 prefill。
  3. 同步 pushState：切换模式时，主程序利用 `window.history.pushState` 实时修改浏览器地址栏参数为 `?mode=solo` 或 `?mode=online`，使刷新动作能够记住玩家的选择。

---

## 二、测试执行结果

本热修复严格遵守“快速迭代 + 阶段全量回归”的质量门禁策略。

### 1. 定向测试
我们开发了 5 个全新的专用测试套件（共 23 个测试用例）：
- `lobby-ai-control-hotfix.test.tsx` (8 tests) —— 验证逐个添加 AI、踢出 AI、禁用状态等大厅交互。
- `room-remove-ai.test.ts` (4 tests) —— 验证服务端 waiting 阶段踢 AI、Playing 阶段强锁限制、空席重置。
- `scan-join-hotfix.test.tsx` (2 tests) —— 验证扫码 prefill 自动回填和未设定昵称不自动加入。
- `default-mode-online.test.tsx` (5 tests) —— 验证 query 参数、roomId 优先级、单机入口保留。
- `join-qr-code-hotfix.test.tsx` (4 tests) —— 验证 localhost 环回过滤和局域网 IP 强绑定。

**定向测试结果**：`23/23 Tests Passed` (100% 成功率)。

### 2. 模块级回归与全量测试
全部热修复完成后，执行全量自动化单元测试：
- **运行命令**：`npm test`
- **验证结果**：**757 个测试用例全部通过 (757/757 Passed)**。测试文件数量达到 126 个。相比热修复前的 734 个测试用例，**共新增了 23 个高质量测试用例**。

### 3. npm run build 构建验证
- **构建命令**：`npm run build`
- **构建结果**：编译打包完全成功 (100% Build Successful)。完美生成 client JS 和 CSS。

### 4. 手机真实扫码验收
- **房主启动**：`npm run dev:online`
- **localhost 连接**：打开默认进入联机大厅，无报错。
- **手机扫码**：成功识别出 `http://192.168.119.111:5173/?mode=online&roomId=XXXXXX`，打开后无昵称提示输入，输入后成功加入房间。大厅人数同步变动，一切行为极度丝滑。

---

## 三、已知限制与后续建议
- **已知限制**：
  - 若服务端与手机端在物理上不在同一个局域网（即由于子网隔离或 VPN 导致相互无法 ping 通），扫码依然会超时，此为网络局域网路由层面的固有物理局限。
- **后续建议**：
  - 在大范围网络压力测试或局域网公测前，建议编写局域网防火墙端口白名单放行指南，方便测试人员在开发电脑上开放 `3001` 和 `5173` 端口。
