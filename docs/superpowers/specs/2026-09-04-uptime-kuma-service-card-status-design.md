# Uptime Kuma 服务卡片状态布局设计

- 日期：2026-09-04
- 状态：已批准，待规格审阅

## 背景

Uptime Kuma 服务状态区域已经能展示分组、心跳历史、延迟和 24 小时可用率，但每个服务的状态徽章目前位于卡片右侧指标区，服务卡片本身仍有一圈边框。整体状态 `All operational` 与服务器卡片的 `Online` 胶囊也没有明确复用同一套视觉处理。

## 目标

1. 将每个服务的状态胶囊放到服务卡片右上角，与服务器卡片的状态位置保持一致。
2. 让服务的 `Operational` 和整体的 `All operational` 使用与服务器 `Online` 一致的绿色实心胶囊样式。
3. 移除每个服务卡片容器的外边框，同时保留背景、圆角、悬停反馈和心跳条内部的层次感。
4. 让现有服务和未来新增服务都自动使用相同布局，不增加新的配置或数据字段。

## 非目标

- 不改变 Uptime Kuma 请求、轮询、状态归一化或整体状态计算。
- 不改变服务分组、心跳历史、延迟、可用率、刷新和外链交互。
- 不重构整个节点卡片体系，也不扩大到无关的共享 Badge API。
- 不修改服务状态的语义颜色；down、pending、maintenance 和 unknown 仍使用对应的状态色。

## 方案

继续在 `src/components/UptimeKumaStatus.tsx` 内复用现有 `ServiceRow`，将其拆成两个视觉层级：

1. 顶部行使用 `flex items-start justify-between`，左侧保留服务名称和 Monitor 标识，右侧渲染 `ServiceStatusBadge`。
2. 底部行保留 `HeartbeatBar` 与延迟/可用率指标。桌面宽度下心跳条占据可伸缩空间，指标排列在右侧；窄屏下两者垂直堆叠，避免名称或徽章互相遮挡。
3. 移除 `ServiceRow` 的 `border border-border/60`，保留现有背景、统一圆角、内边距、过渡和悬停背景。
4. `up` 服务状态和整体 `overallStatus === "up"` 使用与节点 `Online` 相同的 `Badge` 实心绿色处理（`default` 变体配绿色背景）；服务状态仍保留状态图标。其他状态继续使用现有颜色映射并保持胶囊形状。

## 数据流与未来扩展

不增加数据转换层。`data.groups[].services[]` 仍由同一个 `ServiceRow` 渲染，新增服务只要出现在 Kuma 响应中，就会自动获得右上角状态和无边框卡片布局。

## 可访问性与错误状态

- 状态文本和图标继续由现有翻译键提供，图标保持 `aria-hidden`。
- 服务状态徽章不承担操作，不新增焦点元素。
- loading、请求失败、空服务列表和非 up 服务沿用现有渲染逻辑；仅调整成功数据状态下的布局和视觉样式。

## 验证计划

1. 执行 `git diff --check`。
2. 执行项目生产构建，验证 TypeScript、Tailwind 类名和 Next.js 打包。
3. 静态检查确认所有服务状态均通过共享 `ServiceStatusBadge`，并确认服务行不再包含外边框类。
4. 手动检查桌面和窄屏布局，覆盖 up、down、pending、maintenance、unknown、整体 All operational 以及整体 degraded 状态。

## 影响范围

- `src/components/UptimeKumaStatus.tsx`：调整服务行布局和状态徽章样式；不涉及数据逻辑。
- 本设计不预期修改其他组件、API、配置或翻译文件。
