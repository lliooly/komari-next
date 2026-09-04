# Uptime Kuma 服务状态集成实现计划

## 1. 扩展主题管理配置

- 在 `src/contexts/ThemeContext.tsx` 增加 `UptimeKumaSettings` 类型和默认值。
- 让 `normalizeManagedThemeSettings` 读取 `uptimeKuma.enabled`、`baseUrl`、`slug`，并让
  `mergeManagedSettings` 保存嵌套配置。
- 不将 Kuma 配置加入访客本地覆盖逻辑。
- 在 `komari-theme.json` 的 `managedFields`、`fields`、`options`、`items`、`data` 中同步增加
  配置项，并补齐三种语言的名称和帮助文本。

## 2. 实现 Kuma 数据适配层

- 新增 `src/lib/uptimeKuma.ts`。
- 校验和规范化 Kuma 基础地址及 slug，生成 Status Page、heartbeat 和完整页面地址。
- 定义内部的服务、分组和总体状态类型。
- 并行获取公开 Status Page 与 heartbeat 数据。
- 合并 Monitor ID，转换状态、延迟和 24 小时可用率；对未知或缺失字段使用安全默认值。
- 保持 Kuma 原始字段名和版本差异在适配层内，不让 UI 依赖原始响应结构。

## 3. 实现数据 Hook

- 新增 `src/hooks/useUptimeKumaStatus.ts`。
- 配置关闭或无效时不发起请求。
- 提供首次加载、成功数据、上次更新时间、错误和手动刷新状态。
- 使用 `AbortController`、定时器清理和请求锁，避免卸载更新与并发轮询。
- 使用 120 秒默认刷新间隔；刷新失败保留上一次成功数据。

## 4. 实现主题化服务区域

- 新增 `src/components/UptimeKumaStatus.tsx`。
- 在 `DashboardContent` 的节点列表后挂载组件。
- 使用现有 `Card`、`Badge`、`Button`、主题语义颜色和响应式 Tailwind 类。
- 展示总体状态、分组服务列表、服务状态、心跳历史条、延迟和 24 小时可用率。
- 在标题区域提供小型新窗口 Status Page 外链按钮。
- 分离「服务故障」与「数据源不可用」，不阻断节点列表。

## 5. 补充国际化与安全边界

- 在 `en.json`、`zh_CN.json`、`zh_TW.json` 增加服务区域、状态、错误、刷新和链接文案。
- 外部返回的服务名称只按普通文本渲染。
- 只允许 HTTP(S) Kuma 地址，不保存凭据、Cookie 或 API Key。
- 完整 Status Page 通过外链打开，不依赖 iframe 响应头配置。

## 6. 验证

- 解析 `komari-theme.json` 并执行 `git diff --check`。
- 通过固定响应 fixture 或导出的纯函数验证服务合并、状态映射、可用率和错误分支。
- 执行项目已有的 TypeScript/生产构建验证。
- 检查启用、禁用、接口失败、部分心跳缺失、维护状态、移动布局和外链按钮场景。
