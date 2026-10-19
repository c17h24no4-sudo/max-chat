// Локальная имитация GREEN-API (MAX): те же адреса и форматы, что в документации. Нужна для тестов и проверки без настоящего аккаунта.
// После каждого sendMessage мок через ~1,5 с «отвечает» от лица получателя, чтобы проверить весь путь: отправка → ответ → показ в чате.
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

export const MOCK_ID = '1101000001'
export const MOCK_TOKEN = 'mock-token'

export function createMock({ replyDelay = 1500 } = {}) {
  const queue = []
  const waiters = []
  let receipt = 1
  let msgId = 1
  const sent = []

  const push = (body) => {
    const n = { receiptId: receipt++, body }
    const w = waiters.shift()
    if (w) w(n)
    else queue.push(n)
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const m = url.pathname.match(/^\/waInstance(\d+)\/(\w+)\/([^/]+)(?:\/(\d+))?$/)
    const send = (code, obj) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj))
    if (!m) return send(404, { error: 'not found' })
    const [, id, method, token, rid] = m
    if (id !== MOCK_ID || token !== MOCK_TOKEN) return send(401, { error: 'unauthorized' })

    if (method === 'getStateInstance') return send(200, { stateInstance: 'authorized' })

    if (method === 'sendMessage' && req.method === 'POST') {
      let raw = ''
      for await (const c of req) raw += c
      const { chatId, message } = JSON.parse(raw || '{}')
      if (!chatId || !message) return send(400, { error: 'chatId and message required' })
      sent.push({ chatId, message })
      const idMessage = `mock-${msgId++}`
      const phone = chatId.replace('@c.us', '')
      setTimeout(() => push({
        typeWebhook: 'incomingMessageReceived',
        idMessage: `reply-${idMessage}`,
        timestamp: Math.floor(Date.now() / 1000),
        // как в документации MAX: chatId — внутренний идентификатор, номер приходит в senderPhoneNumber
        senderData: { chatId: '10000000', chatName: 'Получатель', sender: '10000000', senderName: 'Получатель', senderPhoneNumber: Number(phone) },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: `Ответ на «${message}»` } },
      }), replyDelay)
      return send(200, { idMessage })
    }

    if (method === 'receiveNotification' && req.method === 'GET') {
      if (queue.length) return send(200, queue.shift())
      const timeout = Math.min(Number(url.searchParams.get('receiveTimeout') ?? 5), 30) * 1000
      let done = false
      const w = (n) => { if (!done) { done = true; send(200, n) } }
      waiters.push(w)
      setTimeout(() => { if (!done) { done = true; waiters.splice(waiters.indexOf(w), 1); res.writeHead(200, { 'Content-Type': 'application/json' }).end('null') } }, timeout)
      return
    }

    if (method === 'deleteNotification' && req.method === 'DELETE') return send(200, { result: true, receiptId: rid })

    send(404, { error: 'unknown method' })
  })
  return { server, sent, push }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = createMock()
  const port = Number(process.env.MOCK_PORT ?? 9099)
  server.listen(port, () => console.log(`Мок GREEN-API: http://127.0.0.1:${port} (id ${MOCK_ID}, токен ${MOCK_TOKEN})`))
}
