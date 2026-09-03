# 全局矩形 UI 圆角统一设计

- 日期：2026-09-03
- 状态：已批准，待规格审阅

## 背景

主题当前以 `--radius: 0.75rem` 作为基础值，但 `src/global.css` 将
`--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-xl` 派生为不同尺寸，页面和
组件中还混用了 `rounded`、`rounded-sm`、`rounded-md`、`rounded-lg`、`rounded-xl`、
`rounded-2xl`、`rounded-3xl` 及任意值圆角。

剩余价值计算器的外层选项卡和内部选项分别使用不同半径，是当前最明显的视觉问题。地图
面板、卡片、弹窗、输入框、下拉菜单、节点详情和管理面板也存在同类的不一致。

## 目标

1. 所有矩形或圆角矩形 UI 使用同一个圆角值。
2. 计算器中选项卡容器与其内部选项的圆角一致，且嵌套层级不再出现不同半径。
3. 统一规则通过主题 token 维护，能够覆盖共享 UI 原语和页面级样式。
4. 保留圆形、胶囊型元素以及纯绘制图形所需的特殊几何形状。
5. 不改变现有业务逻辑、交互、颜色、间距、尺寸、响应式行为或边框策略。

## 非目标

- 不重新设计整体视觉风格，也不调整当前 `--radius` 的数值。
- 不把状态点、头像、徽章、进度条、拖拽条等 `rounded-full` 元素改成普通圆角。
- 不修改 SVG 图表、CSS 仪表盘和滚动条等纯绘制细节的几何表现。
- 不引入新的圆角配置项或管理员设置。

## 方案决策

继续使用现有 `--radius: 0.75rem` 作为唯一矩形圆角 token。将主题中已使用的语义半径
token `--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-xl`、`--radius-2xl` 和
`--radius-3xl` 全部指向 `var(--radius)`。这样现有的 `rounded-*` 类会在不改变组件
结构的前提下渲染为同一个矩形圆角。

对于 token 无法覆盖的写法，改为使用同一 token：

- 计算器中显式的 `rounded-2xl`、`rounded-3xl`、`rounded-xl` 和 `rounded-lg` 由统一
  token 渲染，保证外层与内层选项一致。
- 地图面板中 `28px`、`1.75rem`、`1.5rem`、`1rem`、`0.85rem` 等矩形表面半径改为
  `var(--radius)`，单边抽屉圆角继续使用统一 token 的对应方向。
- 复用组件和详情字段中的裸 `rounded`、任意值矩形圆角改为统一 token；属于紧凑标签或
  胶囊语义的元素不改动。
- `rounded-xs`、`rounded-[2px]` 等仅用于图表柱、图例色块或滚动条的细节保留原值。

## 组件与样式范围

共享 UI 原语中的 `Tabs`、`SegmentedControl`、`Card`、`Dialog`、`Drawer`、`Input`、
`Textarea`、`Button`、`Alert`、`Popover`、下拉菜单、选择器、`Skeleton` 和复选框沿用
现有结构，仅通过统一 token 获得相同圆角。计算器、节点卡片、节点表格、地图视图、实例
详情、上传弹窗、主题切换器和管理面板中的矩形容器同步复查；自定义 CSS 中的矩形
`border-radius` 也按同一规则处理。

圆角的方向性仍可保留，例如抽屉只显示顶部或底部圆角，但可见圆角的数值必须来自
`var(--radius)`。`rounded-none` 和 `rounded-[inherit]` 代表明确的几何约束，继续保留。

## 兼容性与风险控制

统一半径不会改变元素的盒模型或尺寸。对于尺寸小于两倍半径的控件，浏览器会按 CSS 规范
自动压缩角半径，不会造成布局溢出；圆形和胶囊元素仍由 `rounded-full` 控制。地图和弹窗
继续使用 `overflow-hidden`，确保背景和内容按新的外层圆角裁切。

## 验证计划

实现后执行：

1. 使用静态搜索复查所有 `rounded-*` 和 `border-radius`，确认剩余非统一值只属于圆形、
   胶囊、明确的 `none/inherit` 或图形/滚动条例外。
2. 执行 `git diff --check`，确认无空白错误。
3. 执行项目生产构建，确认 Tailwind token、React/TypeScript 和 Next.js 打包均通过。
4. 手动检查计算器四个筛选项、货币选项、卡片、地图面板、弹窗、输入框、下拉菜单和管理
   详情字段，覆盖浅色、深色、桌面和移动布局。

## 影响范围

- `src/global.css`：统一主题圆角 token。
- 包含矩形圆角声明的共享 UI、页面组件和自定义 CSS：按上述规则收敛显式任意值和裸
  `rounded`，保留已定义的例外。
- 不涉及数据、API、国际化内容、状态管理和业务计算。
