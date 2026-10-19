// Прокси и раздача сборки. Браузер не может ходить в GREEN-API напрямую (CORS), поэтому запросы /api/... идут через сервер.
// Адрес API берётся из заголовка X-Api-Url, но только если это *.green-api.com (иначе сервер стал бы открытым прокси).
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
const port = Number(process.env.PORT ?? 8080)
const allowExtra = process.env.ALLOW_API_URL // только для тестов с локальным мок-сервером
const HOST_OK = /^https:\/\/([a-z0-9-]+\.)*green-api\.com$/
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

export function apiUrlAllowed(url) {
  return typeof url === 'string' && (HOST_OK.test(url) || (allowExtra && url === allowExtra))
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks)
}

const PREFIX = (process.env.BASE_PATH ?? '').replace(/\/+$/, '')

export const server = createServer(async (req, res) => {
  try {
    if (PREFIX && req.url.startsWith(PREFIX)) req.url = req.url.slice(PREFIX.length) || '/'
    if (req.url.startsWith('/api/')) {
      const base = String(req.headers['x-api-url'] ?? 'https://api.green-api.com').replace(/\/+$/, '')
      if (!apiUrlAllowed(base)) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Недопустимый адрес API' }))
        return
      }
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req)
      const upstream = await fetch(base + req.url.slice(4), { method: req.method, body, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) })
      const text = await upstream.text()
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' }).end(text)
      return
    }
    const path = normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, '')
    const file = join(dist, path === '/' ? 'index.html' : path)
    if (!file.startsWith(dist)) throw new Error('bad path')
    const data = await readFile(file).catch(() => readFile(join(dist, 'index.html')))
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'text/html; charset=utf-8' }).end(data)
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: String(e.message ?? e) }))
  }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST ?? '0.0.0.0' // на сервере HOST=127.0.0.1: наружу только через nginx
  server.listen(port, host, () => console.log(`Чат MAX: http://${host}:${port}`))
}
