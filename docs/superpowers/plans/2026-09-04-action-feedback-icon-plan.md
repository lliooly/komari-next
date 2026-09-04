# 操作反馈图标动画实现计划

本计划依据 `docs/superpowers/specs/2026-09-04-action-feedback-icon-design.md` 制定。当前仓库没有现成测试目录或测试脚本，因此测试步骤会补充最小的 Vitest + React Testing Library 配置；这些依赖只用于开发和 CI，不进入生产 bundle。

## 1. 建立反馈状态 Hook

新增 `src/hooks/useActionFeedback.ts`。

- 定义并导出 `ActionFeedbackStatus`：`idle`、`loading`、`success`、`error`。
- 定义 `run(action)`，其中 `action` 返回 `Promise<boolean>`：`true` 进入 success，`false` 或异常进入 error。
- loading 期间忽略重复调用；success/error 期间的新调用取消旧的恢复计时器并重新进入 loading。
- 使用 ref 保存恢复计时器、当前运行序号和 mounted 状态，防止旧 Promise 或卸载后的计时器更新状态。
- 成功和失败均在 800ms 后恢复 idle；Hook 不负责 Toast、错误文案或业务日志。
- 通过稳定的 `status` 和 `run` 返回值让调用方可以直接绑定按钮的 `disabled`、`aria-busy` 和图标。

验证点：成功、失败、异常、重复调用、旧请求晚返回、组件卸载和计时器恢复均可被独立测试。

## 2. 创建统一图标组件和动画样式

新增 `src/components/ui/action-feedback-icon.tsx`，必要时修改 `src/global.css`。

- 组件接收 `status`、原始 `icon`、可选 `successIcon` 和 `errorIcon`，默认使用 `Check` 和 `X`。
- 使用固定尺寸的 `relative` 容器和重叠图标，保证图标替换不改变按钮布局。
- idle/loading 显示原始图标；loading 添加 800ms 线性旋转；success 显示 Check；error 显示 X 和两次水平抖动。
- 使用 CSS keyframes 处理旋转、进入和抖动，并通过 `prefers-reduced-motion` 取消旋转、缩放和抖动。
- 图标使用 `aria-hidden="true"`，保留父级按钮的动作名称；为测试和样式状态增加稳定的 `data-feedback-status` 属性。
- 通过 `cn` 合并尺寸、颜色和调用方传入的 className，兼容 lucide 图标与现有自定义 SVG 图标。
- 不修改 `src/components/ui/button.tsx`，不新增生产运行时依赖。

验证点：四种状态下的图标选择、class/data 属性、固定尺寸、颜色和 reduced-motion 规则可被组件测试或浏览器检查验证。

## 3. 接入汇率刷新

修改 `src/components/RemainingValueCalculator.tsx`。

- 引入 `useActionFeedback` 和 `ActionFeedbackIcon`，移除仅用于图标旋转的 `isRefreshing` 状态。
- 将 `refreshRates` 调整为返回 `Promise<boolean>`：成功返回 true，捕获异常并设置现有 `ratesError` 后返回 false；无可刷新货币时视为无副作用成功。
- 手动按钮使用 `run(() => refreshRates(true))`，并将 `status` 传给 `ActionFeedbackIcon`。
- loading 时禁用按钮并设置 `aria-busy`；成功显示 Check 800ms，失败显示 X 并抖动 800ms。
- 计算器打开时的首次 `refreshRates(false)` 继续直接调用，不进入反馈 Hook。
- 保持现有汇率数据、过期状态、错误文案和按钮文本不变。

验证点：手动成功、网络失败、重复点击和首次打开自动加载分别表现正确。

## 4. 接入 Uptime Kuma 手动刷新和重试

修改 `src/hooks/useUptimeKumaStatus.ts`、`src/components/UptimeKumaStatus.tsx`。

- 让 `refresh` 为手动调用返回明确的成功/失败结果，保留现有超时、AbortController、request id、旧数据和错误文本逻辑。
- 为标题栏刷新和无数据卡片中的 Retry 使用同一个局部反馈 Hook；两处不会同时显示，因此不会共享到其他操作。
- 手动调用进入反馈 Hook；首次加载、初始化调用和两分钟定时刷新继续走原有 `isLoading`/骨架屏逻辑，不触发 success/error 动画。
- loading 时沿用现有 `disabled={isLoading}` 语义，并将 `aria-busy` 绑定到反馈状态；成功/失败完成后恢复可操作。
- 对被旧请求取消或被新请求取代的后台结果不显示错误动画，避免自动刷新干扰手动反馈。

验证点：有数据时手动刷新、无数据时 Retry、超时、配置错误、定时刷新和手动刷新同时发生时，图标状态与卡片错误状态不冲突。

## 5. 接入后台新增节点

修改 `src/components/admin/NodeTable.tsx`，并按需修改三种语言文件中的节点错误文案。

- 使用 `useActionFeedback` 替代新增节点按钮专用的 `isAddingNode` 图标状态；保留按钮禁用和提交期间的文本。
- `PlusIcon` 作为 idle/loading 图标，成功使用 Check，失败使用 X 和抖动。
- 让 `handleAddNode` 返回成功/失败结果；成功后继续清空输入并调用 `refreshTable`。
- 保留控制台错误日志，并为当前只有日志的失败分支补充 `sonner` Toast；中英文和繁体中文使用同一组语义 key。
- 节点表格首次加载、列表刷新和拖拽排序不接入成功/失败图标动画。
- 完成迁移后用 `rg` 检查 `LoadingIcon` 引用；只有没有其他调用方时才考虑删除旧组件文件。

验证点：新增成功、HTTP 失败、重复点击、表单清空和新增后列表刷新均符合状态流转。

## 6. 添加最小自动化测试设施

修改 `package.json`、`package-lock.json`，新增 `vitest.config.ts`、测试初始化文件和测试文件。

- 添加开发依赖：`vitest`、`@vitejs/plugin-react`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`。
- 增加 `npm test` 脚本，测试环境使用 jsdom，配置 `@/*` 路径别名和 React JSX 转换。
- 新增 `src/hooks/useActionFeedback.test.tsx`，使用 fake timers 覆盖成功/失败 800ms 恢复、重复调用、旧请求和卸载清理。
- 新增 `src/components/ui/action-feedback-icon.test.tsx`，覆盖 idle/loading/success/error 的图标和状态属性，以及 reduced-motion 可用性相关的静态结构。
- 不为业务 API 编写真实网络测试；汇率、Uptime Kuma 和节点新增的具体接口仍通过手动失败/成功场景验证。

## 7. 静态审计与验证

- 搜索所有第一阶段接入点，确认不再使用局部 `animate-spin` 代替统一状态组件。
- 搜索 `LoadingIcon` 引用，确认迁移不会留下失效 import。
- 执行 `npm test`、`npm run lint` 和 `npm run build`。
- 使用本地开发页面手动验证：汇率手动刷新、Uptime Kuma 刷新/Retry、后台新增节点；分别覆盖成功、失败、重复点击、自动加载和定时刷新。
- 在桌面与移动宽度、浅色与深色主题、`prefers-reduced-motion` 下检查按钮尺寸、图标切换、Toast 和可访问属性。
- 执行 `git diff --check`，确认只修改计划内文件。

## 实现顺序

按以下顺序执行，减少中间状态不一致：

1. Hook 和组件测试先行，确定状态契约与 800ms 行为。
2. 完成 CSS keyframes 和组件静态渲染。
3. 依次接入汇率刷新、Uptime Kuma、后台新增节点。
4. 删除已迁移的局部 loading 图标逻辑，保留仍有调用方的旧组件。
5. 执行自动化检查和浏览器手动验证，最后汇总变更。

## 预计影响文件

- 新增 `src/hooks/useActionFeedback.ts`
- 新增 `src/components/ui/action-feedback-icon.tsx`
- 新增 `src/hooks/useActionFeedback.test.tsx`
- 新增 `src/components/ui/action-feedback-icon.test.tsx`
- 新增 `vitest.config.ts` 和测试初始化文件
- 修改 `src/global.css`
- 修改 `src/components/RemainingValueCalculator.tsx`
- 修改 `src/hooks/useUptimeKumaStatus.ts`
- 修改 `src/components/UptimeKumaStatus.tsx`
- 修改 `src/components/admin/NodeTable.tsx`
- 修改 `package.json`、`package-lock.json`
- 可能修改 `src/i18n/locales/en.json`、`src/i18n/locales/zh_CN.json`、`src/i18n/locales/zh_TW.json`
