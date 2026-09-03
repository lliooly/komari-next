# Uptime Kuma 服务状态集成设计

- 日期：2026-09-03
- 状态：方案已批准，待规格审阅

## 背景

当前主题通过 Komari 的探针节点展示服务器状态，但服务器在线不代表网站、API、数据库等业务服务正常。用户已经部署了 Uptime Kuma，希望在现有主题中同时展示这些业务服务的状态。

当前仓库是静态导出的 Next.js 主题：

- 页面通过 `/api/*` 与 Komari 后端通信，仓库本身没有可用于隐藏密钥的服务端 API。
- 主题配置由 `komari-theme.json` 声明，Komari 管理端将配置保存到 `theme_settings`。
- `ThemeContext` 通过 `/api/public` 读取公共主题配置。
- 仪表盘在 `DashboardContent` 中渲染节点地图和节点列表。

因此，本功能使用 Uptime Kuma 已发布的公开 Status Page 数据，通过浏览器接口读取；不使用需要账号密码或 API Key 的 Kuma 管理接口。

## 目标

1. 在首页节点列表下方增加一个 Kuma 服务状态区域。
2. 服务区域使用当前主题的卡片、徽章、语义颜色和响应式布局，不直接复制 Kuma 的视觉样式。
3. 每个公开服务展示名称、当前状态、当前延迟和 24 小时可用率。
4. 展示服务总体状态，例如「全部正常」「存在异常」或「暂无数据」。
5. 提供可折叠的完整 Kuma Status Page；用户可以查看 Kuma 自带的历史图表、事件记录和说明，也可以直接新窗口打开。
6. 通过 Komari 主题管理设置配置 Kuma 地址和 Status Page slug，默认关闭，不影响未配置 Kuma 的现有用户。
7. Kuma 请求失败时不影响 Komari 节点数据和页面其他区域。
8. Komari 与 Kuma 位于不同机器时功能仍然正常，不要求合并部署。

## 非目标

- 不在 Komari 主题中创建、编辑或删除 Kuma Monitor。
- 不接入需要 Kuma 登录态、用户名密码或 API Key 的私有管理接口。
- 不在主题中重建 Kuma 的完整历史存储、事件管理和图表系统。
- 不修改 Komari 后端数据库、RPC2 协议或节点状态接口。
- 不把 Kuma 服务状态混入 Komari 节点的在线数量、地图或服务器统计。
- 不要求 Kuma 与 Komari 运行在同一台机器、同一容器或同一域名下。

## 方案决策

采用「API 驱动的原生服务列表 + 可选的完整 Status Page」组合方案。

### 原生服务列表

前端调用以下公开 Status Page 接口：

```text
GET {kumaBaseUrl}/api/status-page/{slug}
GET {kumaBaseUrl}/api/status-page/heartbeat/{slug}
```

第一个接口提供 Status Page 配置、分组和公开 Monitor 列表；第二个接口提供 Monitor 的最新心跳和可用率。前端在适配层中按 Monitor ID 合并两个响应，避免组件直接依赖 Kuma 原始响应结构。

Uptime Kuma 官方资料说明，Status Page 接口主要供 Kuma 自身使用，第三方集成可能受到版本变更影响；公开 Status Page 默认还可能缓存约 5 分钟。因此接口调用集中在独立适配层，服务区域使用分钟级刷新和手动刷新，不复用 Komari 约 2 秒的实时轮询。

参考：[Uptime Kuma API Documentation](https://github.com/louislam/uptime-kuma/wiki/API-Documentation/692198f84f3675a53a8ece7eb91a6a84566ee98e)、[Uptime Kuma Status Page](https://github.com/louislam/uptime-kuma/wiki/Status-Page)。

### 完整 Status Page

服务区域下方提供折叠内容，地址由以下规则生成：

```text
{kumaBaseUrl}/status/{slug}
```

折叠内容默认延迟加载 iframe，避免首页初始加载额外的 Kuma 页面资源；同时始终提供「在新窗口打开」链接作为可靠入口。如果 Kuma 响应头禁止跨域 iframe，原生服务列表仍然可用，用户通过新窗口链接查看完整页面。

Uptime Kuma 官方说明，跨站 iframe 可能需要设置 `UPTIME_KUMA_DISABLE_FRAME_SAMEORIGIN=true`；该设置会降低同源保护并增加点击劫持风险，所以 iframe 不是服务列表的必要依赖，必须保留新窗口回退入口。

参考：[Uptime Kuma Status Page：iframe 说明](https://github.com/louislam/uptime-kuma/wiki/Status-Page)。

## 配置设计

配置保存在 `theme_settings` 下的 `uptimeKuma` 对象中，并作为管理员统一配置，不允许访客通过本地主题覆盖：

```json
{
  "uptimeKuma": {
    "enabled": false,
    "baseUrl": "https://status.example.com",
    "slug": "main",
    "showEmbeddedPage": true
  }
}
```

字段定义如下：

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `uptimeKuma.enabled` | `boolean` | `false` | 是否在首页显示 Kuma 服务区域 |
| `uptimeKuma.baseUrl` | `string` | `""` | Kuma 实例基础地址，不包含 `/api`、`/status` 或末尾 `/` |
| `uptimeKuma.slug` | `string` | `""` | 已发布的 Status Page slug |
| `uptimeKuma.showEmbeddedPage` | `boolean` | `true` | 是否显示可折叠的完整 Status Page 区域 |

配置校验规则：

- `baseUrl` 只接受 `http:` 或 `https:`，读取时去除首尾空格和末尾 `/`。
- `slug` 读取时去除首尾空格，并进行 URL 路径编码。
- `enabled` 为 `false` 时不发起 Kuma 请求，也不渲染空占位区域。
- `enabled` 为 `true` 但地址或 slug 无效时，显示非阻塞的配置错误状态，不把所有服务标记为故障。
- 不保存也不读取 Kuma 凭据、Cookie 或 API Key。

`ManagedThemeSettings` 增加 `UptimeKumaSettings` 类型，`ThemeContext` 需要在规范化和合并管理配置时保留 `uptimeKuma` 对象。该配置不加入 `ThemeConfig` 和访客本地覆盖逻辑，确保管理员设置对所有访客一致生效。

`komari-theme.json` 中现有的配置声明格式需要同步增加上述字段：

- `configuration.managedFields` 增加管理员可管理字段。
- `configuration.fields`、`options`、`items`、`data` 按当前文件的兼容格式同步增加对应字段。
- 中英文及繁体中文名称、帮助文本保持一致，并说明 Kuma Status Page 必须已发布且浏览器需要能够访问该地址。

## 数据流与模块边界

### Kuma API 适配层

新增 `src/lib/uptimeKuma.ts`，职责包括：

1. 生成 Status Page 和心跳接口地址。
2. 发起不带凭据的 `GET` 请求，并检查 HTTP 状态码。
3. 校验并规范化 Status Page 响应和 heartbeat 响应。
4. 根据 Monitor ID 合并名称、分组、状态、延迟和可用率。
5. 对未知字段、未知状态和不完整数据提供安全默认值。

适配层向组件输出稳定的内部类型，不让 UI 依赖 Kuma 的 `publicGroupList`、`heartbeatList` 等原始字段名。

内部服务状态至少支持以下语义：

- `up`：服务正常。
- `down`：服务故障。
- `pending`：等待首次检测或状态尚未确定。
- `maintenance`：维护中。
- `unknown`：响应缺少可用状态，或 Kuma 返回了未知状态值。

延迟为空时显示 `—`；可用率以百分比显示。心跳接口请求失败属于「数据源不可用」，不能转换成每个服务 `down`。

### 数据 Hook

新增 `src/hooks/useUptimeKumaStatus.ts`，职责包括：

- 根据 `uptimeKuma` 配置决定是否加载。
- 并行请求两个公开接口，避免顺序请求增加等待时间。
- 使用 `AbortController` 取消组件卸载后的请求。
- 提供 `data`、`isLoading`、`error`、`lastUpdatedAt` 和手动 `refresh`。
- 使用分钟级定时刷新；定时请求进行防并发保护。
- 已经有成功数据后，刷新失败保留上一次数据，并显示过期或错误提示；首次失败则显示空状态。

默认刷新间隔设为 5 分钟，与公开 Status Page 的缓存特性一致；不新增可调刷新间隔字段，避免管理员设置一个实际上不会改变 Kuma 缓存结果的数值。

### 页面组件

新增 `src/components/UptimeKumaStatus.tsx`，并在 `DashboardContent` 的 `NodeDisplay` 后渲染。组件只负责展示和交互，不直接发起原始 API 请求。

建议结构：

1. 区域标题：服务状态、服务数量、总体状态、最近检查时间和刷新按钮。
2. 服务分组：沿用 Kuma Status Page 的公开分组顺序。
3. 服务行或卡片：服务名、状态徽章、延迟、24 小时可用率。
4. 完整页面入口：折叠面板中的 lazy iframe，以及新窗口打开链接。

组件使用现有 `Card`、`Badge`、`Button` 和 Tailwind 语义类，不新增独立颜色系统。状态颜色建议使用：正常为绿色、故障为红色、维护或等待为黄色、未知为灰色。

总体状态计算规则：

- 至少一个 `down`：总体为「存在故障」。
- 没有 `down`，但存在 `maintenance`、`pending` 或 `unknown`：总体为「状态异常或待确认」。
- 所有服务均为 `up`：总体为「全部正常」。
- 没有公开服务：总体为「暂无服务数据」。
- 请求或配置失败：总体为「暂时无法获取」，不归因于 Monitor 故障。

服务名称、状态文字和分组名称全部按普通文本渲染，不使用 `dangerouslySetInnerHTML`。外部 URL 只用于已校验的 Kuma 页面链接和 iframe `src`。

## 跨域与部署约束

Komari 和 Kuma 位于两台机器不会造成架构问题，反而能保持监控和被监控服务的故障域独立。前端只需要能够从访客浏览器访问 `baseUrl`，并且两个公开 API 响应允许当前站点跨域读取；否则原生列表会进入「暂时无法获取」状态。

本功能不在前端放置 Kuma 密钥，也不把管理 API 暴露给访客。若 Kuma 状态页不是公开发布状态，接口返回的 `404` 按配置或数据源错误处理，而不是显示服务全部故障。

## 错误处理与兼容性

- Kuma 未启用：不发请求、不占布局空间。
- 配置不完整：显示轻量错误卡片，节点列表和其他仪表盘功能保持正常。
- CORS、DNS、TLS、网络超时或 HTTP 非 2xx：显示数据源不可用，并保留已成功数据（如果存在）。
- Status Page 结构缺字段：保留可识别的服务，缺失字段使用 `—` 或 `unknown`。
- 未知状态值：按 `unknown` 渲染，不能默认视为正常或故障。
- Kuma 接口版本变化：只需要调整 `uptimeKuma.ts` 适配层，不修改 UI 组件。
- iframe 被 `X-Frame-Options` 或 CSP 拒绝：原生列表不受影响，新窗口链接仍然可用。
- Kuma 服务本身不可用：只影响 Kuma 区域，不阻塞 Komari 节点状态、登录和主题设置。

## 验证计划

实现后至少验证以下内容：

1. 使用 JSON 解析检查 `komari-theme.json`，确认配置声明完整且文件合法。
2. 使用固定 API fixture 验证分组、Monitor 合并、状态映射、延迟为空、可用率转换和未知字段处理。
3. 验证 `enabled=false` 时无网络请求，`enabled=true` 时只请求两个公开接口。
4. 验证接口失败不会把所有服务显示为 `down`，并且不会阻塞节点区域。
5. 验证轮询期间不会产生并发请求，组件卸载后不会更新状态。
6. 验证空配置、CORS 失败、404、部分 Monitor 缺心跳、维护状态和 iframe 被拒绝等场景。
7. 执行 TypeScript 检查和生产构建，确认静态导出正常。
8. 在桌面和移动宽度下检查服务列表、分组、状态徽章、折叠区域和新窗口链接布局。

## 影响范围

预计涉及：

- `src/components/DashboardContent.tsx`
- 新增 `src/components/UptimeKumaStatus.tsx`
- 新增 `src/hooks/useUptimeKumaStatus.ts`
- 新增 `src/lib/uptimeKuma.ts`
- `src/contexts/ThemeContext.tsx`
- `komari-theme.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/zh_CN.json`
- `src/i18n/locales/zh_TW.json`

不涉及 Komari 后端、数据库迁移、RPC2 协议、节点数据结构和现有节点卡片行为。
