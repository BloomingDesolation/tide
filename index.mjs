
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const BRIDGE = 'D:/qq-bridge'

const cfg = JSON.parse(
  fs.readFileSync(`${BRIDGE}/config.json`, 'utf8').replace(/^\uFEFF/, '')
)

const { NodeApiClient, unwrap, createTurnCollector } = await import(
  pathToFileURL(`${BRIDGE}/src/dsh-client.js`).href
)

const api = new NodeApiClient(cfg.dsh.baseUrl, undefined, {
  token: cfg.dsh.authToken,
  tokenExplicit: cfg.dsh.authTokenExplicit === true
})

const stream = api.events.mux()

const list = unwrap(await api.sessions.list({}), 'sessions.list')
const rows = list.items ?? []

if (rows.length === 0) { 
  console.log('DSH 里一个会话都没有，先在网页上开一个再来')
  process.exit(0)
}


const wanted = process.env.TIDE_SESSION || '' 
console.log(`++ ${wanted.toString()} ++ `);
const sorted = [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
const target = wanted 
  ? sorted.find((s) => s.sessionId === wanted)
  : sorted[0]

stream.follow(target.sessionId)
const collector = createTurnCollector()

if (!target) {
  console.log(`找不到会话 ${wanted}`)
  console.log('现有会话：')
  for (const s of sorted.slice(0, 10)) console.log(' -', s.sessionId)
  process.exit(1)
}

const title = target.projections?.values?.title ?? '(无标题)'
console.log(`目标会话：${target.sessionId}`)
console.log(`标题：${String(title).slice(0, 40)}`)
console.log(`目录：${target.cwd ?? '(未知)'}`)
if (target.running) console.log('⚠️ 这个会话正在跑一轮，投进去会被排队')

const text =
  process.argv.slice(2).join(' ') ||
  '（这是一条来自脚本的测试消息，收到不用做什么）'

const accepted = unwrap(
  await api.sessions.prompt({
    sessionId: target.sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }]
  }), 
  'sessions.prompt'
)

console.log('已送达：', JSON.stringify(accepted))
console.log('注意：这里只代表"受理了"，对方的回复要去 step3 的事件流里看')

let reply = ''
for await (const frame of stream) {
  const msg = frame.payload
  if (!msg || msg.type !== 'session/event') continue
  if (msg.sessionId !== target.sessionId) continue
  const ev = msg.event
  if (ev.type === 'assistant/message') {
    for (const b of ev.data.message?.content ?? []) {
      if (b?.type === 'text') reply += b.text
    }
  }
  if (ev.type === 'turn/end') {
    console.log('回复：', reply.trim())
    break
  }
}

// 我在test分支上添加了一条备注