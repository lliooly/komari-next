# 滚动时导航栏紧凑化实现计划

本计划依据 `docs/superpowers/specs/2026-09-06-navbar-scroll-compact-design.md` 制定，直接在当前仓库实现，不创建额外工作树。

## 1. 增加导航栏滚动状态

修改 `src/components/NavBar.tsx`。

- 增加 16px 滚动阈值和 `isCompact` 状态。
- 在 `useEffect` 中首次同步 `window.scrollY`，并注册 `passive` 的 `scroll` 监听。
- 只在是否跨过阈值时更新状态，卸载时移除监听。
- 保持初始状态为完整态，避免 SSR/hydration 不一致。

验证点：页面初始渲染不访问 `window`；滚动超过阈值进入紧凑态；回到顶部恢复；重复挂载不会累积监听器。

## 2. 接入完整态和紧凑态样式

继续修改 `src/components/NavBar.tsx`，只调整已有 DOM 的 className。

- 完整态保留当前移动端 64px、桌面端 80px 高度。
- 紧凑态使用移动端约 48px、桌面端约 56px 高度，并收紧内边距、logo、站点名和操作区间距。
- 操作按钮继续保持 36px 触控尺寸，不隐藏任何导航功能。
- 保留现有背景、模糊、圆角、阴影、logo 回退、登录和主题相关逻辑。
- 为尺寸变化保留 300ms 过渡，并在 `prefers-reduced-motion` 下关闭过渡。

验证点：浅色/深色主题、自定义 logo、logo 加载失败、长站点名和多个操作按钮下布局不溢出；公告栏不改变。

## 3. 静态与构建验证

- 执行 `npx tsc --noEmit`。
- 执行 `npm run build`。
- 执行 `git diff --check`，确认只修改计划内的导航栏和计划文档。
- 若开发服务器可用，手动检查顶部、滚动阈值、回顶、桌面/移动宽度、Tab 焦点和减少动效偏好。

## 实现顺序

1. 修改 `NavBar` 的滚动状态和 className。
2. 检查 diff，运行 TypeScript 检查。
3. 运行生产构建并进行可用的浏览器交互验证。
4. 汇总变更和验证结果。

## 预计影响文件

- 修改 `src/components/NavBar.tsx`
- 新增 `docs/superpowers/specs/2026-09-06-navbar-scroll-compact-design.md`
- 新增 `docs/superpowers/plans/2026-09-06-navbar-scroll-compact-plan.md`
