# 导航栏站点图标可配置设计

- 日期：2026-09-02
- 状态：已批准，待规格审阅

## 背景

`src/components/NavBar.tsx` 当前在站点名称左侧渲染固定的 `K` 字符。主题的管理设置由
`komari-theme.json` 声明，Komari 管理后台负责生成设置界面并将值保存到
`theme_settings`。前端通过 `/api/public` 取得该配置，`ThemeContext` 负责解析和向组件提供
管理设置。

## 目标

1. 允许管理员在主题设置中填写站点图标图片 URL。
2. 所有访客通过公共主题配置看到相同的图标。
3. 未填写、格式不支持或图片加载失败时，稳定回退到默认 `K`。
4. 不改变当前导航栏高度、圆角容器、站点名称和响应式布局。

## 非目标

- 本次不新增图片上传接口或后端文件存储。
- 本次不修改 Favicon、PWA 图标或浏览器标签页图标。
- 本次不允许访客通过本地主题覆盖站点品牌图标。

## 方案决策

使用主题托管字段 `logoUrl`，数据保存位置为 `theme_settings.logoUrl`。

在 `komari-theme.json` 的 `configuration` 下为该字段增加声明：

- `managedFields`：使用当前管理设置格式，类型为 `text`，默认值为空字符串。
- `fields`、`options`、`items`、`data`：同步增加对应的字符串字段，兼容仓库中仍被部分
  Komari 版本使用的旧配置格式。
- 字段名称使用“Logo 图片链接 / Logo Image URL”，并提供“留空使用默认 K”的说明。

这样设置页会自动出现 URL 输入项，不需要新增一套主题内的管理员页面，也不需要改变后端
站点设置数据结构。

## 数据流与类型

1. 管理员在 Komari 设置页保存 `logoUrl`。
2. `/api/public` 返回包含 `theme_settings` 的公共信息。
3. `ThemeProvider` 解析 `theme_settings`，只接受字符串并去除首尾空白，写入
   `ManagedThemeSettings.logoUrl`。
4. `NavBar` 通过 `useTheme()` 读取该值，并依据 URL 状态选择图片或回退标记。

类型层面只扩展 `ManagedThemeSettings`，不把图标加入访客本地可覆盖的 `ThemeConfig`，从而
保持品牌配置由管理员统一管理。`mergeManagedSettings` 同时识别 `logoUrl`，保证未来管理
设置合并时不会丢失该字段。

## 导航栏渲染行为

- `logoUrl` 经过 `trim()` 后为空：显示现有的 `K`。
- 仅允许 HTTP(S) 或当前站点的相对图片地址；其他协议视为不可用并显示 `K`。
- URL 可用时，在现有 32×32 圆角主色容器中显示图片，使用 `object-contain`，不改变容器
  尺寸和导航栏间距。
- 图片触发 `onError` 时隐藏破损图片并显示 `K`，不弹出提示，避免影响访客浏览。
- URL 发生变化时清除之前的加载失败状态，使管理员更新地址后可以重新尝试加载。
- 图片作为站点名称旁的装饰元素处理，使用空 `alt`，避免屏幕阅读器重复朗读站点名称；默认
  `K` 也保持装饰语义。

## 错误处理与兼容性

- 公共配置未加载、接口异常或没有 `logoUrl` 时，首屏和最终状态都保持默认 `K`。
- 已保存但已失效的外部图片 URL 不会造成布局塌陷，因为图片始终位于固定尺寸容器内。
- 旧版 Komari 忽略未知的 `logoUrl` 时，主题仍显示默认 `K`；新版管理页读取字段后可正常
  保存和回显。

## 验证计划

实现后执行：

1. 使用 Node.js 解析 `komari-theme.json`，确认 JSON 合法且五种配置声明均包含 `logoUrl`。
2. 执行 TypeScript 检查，确认 `NavBar`、`ThemeContext` 类型通过。
3. 执行生产构建，确认静态主题可以正常打包。
4. 手动覆盖以下场景：空值回退、HTTP(S) 图片显示、相对地址显示、错误地址回退，以及
   更新 URL 后重新加载。

## 影响范围

- `src/components/NavBar.tsx`
- `src/contexts/ThemeContext.tsx`
- `komari-theme.json`

不涉及 API 路由、数据库迁移和其他页面布局。
