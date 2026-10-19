// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMock, MOCK_ID, MOCK_TOKEN } from '../mock/mock-green-api.mjs'

let proxy, mockServer, proxyPort, mockUrl, apiUrlAllowed

beforeAll(async () => {
  mockServer = createMock({ replyDelay: 100 }).server
  await new Promise((r) => mockServer.listen(0, '127.0.0.1', r))
  mockUrl = `http://127.0.0.1:${mockServer.address().port}`
  process.env.ALLOW_API_URL = mockUrl // разрешаем адрес мока только в тесте
  const mod = await import('./server.mjs')
  proxy = mod.server
  apiUrlAllowed = mod.apiUrlAllowed
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r))
  proxyPort = proxy.address().port
})

afterAll(() => {
  proxy.close()
  mockServer.close()
})

describe('прокси: проверка адреса API', () => {
  it('разрешает только *.green-api.com по https', () => {
    expect(apiUrlAllowed('https://api.green-api.com')).toBe(true)
    expect(apiUrlAllowed('https://7103.api.green-api.com')).toBe(true)
  })
  it('отклоняет чужие адреса, http и подмену домена', () => {
    for (const u of ['http://api.green-api.com', 'https://evil.com', 'https://green-api.com.evil.com', 'https://evilgreen-api.com', 'http://127.0.0.1:1', undefined]) {
      expect(apiUrlAllowed(u)).toBe(false)
    }
  })
})

describe('прокси: пересылка', () => {
  const call = (path, headers = {}, init = {}) => fetch(`http://127.0.0.1:${proxyPort}${path}`, { headers, ...init })

  it('пересылает запрос на разрешённый адрес и возвращает ответ с кодом', async () => {
    const ok = await call(`/api/waInstance${MOCK_ID}/getStateInstance/${MOCK_TOKEN}`, { 'X-Api-Url': mockUrl })
    expect(ok.status).toBe(200)
    expect((await ok.json()).stateInstance).toBe('authorized')
    const bad = await call(`/api/waInstance${MOCK_ID}/getStateInstance/wrong`, { 'X-Api-Url': mockUrl })
    expect(bad.status).toBe(401)
  })

  it('не работает как открытый прокси: чужой адрес в заголовке получает 400', async () => {
    const r = await call('/api/waInstance1/getStateInstance/x', { 'X-Api-Url': 'https://evil.example.com' })
    expect(r.status).toBe(400)
  })

  it('отдаёт приложение и не выходит за папку сборки', async () => {
    const r = await call('/../../etc/passwd')
    expect(await r.text()).not.toContain('root:')
  })
})
