# Uptime Kuma 服务卡片监控编号隐藏设计

- 日期：2026-09-04
- 状态：已批准，待规格审阅

## 目标

移除服务卡片标题下的 `Monitor {{id}}` 文字组件，让卡片只保留服务名称、状态、心跳历史、延迟和可用率信息。

## 方案

在 `src/components/UptimeKumaStatus.tsx` 的 `ServiceRow` 中删除渲染 `uptimeKuma.monitorId` 的 JSX。保留三种语言文件中的翻译键，不修改 API、数据模型、状态徽章、心跳历史或指标逻辑。

## 验证

- 静态确认 `ServiceRow` 不再渲染 `monitorId`。
- 执行 `git diff --check`。
- 执行项目生产构建，确认 TypeScript 和 Next.js 打包通过。
