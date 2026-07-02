# Walkthrough - Action Tile Highlight System (v0.8.7)

We have successfully implemented the吃、碰、杠关联牌特殊渲染高亮系统, allowing players to clearly see the source of incoming actions, hand tiles involved in options, candidate combinations, and newly formed melds.

---

## 核心实现说明

### 1. 统一高亮计算工具类
- **[action-highlight-utils.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/utils/action-highlight-utils.ts)**:
  - 核心分析逻辑：解析 `view.pendingActions`，计算当前吃、碰、直杠、暗杠、补杠、胡牌等动作。
  - 精确映射手牌：整理手牌中参与对应操作的所有牌的 Key，方便在玩家手牌上实现高亮提醒。
  - 单元测试：**[action-highlight-utils.test.ts](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/action-highlight-utils.test.ts)** 完整覆盖各种多组合吃牌和碰、直杠、暗杠等不同情况。

### 2. 界面展示组件
- **[ActionSourceTileBanner.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/components/ActionSourceTileBanner.tsx)**:
  - 显示操作的响应来源牌及其出牌者，如 `响应来源: 玩家2 打出 [7筒]`。
- **[ActionCandidatePanel.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/components/ActionCandidatePanel.tsx)**:
  - 展示所有可选的组合选项。每个选项显示完整牌面与汉字标签（如：`吃 4万 5万 6万`）。

### 3. 桌面端与移动端整合
- **桌面端 [OnlineGamePage.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/components/OnlineGamePage.tsx)**:
  - 声明了 `hoveredCandidateId` 的 hovered 状态。
  - 当玩家 hover 某一候选组合时，手牌中参与该组合的对应牌会呈现明显的 `tile-hand-participant` 状态。
  - 保留并美化了原有的 "过" 按钮，确保逻辑完全向下兼容。
- **移动端 [MobileOnlineGameLayout.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/components/MobileOnlineGameLayout.tsx)**:
  - 不依赖 hover。候选组合平铺展示，直接点击候选组合完成选中和提交。
  - 按钮尺寸针对移动端进行优化（`min-height: 44px`），避免误触。

### 4. 新形成副露高亮（低风险）
- **[MobileMeldArea.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/components/MobileMeldArea.tsx)**:
  - **重要设计决策**：为了防止破坏以“纯函数”形式直接调用渲染的单元测试（如 `mobile-meld-display-hotfix`），我们完全移除了 `MobileMeldArea` 内的 React 状态 Hooks（`useState`/`useEffect`）。
  - 改为使用纯 CSS 动画检测新节点挂载，在最后一个 meld 渲染时自动应用 `.meld-newly-formed` 触发 1.5 秒的亮绿色呼吸闪烁动画。

---

## 回归测试与修复

1. **[mobile-action-bar.test.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/mobile-action-bar.test.tsx)**:
   - 已被完全重构。由于删除了旧的 `MobileActionBar`，我们重写了该文件以验证新的 `ActionCandidatePanel` 及“过”按钮布局。
   - 所有关于禁用状态、`performAction` 动作触发、候选牌展示的用例已全部恢复并成功通过。
2. **[latest-discard-owner-hotfix.test.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/latest-discard-owner-hotfix.test.tsx)**:
   - 修复了在测试中手动渲染 `ActionSourceTileBanner` 以检查其子树的属性匹配问题。
3. **[meld-highlight-desktop-layout.test.tsx](file:///c:/Users/hn511/Desktop/VibeCoding/RealMapTeach/src/changsha-mahjong-network/__tests__/meld-highlight-desktop-layout.test.tsx)**:
   - 保持了与 v0.8.5 相同的 `highlightType` 外部命名空间（`chi` / `peng` / `gang`），在底层映射 `.tile-hand-participant` 样式。
