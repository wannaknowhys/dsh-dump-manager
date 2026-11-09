[English](README.md) | 简体中文

# dsh-dump-manager

为 [dsh-llm-dump](https://github.com/wannaknowhys/dsh-llm-dump) 抓取的 dump
提供：侧边栏入口、session 列表、entry 流查看器与两种导出，以及“导出本轮”和它在
对话区里的 `LLM Dump` 标签页。

## 安装 / 移除

```sh
# 从 npm
dsh plugin --profile desktop add dsh-dump-manager

# 从源码
dsh plugin --profile desktop add github:wannaknowhys/dsh-dump-manager

# 移除
dsh plugin --profile desktop remove dsh-dump-manager
```

插件管理器接受同样的目标：`install_bundle target = dsh-dump-manager` 或本目录路径。

本 bundle 有 Host 半边（路由、导出）和浏览器半边（侧边栏卡片、面板、标签页、
设置页）。Host 模块不会热重载：修改后切换一次 bundle，让 Host 重新导入模块。

## 层级

```
panel   (侧边栏按钮)   只看 session：查看 / 文件夹 / 删除
viewer  (查看)         某个 session 的 entry：选择、导出
tab     (LLM Dump)     同一条流，挂在 轨迹 / 统计 旁边
header  (导出本轮 ▾)   按三个筛选导出最新一轮
settings (Plugins 页)  同一组选项，共享存储
```

### 面板

- 侧边栏底部、Settings 旁边的 **LLM Dumps <大小> · Exports <大小>**。
- 顶部同样显示两个大小，以及 session / 请求数量。
- 表格列：session / 工作区、请求数、大小、最后写入时间、操作。
- 行操作：查看、文件夹（打开 dump 目录）、删除（两步确认）。
- session dump 位于 `<outputDir>`（默认 `%DSH_HOME%\llm-dumps`，一个 session
  一个目录）；导出位于它旁边的 `exports\`。

### 查看器

查看器不以请求编号为维度，而是展示 **entry** —— 对话里的类型化单元：

| 类型 | 含义 |
| --- | --- |
| `system` | 组装好的 system prompt |
| `tools` | 工具定义块 |
| `user` / `assistant` | 对话消息（tool call 归在 assistant 里） |
| `tool` | 工具结果消息 |

最后一行可能是 **tail entry** —— 最新一次请求的回复，来自 `responses.jsonl`
而不是请求快照。它是唯一还没作为历史被重发的回复，带 `最新回复` 徽标
（流被截断时为 `最新·中断`）。

- 每个 session 一条连续的列表。每行：复选框、类型徽标、单行摘要、展开开关。
- **缩略**把展开的 entry 渲染成可读文本（tool call 显示为
  `→ name(args)`）；**详细**渲染完整 JSON。
- entry 每次加载 100 条：滚到底部加载下一页，页脚显示 `已渲染/总数`。
  `⤓ 到底部` 一次性渲染该段剩余的全部 entry 并跳到末尾。
- 列表上方的类型行可整类选择或隐藏：复选框选中当前段内该类型的全部 entry，
  点击名称隐藏或显示该类型（隐藏的类型仍保持选中；默认不隐藏任何类型）。
- 行的内容只在展开时才获取。
- `全选本段` 选中当前段的全部 entry。
- `Shift+点击选区间`：普通点击复选框设置锚点；Shift 点击复选框或行，会按当前
  可见顺序把锚点到该行之间的整段加入选择，因此隐藏的类型不会被卷进来。
  Shift 点击一段已全选的范围则取消它。锚点保持在最后一次普通点击处，切换段或
  隐藏类型时重置。

**段（标签页）。** 只要每次请求都只是追加消息，流就是一段。某次请求重写了历史
（压缩、重建）时流会断开，每一段各有一个标签页；只有一段时不显示标签栏。

## 导出本轮

session 标题旁的 `导出本轮 ▾` 从最后一次对话请求的快照（不是 entry 流）导出
最新一轮：

- 这一轮从最后一条 `source.kind === 'user'` 的消息开始。注入的 user 角色消息
  （`time-context`、`runtime-context`、`agent-instructions`、`skill-catalog`、
  `compact-checkpoint`、通知、`agent-message` 等）不会开启新的一轮。
- 该请求的回复来自 `responses.jsonl`；它还没有进入任何快照。
- 一次性调用（session 标题等）会被跳过：既没有 assistant 消息、也没有 user
  消息的请求不算对话调用。

三个持久化筛选保存在 `%DSH_HOME%\llm-dumps\ui.json`：

| 选项 | 默认 | 效果 |
| --- | --- | --- |
| 包含用户输入 | 开 | 保留 `kind === 'user'` 的消息 |
| 包含工具 | 开 | 保留 tool call 块和工具结果 |
| 包含注入上下文 | 关 | 保留其他 user 角色消息 |

当用户的提示被压缩掉时，这一轮会跨越多个段：每个跨过的边界都必须看起来像一次
压缩（`messages[1].source.kind === 'compact-checkpoint'`），被保留的消息会去重，
文件里会带一条说明（Markdown）或 `joinedCompaction: true`（JSON）。其他情况
一律以 `409` 拒绝，并给出 UI 转成对话框的错误码：`NO_DUMP`、`NO_USER`、`FORK`。
对话框会提供查看器，供手动分段导出。

文件：导出目录下的 `<标题>_latest_<时间戳>.md|.json`。

## 字符串

所有 UI 与导出文本都来自 `lib/strings.js`（en + zh，回退英文）。浏览器半边无法
import 它（纯脚本、无打包器），因此 `tools/sync-strings.mjs` 重新生成它内联的
副本，`tools/check-strings.mjs` 断言两份副本、两种语言完全一致。

## 导出类型

两种都写进导出目录（`<outputDir>\..\exports`），从不覆盖（`-1`、`-2`……）。

| 类型 | 内容 | 文件 |
| --- | --- | --- |
| **transcript** | 仅选中的 entry，渲染为 Markdown，段之间用 `## 段 N · seq a–b` 分隔；tail entry 会附一条说明，表示它来自响应流 | `.md` |
| **payload** | 对选择中出现的每个段，取出最后包含这些 entry 的完整请求快照（`lastSeq`）：展开后的 messages + tools + tool history + 采样，一行紧凑 JSON | `.json`，每段一个 |

在一个 132 次请求的 session 里全选，会得到约 1.2 MB 的 transcript，而不是
“每请求一份快照”模型下的约 162 MB。

## 设置页

`Settings → Plugins → LLM Dump Settings` 有两组：

- **导出本轮** —— 与顶部菜单写入的是同一组三个筛选和格式，存储于
  `%DSH_HOME%\llm-dumps\ui.json`。
- **抓取（dsh-llm-dump）** —— 代 llm-dump 编辑
  `%DSH_HOME%\llm-dumps\config.json`：输出目录，因为已有 dump 不会随之迁移，
  所以需要两步确认。未知键会在重写后保留；文件是原子替换的。目录浏览器覆盖
  各盘符（Windows）或 `/`，对 UNC 目标提供 Home / 上级 / 可编辑路径，对裸
  `\\server\` 提供按主机的共享列表，在打开真实目录的地方提供“新建文件夹”。

## 数据格式

读取方理解 **dsh-llm-dump 数据格式版本 1**：每个 session 一个带时间戳、只追加的
`requests.jsonl`，加上用于内容去重的 `objects.jsonl`，以及记录最新请求回复的
`responses.jsonl`。未知字段会被忽略，因此更新的 llm-dump 可以新增字段而不破坏
本读取方。格式本身记录在 llm-dump 的 README 中。

启动时以及每次请求 overview 时，Host 半边会解析 `dsh-llm-dump/package.json`，
把它的 `dsh.formatVersion` 与本构建能读的范围（`1`）比较。对方更新时会在 Host
日志里提示一次，并在面板顶部显示一条警告；不会阻止读取。`DSH_LLM_DUMP_PACKAGE`
可以让检查指向另一份该文件，用于并排安装。

## Host 路由（仅 loopback）

| 方法 | 路径 | Body / query |
| --- | --- | --- |
| GET | `/api/dsh-dumps/overview` | — |
| GET | `/api/dsh-dumps/stream` | `?id=` |
| GET | `/api/dsh-dumps/entry` | `?id=&i=` |
| GET/POST | `/api/dsh-dumps/prefs` | `{ export: { … } }`（GET 返回 `{ prefs, defaults }`） |
| GET/POST | `/api/dsh-dumps/capture` | `{ outputDir? }` → `{ capture, defaults, exportsDir }` |
| GET | `/api/dsh-dumps/roots` | `{ roots, home, platform, stale, probedAt, durationMs }` |
| GET | `/api/dsh-dumps/shares` | `?host=` → `{ shares: [{ name, path }] }`（`net view`） |
| POST | `/api/dsh-dumps/latest` | `{ id, lang }` → `{ file, bytes, messages, joinedCompaction }` 或 `409 { code }` |
| POST | `/api/dsh-dumps/export` | `{ kind, id, entries: [i], lang }` |
| POST | `/api/dsh-dumps/reveal` | `{ which: 'root' \| 'exports' }` 或 `{ id }` |
| POST | `/api/dsh-dumps/delete` | `{ id }` |

id 只允许 `[A-Za-z0-9._-]`，删除只触碰输出目录的直接子项，所有路由都拒绝
非 loopback 调用方。

## 测试

```powershell
npm test
```

在系统临时目录下的一次性 `DSH_HOME` 中，用合成的折叠 dump 运行，不会碰真实
profile：

- `tools/check-strings.mjs` —— 两份字符串副本同步且完整。
- `test/smoke-client.mjs` —— 用桩 React 加载浏览器半边，断言所有贡献都经
  `slots.inject`（直接在 apply 时 `register` 会因槽位尚未声明而抛错），并确认
  `locale` 已注入。
- `test/smoke-compat.mjs` —— 启动警告、`/overview` 里的兼容信息，以及纯比较函数。
- `test/smoke-latest.mjs` —— 导出本轮：筛选、fork 拒绝、偏好、抓取配置、目录
  根列表。
- `test/smoke-tail.mjs` —— tail entry：从 `responses.jsonl` 标记、两种语言的
  导出说明，以及被中断的流。

## 已知限制

`payload` 在语义上完整，但不与线上请求体逐字节相同：折叠存储保留的是值，而不是
adapter 最终的序列化，所以键顺序可能不同。token 数基本一致；要精确抓取线上
请求体需要 fetch hook。
