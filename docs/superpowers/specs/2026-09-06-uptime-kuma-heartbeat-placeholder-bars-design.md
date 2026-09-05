# Uptime Kuma 心跳历史不足时的灰色占位条设计

- 日期：2026-09-06
- 状态：已批准，待规格审阅

## 背景

Uptime Kuma 服务卡片的 `HeartbeatBar` 当前只渲染接口返回的心跳记录，并让每条记录通过 `flex-1` 平分可用宽度。记录数量较少时，单条会被拉得很宽，圆角会让它看起来像一排圆块，而不是与完整数据状态一致的窄条。

## 目标

1. 保持心跳区域最多 60 个固定条位，避免数据量少时真实采样条被拉宽。
2. 真实采样继续使用现有的 up、down、pending、maintenance 和 unknown 状态颜色。
3. 当真实采样少于 60 条时，在较早历史一侧补充灰色短条，真实数据靠右排列。
4. 不改变心跳数量、时间范围、最近心跳时间、tooltip 或服务状态指标的语义。

## 非目标

- 不修改 Uptime Kuma 请求、轮询、响应归一化或采样数据本身。
- 不推算不存在的采样时间，也不把灰色占位条当作真实心跳。
- 不修改 `CircleChart`、服务状态徽章、延迟/可用率指标或其他图表。
- 不新增配置项、翻译键或 API 字段。

## 方案

仅调整 `src/components/UptimeKumaStatus.tsx` 中的 `HeartbeatBar`：

1. 定义 `MAX_HEARTBEAT_SEGMENTS = 60`，真实记录继续取 `service.heartbeats.slice(-MAX_HEARTBEAT_SEGMENTS)`。
2. 根据 `MAX_HEARTBEAT_SEGMENTS - visibleHeartbeats.length` 计算占位数量。
3. 先渲染占位条，再渲染真实心跳条，使最新的真实采样保持在右侧。
4. 占位条使用主题感知的低对比度灰色背景（`muted-foreground` 的透明度），保留与真实条一致的窄条、圆角和间距样式。
5. 占位条使用稳定的 `missing-${index}` key，并标记为装饰性内容；父级 `role="img"` 的 aria-label 继续只描述真实心跳数量。
6. 当 `visibleHeartbeats.length === 0` 时沿用现有的空历史提示，不补渲染灰色条。

## 数据流与边界情况

- 0 条真实记录：显示现有 `heartbeatEmpty` 文案。
- 1 至 59 条真实记录：左侧补灰色条，右侧显示全部真实记录。
- 60 条及以上真实记录：只显示最近 60 条真实记录，不显示占位条。
- 真实记录中的状态颜色和 tooltip 完全沿用现有逻辑；灰色占位条没有 tooltip。

## 可访问性与视觉一致性

- 心跳区域仍通过父级 `role="img"` 和现有翻译文本提供整体说明。
- 占位条不引入额外可读内容，不把缺失数据误报为心跳状态。
- 继续使用 `min-w-[3px]`、`flex-1` 和现有高度/圆角，保证桌面与窄屏布局下都保持条状。
- 占位颜色与 unknown 状态区分：占位条使用更低对比度，仅表达“此位置无采样”。

## 验证计划

1. 执行 `git diff --check`，确认补丁没有空白错误。
2. 执行 `npm run lint`，验证 JSX、TypeScript 和 hooks 规则。
3. 执行 `npm run build`，验证 Next.js/Tailwind 构建。
4. 静态检查 `HeartbeatBar` 覆盖 0、少于 60、等于/超过 60 条三种分支，并确认占位条在真实条之前渲染。
5. 手动检查截图对应的完整采样服务和 AI 这类少量采样服务，确认条宽一致、灰色补位可见且真实数据靠右。

## 影响范围

- `src/components/UptimeKumaStatus.tsx`：增加固定条位和灰色占位渲染逻辑。
- `docs/superpowers/specs/2026-09-06-uptime-kuma-heartbeat-placeholder-bars-design.md`：记录已确认的设计与验证标准。
- 不涉及接口、数据模型、翻译、其他组件或配置。
