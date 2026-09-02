# 导航栏站点图标可配置实现计划

## 1. 主题设置声明

- 在 `komari-theme.json` 的 `managedFields`、`fields`、`options`、`items`、`data` 中增加
  `logoUrl` 字段。
- 使用字符串 URL 类型、空字符串默认值和中英文说明，确保新旧 Komari 配置格式都能显示
  设置项。

## 2. 管理设置解析

- 在 `ManagedThemeSettings` 中声明可选的 `logoUrl`。
- 在 `normalizeManagedThemeSettings` 中仅接受字符串并清理首尾空白。
- 在 `mergeManagedSettings` 的顶层字段列表中保留 `logoUrl`，避免管理设置合并时丢失。

## 3. 导航栏渲染

- `NavBar` 读取 `managedThemeSettings.logoUrl`。
- 允许 HTTP(S) 和当前站点相对地址，拒绝其他协议。
- 在原有固定尺寸容器中渲染图片；空值、非法地址或 `onError` 均显示 `K`。
- URL 变化时重置加载失败状态，保证更新配置后会重新尝试加载。

## 4. 验证

- 解析主题 JSON 并统计五种配置声明中的 `logoUrl`。
- 执行 `npx tsc --noEmit`。
- 执行 `npm run build`。
- 检查 Git diff 和工作区状态，确认不包含用户无关修改。
