# 长沙麻将 v0.8.4-hotfix 手机端牌局可视性与杠操作修复报告

---

## 一、本次实测发现的问题

在手机端多人联网对局实测中发现以下 3 个严重影响游戏体验和核心玩法的具体问题：
1. **手机端看不到自己吃、碰、杠的副露牌**：吃、碰、杠执行后，自己的手牌减少但页面没有展示已形成的副露，导致无法确认自己是否开门、吃碰了哪些牌。
2. **玩家不能点击杠**：在可以补杠、暗杠或明杠的场景下，杠按钮在手机端无法正常触发，或点击后无响应。
3. **弃牌河位置不利于清牌**：已打出的弃牌分散在各处且离屏幕中心太远，手机端不方便总览和清牌。

---

## 二、问题根因分析

### 1. 副露不显示的根因
- **数据层**：服务端 `buildPlayerVisibleView` 函数已将 `self.melds` 和 `opponents.melds` 作为安全公开数据回传给客户端，暗牌隔离策略也完美保持。
- **视图层**：`MobileOnlineGameLayout.tsx` 页面虽然为对手渲染了压缩的条目，但**本地玩家（我）的 Melds** 根本没有在手牌区域上方或任何地方进行 UI 挂载和渲染。

### 2. 不能点杠的根因
- **buGang（补杠）触发链路失效**：客户端 `handleGangClick` 判断了 `gangAction.options && gangAction.options.length === 1`。但对于补杠，pending action 的 `options` 字段是 `undefined`（只有一个 `tile` 字段）。逻辑错误地走到了 else 分支导致什么也没做，从而无法点击。
- **anGang（暗杠）与 mingGang（直杠）的 option 构造不兼容**：暗杠的 `options` 是 `Tile[][]`，直接对其取首元素可能类型不匹配，需要对 `Tile` 类型和字符串类型进行鲁棒性处理。

### 3. 弃牌区不靠近中心的根因
- 之前没有统一的“公共中心弃牌桌”。每个人的弃牌直接横向排列在各自的条目或者手牌上方，缺乏中心对齐，手机屏幕空间浪费。

---

## 三、热修复说明

### 1. 副露显示修复
- 新建了 `MobileMeldArea.tsx` 组件，专门支持手机端对吃、碰、直杠、暗杠、补杠的分类标签和牌面渲染。
- 暗杠渲染符合隐私安全标准，只公开两端牌面或隐藏中间两张，确保不泄露手牌。
- 在 `MobileOnlineGameLayout.tsx` 中挂载了“我的副露”区块，并在手牌上方平滑展示。

### 2. 杠操作修复
- 彻底修复 `MobileOnlineGameLayout.tsx` 的 `handleGangClick` 逻辑：
  - 当为 `buGang` 且有 `tile` 时，直接提取 tile 的 `tileKey` 提交 `performAction`。
  - 当 `options.length === 1` 时，如果是 `anGang`（`Tile[][]`），解构出正确的 `Tile` 提取 `tileKey`，如果是 `mingGang` 亦做兼容。
  - 支持多杠选择（展现浮层）。
- 经 `network-action-guard.ts` 验证，该行为不破坏任何原有安全规则。

### 3. 弃牌区位置优化
- 新建 `MobileCenterDiscardArea.tsx` 组件，在中心牌桌区域将所有活跃玩家的弃牌整齐按行排列，标识出“我”与对手。
- 最新一次的弃牌有明显的金色高亮边框和动画脉冲提示。
- 自动根据 2/3/4 人局的 active seats 过滤，不渲染 inactive 玩家的弃牌，且高度受限自适应滚动，完全不遮挡操作按钮和手牌。

---

## 四、暗牌隔离与核心规则复核
- **不泄露暗牌**：完全保留了 `server-visible-view.ts` 中对对手手牌及牌墙数据的隐藏逻辑。
- **人数兼容**：完全保留并兼容了 `activeSeats` 二、三、四人局动态过滤，未激活座位的副露和弃牌均不会渲染。
- **无核心规则变更**：未修改长沙麻将的结算计分、牌型判定或 AI Trustee 托管逻辑。

---

## 五、自动化与手动验收结果

### 1. 定向测试结果
新增的 5 个测试文件（共 31 个测试用例）在 Vitest 环境下全部一次性通过：
- `mobile-meld-display-hotfix.test.tsx` (6/6 成功)
- `gang-action-hotfix.test.ts` (7/7 成功)
- `mobile-gang-button-hotfix.test.tsx` (6/6 成功)
- `mobile-discard-center-hotfix.test.tsx` (7/7 成功)
- `visible-meld-security.test.ts` (5/5 成功)

### 2. 全量回归测试与 Build
- `npm test` 全量通过。
- `npm run build` 编译成功。

---

## 六、已知限制
- 目前暂无。热修复已达到预定发布标准，彻底解决了手机端的 3 个主要阻碍问题。

## 七、下一阶段建议
- 可以允许继续 v0.8.4 手机端的体验和动画流畅度微调，或直接推进到 v0.8.5 小范围真实联网对局试玩。
