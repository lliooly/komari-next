# Fork 主题推送后自动发布设计

## 背景

当前主题是 Next.js 静态导出项目。Komari 后台的“更新主题”不会读取 GitHub 分支源码，而是读取已安装主题 `komari-theme.json` 中的 `url`，请求该 GitHub 仓库的最新 Release，并下载 Release 附件中的主题 ZIP。因此，仅把源码 push 到 GitHub 不会让后台看到新版本。

当前仓库已有 Release 构建工作流，但它只在手动创建 Release 后运行；另一个预览工作流只上传 GitHub Actions artifact，也不会成为 Komari 更新接口可下载的 Release 附件。

## 目标

1. 仅在用户自己的 fork 仓库中建立自动发布流程。
2. 推送到 fork 的发布分支后，自动构建合法的 Komari 主题 ZIP 并创建 GitHub Release。
3. 让已安装的主题可以在 Komari 后台主题详情中直接点击“更新主题”获取最新构建。
4. 保留现有主题代码、主题设置和本地未提交改动，不改 Komari 上游仓库。
5. 失败时不发布不完整主题包，并能在 GitHub Actions 日志中定位原因。

## 非目标

- 不修改 Komari 服务端或官方后台。
- 不让 Komari 直接执行 GitHub 源码构建。
- 不把 GitHub Actions artifact 当作主题更新包。
- 不自动修改上游仓库、提交 Pull Request 或推送到 `upstream`。
- 不改变现有 `theme_settings` 的读取和保存逻辑。

## 已确认的 Komari 约束

- 主题 ZIP 根目录必须有 `komari-theme.json`。
- ZIP 中需要包含构建后的 `dist/` 静态资源。
- 已安装主题的 `url` 必须指向用户自己的公开 GitHub 仓库；否则后台更新会继续跟随原作者仓库。
- Komari 的更新接口会从 GitHub `releases/latest` 获取 Release，并使用 Release 资源列表中的第一个附件作为主题包，因此自动发布的 Release 只放一个主题 ZIP，避免下载到错误文件。
- GitHub 的 Source code ZIP 不是主题包，不能直接作为更新附件。

## 方案

### 发布入口

将现有主题打包工作流调整为以下触发方式：

- `push` 到 fork 的 `main` 分支时自动执行；
- 保留 `workflow_dispatch`，用于需要时手动重跑或验证发布流程。

默认只发布 `main`，避免多个开发分支竞争 Komari 的 latest Release。开发分支合并到 fork 的 `main` 后即会发布。

### 构建与打包

工作流执行：

1. checkout 当前 fork 的提交；
2. 使用 Node.js 22 和锁文件安装依赖；
3. 执行 `npm run build`；
4. 在临时目录中复制 `preview.png`、`komari-theme.json` 和 `dist/`；
5. 检查三个必需内容存在；
6. 生成根目录包含 `komari-theme.json` 的 `dist-release.zip`。

构建时只在 CI 工作目录中将 manifest 的 `url` 规范化为 `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}`，并把版本生成成 `主版本.次版本.(源补丁版本 + Actions run number)-dev.短SHA`，例如 `1.4.20-dev.a1b2c3d`；不回写仓库中的 manifest，避免机器人提交造成循环。源文件中的 URL 也会改为当前 fork，保证第一次安装的主题就绑定正确来源。

### Release 策略

每次成功 push 生成一个唯一的、公开发布的 GitHub Release：

- tag 使用 `v` 加上 CI 生成版本，例如 `v1.4.20-dev.a1b2c3d`，避免不同构建互相覆盖；
- Release 标记为 GitHub Latest，使 Komari 的 `releases/latest` 能取得它；
- 只上传一个名为 `dist-release.zip` 的资产；
- Release 说明包含提交 SHA，便于回溯；
- 同一个 Actions run 重试时，覆盖同名 ZIP，而不是创建重复资产。

GitHub Actions 使用自动提供的 `GITHUB_TOKEN`，权限限定为当前 fork 的 `contents: write`。工作流不配置上游仓库地址，也不使用个人访问令牌。

### 首次切换

由于当前安装包的 manifest URL 指向 `tonyliuzj/komari-next`，发布自动流程后需要从 fork 的第一版 Release 重新上传/导入一次主题，使本地安装目录中的 manifest URL 切换到 `lliooly/komari-next`。完成后，后续更新均从 fork 获取。

## 数据流

```text
fork main push
    -> GitHub Actions checkout/build/package
    -> fork GitHub Release (latest + dist-release.zip)
    -> Komari /api/admin/theme/update
    -> GitHub releases/latest
    -> 下载并校验主题 ZIP
    -> 覆盖 ./data/theme/next
```

## 错误处理

- 构建失败：不创建 Release，保留旧主题可用。
- `komari-theme.json`、`preview.png` 或 `dist/` 缺失：工作流失败，不上传包。
- GitHub token 无法写入 Release：工作流失败，并在日志中提示需要检查 Actions 的写权限。
- 主题包下载或校验失败：由 Komari 后台拒绝更新，旧主题目录不应被本次失败包替换。
- 若后台仍显示原作者 URL：提示先重新安装 fork Release 包；不通过修改上游仓库解决。

## 验证

### 本地验证

- 执行 `npm run build`；
- 检查 ZIP 根目录存在 `komari-theme.json`、`preview.png`、`dist/`；
- 检查 manifest 的 `short` 保持为 `next`，`url` 指向 fork。

### GitHub 验证

- push 到 fork 的 `main`；
- 确认 Actions 成功；
- 确认最新 Release 为非 draft、非 prerelease，并且只有 `dist-release.zip`；
- 下载 Release ZIP，验证与本地包结构一致。

### Komari 验证

- 首次从 fork Release 安装/覆盖主题；
- 在主题详情确认 URL 为 fork；
- 再 push 一个可识别的小改动；
- 等待 Actions 完成后点击“更新主题”；
- 刷新前台，确认新构建生效且主题设置仍可读取。

## 风险与取舍

自动发布会为每次 push 增加一个 Release，Release 列表会增长；这是为了让 `releases/latest` 稳定、可追溯，并避免共享可变下载地址的缓存和并发问题。若以后需要控制 Release 数量，可以再增加单独的 rolling/nightly 发布通道，但不纳入本次改动。
