# 全局矩形 UI 圆角统一实现计划

## 1. 收敛主题 token

- 在 `src/global.css` 保留 `--radius: 0.75rem`。
- 将 `--radius-sm/md/lg/xl/2xl/3xl` 全部映射到 `var(--radius)`。
- 不改动 `rounded-full`、`rounded-none`、`rounded-[inherit]` 和图形细节 token。

## 2. 修复显式非 token 圆角

- 将剩余价值计算器的外层面板、选项卡列表、选项和内容卡片显式收敛到统一圆角。
- 将节点地图 TSX/CSS 中的 `28px`、`1.75rem`、`1.5rem`、`1rem` 和 `0.85rem` 矩形表面
  改为统一 token。
- 将节点显示自定义 CSS 的详情区块、管理端详情字段和复选框的任意值矩形圆角改为统一
  token。
- 保留紧凑标签、胶囊、状态点、进度条、图表和滚动条的特殊几何。

## 3. 静态审计

- 搜索 TSX、TS、CSS 和主题资源中的 `rounded-*`、裸 `rounded` 与 `border-radius`。
- 对每个剩余不同值标记为统一 token、圆形/胶囊、明确的 none/inherit 或纯绘制例外。

## 4. 验证

- 执行 `git diff --check`。
- 执行项目生产构建，验证 Tailwind、TypeScript 和 Next.js 打包。
- 汇总修改文件、验证结果和保留的几何例外。
