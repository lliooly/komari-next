# 操作反馈图标动画设计

- 日期：2026-09-04
- 状态：设计已批准，待规格审阅

## 背景

项目当前已经在部分按钮中使用 `animate-spin`，例如汇率刷新、Uptime Kuma 刷新和后台新增节点。但各处分别处理加载状态，成功和失败没有统一的图标反馈，导致同类操作的交互表现不一致。

本次改造聚焦于“根据动作语义播放动画”，不引入持续性的装饰动画。用户主动触发刷新、重试或提交时，图标应明确表达进行中、成功和失败；首次加载、定时刷新和其他后台请求不播放成功动画，避免页面产生噪声。

## 目标

1. 建立可复用的 `ActionFeedbackIcon`，统一表达 `idle`、`loading`、`success` 和 `error` 四种状态。
2. 建立配套的 `useActionFeedback` 状态管理，统一处理异步操作、重复点击、800ms 状态恢复和计时器清理。
3. 第一阶段接入汇率刷新、Uptime Kuma 手动刷新/重试和后台新增节点。
4. 刷新成功时显示 `Check` 约 800ms 后恢复原图标。
5. 刷新或提交失败时显示 `X` 并轻微抖动，约 800ms 后恢复原图标。
6. 保持现有请求、数据更新、错误文案和 Toast 的业务职责，不让动画组件承担数据请求。
7. 支持 `prefers-reduced-motion`，并确保图标状态不是唯一的成功或失败表达方式。

## 非目标

- 不为所有图标增加 hover、呼吸或持续旋转动画。
- 不把首次页面加载、定时刷新、WebSocket 心跳等后台请求改造成成功动画。
- 不修改现有 `Button` 的 API 或整体按钮样式。
- 不在第一阶段接入复制、删除、主题切换、语言切换和所有设置保存按钮。
- 不实现 SVG 路径级别的 `RefreshCw` 到 `Check` 或 `X` 的形变动画。
- 不改变后端接口、数据协议或业务错误判定。

## 方案决策

采用“状态 Hook + 纯展示组件”的组合方案。

### `ActionFeedbackIcon`

新增 `src/components/ui/action-feedback-icon.tsx`。组件只根据状态渲染图标和动画，不发起请求、不显示 Toast，也不决定业务是否成功。

建议接口如下：

```ts
type ActionFeedbackStatus = "idle" | "loading" | "success" | "error";

interface ActionFeedbackIconProps
  extends React.SVGProps<SVGSVGElement> {
  status: ActionFeedbackStatus;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  successIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  errorIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
```

`icon` 是 idle/loading 状态的原始图标，成功和失败图标默认为 `Check` 和 `X`，并允许后续动作使用不同的语义图标。组件外层使用固定尺寸容器，图标替换时不改变按钮布局。它应兼容现有 `lucide-react` 图标和 `src/components/Icones` 中形状相同的 SVG 组件。

组件不会修改图标的可访问名称。按钮仍保留“刷新”“重试”或“提交”等动作名称，成功和失败状态通过原有 Toast、错误文本或其他 `aria-live` 内容表达。

### `useActionFeedback`

新增 `src/hooks/useActionFeedback.ts`。Hook 为每个独立操作维护局部状态，不新增全局 Context。

建议行为：

- `run(action)` 在非 loading 状态下将状态切换为 `loading`。
- `action` 返回 `true` 表示成功，返回 `false` 表示失败；请求异常也按失败处理。
- 成功时切换为 `success`，失败时切换为 `error`，两者均在 800ms 后回到 `idle`。
- loading 期间再次调用 `run` 直接忽略，避免重复提交。
- success/error 期间再次调用 `run` 时取消旧的恢复计时器并重新进入 loading。
- Hook 在卸载时清理计时器；只有当前操作可以更新反馈状态。
- Hook 不负责记录错误文本；调用方继续维护原有卡片错误状态、Toast 和日志。

业务请求需要将“请求结果”明确返回给 Hook。现有会吞掉异常的刷新函数在接入时改为返回布尔结果，同时保留原有错误状态更新；自动刷新可以继续调用同一个业务函数，但不经过 `useActionFeedback.run`。

## 状态与动画规格

| 状态 | 图标 | 动画 | 结束行为 |
| --- | --- | --- | --- |
| `idle` | 原始动作图标 | 静止 | 保持当前颜色和尺寸 |
| `loading` | 原始动作图标 | 顺时针旋转，800ms/圈，线性无限循环 | 请求结束后停止 |
| `success` | `Check` | 透明度从 0 到 1、缩放从 0.8 到 1 | 保持约 800ms 后恢复原图标 |
| `error` | `X` | 透明度/缩放进入，并在水平方向抖动两次 | 保持约 800ms 后恢复原图标 |

动画采用 CSS keyframes 和 React 状态切换完成，不新增动画依赖。成功和失败图标的进入动画控制在约 140ms 内；错误抖动在约 360ms 内完成，剩余时间保持静态状态。所有状态使用与现有主题兼容的语义颜色：成功使用绿色，失败使用 destructive 色，loading 继承原图标颜色。

`prefers-reduced-motion: reduce` 下取消旋转、缩放和抖动，只做静态图标替换和状态恢复；loading 仍然可以通过 `aria-busy` 和现有文本表达。

## 第一阶段接入

### 汇率刷新

文件：`src/components/RemainingValueCalculator.tsx`

- 将现有 `isRefreshing` 图标 class 替换为 `useActionFeedback` 的 `status`。
- `RefreshCw` 作为 idle/loading 图标，成功使用 `Check`，失败使用 `X`。
- 保留现有 `ratesError` 文案。
- 请求成功后显示 `Check` 800ms；请求失败后显示抖动的 `X` 800ms。
- 打开计算器时的首次自动加载不播放成功/失败图标动画。

### Uptime Kuma 手动刷新和重试

文件：`src/components/UptimeKumaStatus.tsx`、`src/hooks/useUptimeKumaStatus.ts`

- 标题栏手动刷新按钮和无数据状态下的 Retry 按钮接入反馈状态。
- 首次加载、两分钟定时刷新和组件初始化仍使用现有 `isLoading`、骨架屏和错误区域，不播放成功动画。
- `refresh` 对手动调用返回成功/失败结果，同时保留现有超时、AbortController、旧数据保留和错误文本逻辑。
- loading 时沿用现有按钮禁用行为；成功或失败后恢复为可操作状态。

### 后台新增节点

文件：`src/components/admin/NodeTable.tsx`

- 将现有 `LoadingIcon` 替换为 `ActionFeedbackIcon`。
- `PlusIcon` 作为 idle 图标；提交期间显示旋转的 `PlusIcon`，成功显示 `Check`，失败显示 `X` 并抖动。
- 保留提交按钮禁用逻辑和成功后的表单清空、列表刷新。
- 当前只有控制台日志的提交失败场景补充用户可见的现有 Toast 错误提示，确保失败不只依赖图标和颜色。
- 节点列表首次加载和列表刷新不播放成功动画。

## 错误、并发与兼容性

- 请求失败不能被误判为成功；接入函数必须返回 `false` 或抛出后由 Hook 转换为失败状态。
- 手动刷新按钮在 loading 期间不发起并发请求；Uptime Kuma 本身已有的旧请求取消和 request id 保护继续保留。
- 自动刷新不应写入手动反馈 Hook 的 success/error 状态。
- 页面或对话框在请求完成前卸载时，不得因为恢复计时器产生 React 状态更新警告。
- 成功和失败图标都使用稳定的固定尺寸盒子，不改变按钮宽度、高度或相邻文本位置。
- 浏览器不支持动画或启用 reduced motion 时，功能状态和错误信息仍然完整可用。
- 现有 `LoadingIcon` 只有在第一阶段接入点全部迁移后才删除，避免其他调用方失效。

## 无障碍要求

- loading 状态的按钮设置 `aria-busy="true"`，结束后恢复为 `false` 或移除属性。
- 使用原生 `disabled` 防止 loading 期间重复触发，并保留按钮原有 `aria-label` / 可见文本。
- `Check` 和 `X` 默认设置 `aria-hidden="true"`，状态说明由既有 Toast、错误文本或 `aria-live` 区域承担。
- 成功和失败不能只依赖绿色/红色；失败仍需要现有错误文案或 Toast，成功需要可感知的状态变化。
- reduced motion 只减少视觉动效，不隐藏状态反馈。

## 验证计划

实现后验证以下内容：

1. Hook 单元测试覆盖 idle → loading → success → idle 和 idle → loading → error → idle。
2. 使用 fake timers 验证成功/失败状态均在 800ms 后恢复，并验证新操作会取消旧计时器。
3. 验证 loading 期间重复调用不会产生第二个请求。
4. 验证组件卸载后计时器被清理，不产生状态更新警告。
5. 组件测试验证四种状态下的图标、动画 class、固定尺寸和 `aria-busy`。
6. 手动验证汇率刷新、Uptime Kuma 刷新/重试、后台新增节点的成功、失败和快速重复点击场景。
7. 手动验证首次加载和自动刷新不会播放成功动画。
8. 在支持和不支持 reduced motion 的浏览器设置下检查状态反馈。
9. 执行项目现有的类型检查、lint 和生产构建，确认没有破坏 Next.js 客户端组件边界。

## 验收标准

- 三个第一阶段接入点的 loading、success、error 行为一致。
- 刷新成功明确显示 `Check` 约 800ms 后恢复原图标。
- 刷新或提交失败明确显示抖动的 `X` 约 800ms 后恢复原图标，并继续显示错误文本或 Toast。
- 自动刷新和首次加载不产生持续或成功动画。
- 快速重复点击不会造成并发提交或图标状态错乱。
- reduced motion、移动端和深色模式下均可正常使用。
- 未改变现有业务数据、请求协议和主题布局。

## 影响范围

预计新增或修改：

- 新增 `src/components/ui/action-feedback-icon.tsx`
- 新增 `src/hooks/useActionFeedback.ts`
- 修改 `src/components/RemainingValueCalculator.tsx`
- 修改 `src/components/UptimeKumaStatus.tsx`
- 修改 `src/hooks/useUptimeKumaStatus.ts`
- 修改 `src/components/admin/NodeTable.tsx`
- 可能修改 `src/global.css` 以加入组件所需 keyframes

不涉及后端接口、数据库、RPC2 协议、节点数据结构和现有主题配置格式。
