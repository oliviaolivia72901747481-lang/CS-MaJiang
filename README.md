# 长沙麻将

一个基于 TypeScript 的长沙麻将规则引擎、AI 陪练与多人联机实验项目。项目最初以规则引擎为核心，当前已经包含本地练习 UI、Socket.IO 在线房间、扫码加入、断线重连、AI 补位、移动端牌桌布局、动作高亮与回归测试体系。

## 核心能力

- 长沙麻将规则：发牌、摸打、吃碰杠胡、起手胡、海底、鸟、计分与结算。
- 本地练习模式：人类玩家对 AI，支持动作提示、风险提示、复盘与调试面板。
- 多人联机模式：房间创建/加入、2-4 人对局、AI 补位、Socket 实时同步。
- 移动端体验：扫码加入、移动牌桌布局、动作候选面板、最新弃牌和副露高亮。
- AI 与教练系统：基础 AI、高级 AI、弃牌建议、风险评估、复盘分析和性能基准。
- 测试覆盖：Vitest 单元测试、组件测试、联机流程回归和性能/质量门禁。

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 启动 Vite 前端开发服务器，默认使用 `vite.config.ts` 中的 `3000` 端口。打开浏览器后默认进入多人联机大厅，也可以通过顶部切换进入单机陪练模式。

## 多人联机开发

```bash
npm run dev:online
```

该命令会同时启动：

- Socket.IO 服务端：默认 `http://localhost:3001`
- Vite 前端：`http://localhost:5173/?mode=online`

局域网测试时使用 `npm run dev:lan`，服务端会监听 `0.0.0.0` 并输出可用于手机访问的 LAN 地址。客户端默认连接当前页面主机的 `3001` 端口；如需指定服务端地址，可设置 `VITE_SOCKET_URL`。

## 常用命令

```bash
npm test            # 运行全部 Vitest 测试
npm run test:watch  # 监听模式运行测试
npm run build       # TypeScript 编译并执行 Vite 构建
npm run server      # 编译后单独启动联机服务端
```

## 项目结构

```text
src/
  main.tsx                         # React 入口，负责本地/联机模式切换
  changsha-mahjong/                # 纯规则、状态机、AI、教练与基准测试核心
    engine/                        # 牌墙、动作、胡牌、计分、抓鸟等规则计算
    controller/                    # 游戏状态机、回合流转、响应结算
    ai/ advanced-ai/               # 基础 AI、高级 AI、路径规划与攻防评估
    coach/                         # 手牌建议、风险提示、复盘分析
    benchmark/                     # AI 强度、性能、调优与报告生成
    types/                         # Tile、Player、GameState、RuleConfig 等类型
    __tests__/                     # 规则、AI、教练、基准测试
  changsha-mahjong-ui/             # 单机陪练 React UI
  changsha-mahjong-network/        # 多人联机客户端、服务端与移动端 UI
docs/                              # 版本报告、检查清单和质量门禁记录
dist/                              # 构建输出，不手动编辑
```

## 架构导读

规则核心从 `src/changsha-mahjong/index.ts` 对外导出。`createInitialGameState` 和 `startRound` 创建牌局，`stepGame` 推进 AI/自动流程，`discardTile` 和 `resolvePendingActions` 处理玩家出牌与吃碰杠胡响应。

本地 UI 使用 `src/changsha-mahjong-ui/hooks/useMahjongGame.ts` 管理前端状态，并通过 `ui-game-adapter.ts` 把规则状态转换为人类玩家可操作的界面状态。

联机模式的入口是 `src/changsha-mahjong-network/server/index.ts` 和 `client/useOnlineMahjongGame.ts`。服务端维护内存房间、座位、会话 token、连接状态和动作锁；`server-visible-view.ts` 为每个座位生成只包含本人手牌和对手公开信息的视图，避免隐藏信息泄漏。

## 测试与质量

测试文件位于各模块的 `__tests__/` 目录，命名为 `*.test.ts` 或 `*.test.tsx`。当前仓库包含规则、联机、UI、移动端、AI、性能与回归测试文件。提交前至少运行：

```bash
npm test
npm run build
```

涉及联机、扫码、移动端布局或断线重连的改动，应同时参考 `docs/` 下对应版本的 manual checklist 或报告进行手动验证。

## 开发约定

- 使用严格 TypeScript、ES Modules、React JSX。
- 本地源码导入保持 `.js` 扩展名，以匹配 `NodeNext` 配置。
- 规则计算优先放在 `engine/`，状态流转放在 `controller/`，界面行为放在 UI/network 组件或 hooks。
- 不要直接修改 `dist/`、`node_modules/` 或临时构建产物。
- 新增规则或修复 bug 时，优先补充聚焦的回归测试。
