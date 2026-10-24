# DSH 本地接口一览（给潮汐用的那部分）

端口：`http://127.0.0.1:19387`（只绑本机）
调用方式：JSON-RPC 风格的信封 `{ rpcId, method, payload }` → POST `/api/<method>`
在代码里就是 `api.sessions.list(...)` 这种写法，方法名与 RPC 名一一对应。

## sessions　会话

| 方法 | 一句话 |
| --- | --- |
| `list` | 列出会话（返回 `items`，含 sessionId、updatedAt、projections.values.title、running、cwd） |
| `search` | 按内容搜会话里的消息 |
| `create` | 新建会话（可指定 cwd、agentPreset） |
| `history` | 取某个会话的历史消息（分页，带 projections 快照） |
| `models` | 当前模型选择 + 每个提供方下可选的模型 |
| `selectModel` | 切换模型 / 推理强度 |
| `rename` | 改会话标题 |
| `fork` | 从某个位置复制出一支新会话 |
| `prompt` | **往会话里送一条消息**（`{sessionId, mode:'queue', content:[{type:'text',text}]}`） |
| `attachment` | 取附件 |
| `updateQueue` | 编辑/删除排队中的消息 |
| `cancel` | 中止当前这一轮 |

## subagents　子代理

`list` / `history` / `prompt` / `interrupt` —— 和会话那套几乎一样，对象换成子代理。

## host　宿主

`describe` / `pickDirectory` / `listDirectory` / `createDirectory` / `openPath`
—— 问环境信息、弹目录选择框、列目录、建目录、用系统打开某个路径。

## workspace　工作区

`list` / `create` / `rename` / `delete` / `insertBefore` / `insertSessionBefore` / `archiveSession`
—— 管理“把会话分组”的那一层。

## agentPresets　预设

`list` / `select` / `read` / `copy` / `openDocument` / `remove`
—— 读预设文本、复制一份、切换。

## goals　目标

`create` / `edit` / `pause` / `resume` / `complete` / `clear`
—— 长目标的增删改。

## settings　设置

`describe` / `update` / `replace` / `mutate` / `openDocument`
—— 读写 DSH 自己的设置命名空间。

## skills　技能

`list` —— 只读，列出这个会话能用的 skill。
（“调用技能”不走单独接口，就是普通的一次 `prompt`，内容里以 `/名字` 开头。）

## credentials　凭据 / command　命令

凭据相关、以及宿主侧的斜杠命令执行。

---

## 事件流（推给我，不用我轮询）

固定端点 `/api/remote.mux`。打开后服务端持续往这个响应体里写，一帧一帧：

- `turn/start`、`turn/end` —— 一轮开始/结束
- `assistant/message` —— 我这一轮的完整回复（`assistant/chunk` 是流式碎块）
- `tool/*` —— 工具调用与结果
- `question`、`approval` —— 反过来问我/要审批

潮汐下一步要做的，就是订阅这个流，把 `assistant/message` 拼起来。

## 文档原文

- `D:\qq-bridge\node_modules\@deepseek-ai\dsh-host-apiproxy\README.zh.md`（中文，31KB，像规格书）
- `D:\qq-bridge\node_modules\@deepseek-ai\dsh-host-apiproxy\lib\types\*.d.ts`（类型声明，比 README 好读）
