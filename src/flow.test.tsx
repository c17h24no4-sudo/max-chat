// Весь путь интерфейса на локальном мок-сервере GREEN-API: чат по номеру → отправка → ответ → показ.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
// @ts-expect-error: .mjs без типов
import { createMock, MOCK_ID, MOCK_TOKEN } from '../mock/mock-green-api.mjs'
import { ChatApp } from './ChatApp'

let mockServer: any
let mock: any
let mockUrl = ''

beforeAll(async () => {
  mock = createMock({ replyDelay: 300 })
  mockServer = mock.server
  await new Promise<void>((r) => mockServer.listen(0, '127.0.0.1', r))
  mockUrl = `http://127.0.0.1:${mockServer.address().port}`
})

afterAll(() => {
  mockServer.close()
})

beforeEach(() => localStorage.clear())

describe('GreenApi через мок', () => {
  it('отправляет сообщение и получает ответ напрямую от мока', async () => {
    const { GreenApi } = await import('./api/greenApi')
    const api = new GreenApi({ idInstance: MOCK_ID, apiTokenInstance: MOCK_TOKEN, apiUrl: mockUrl }, mockUrl)
    expect((await api.getState()).stateInstance).toBe('authorized')
    await api.sendMessage('79991234567@c.us', 'Привет')
    expect(mock.sent).toEqual([{ chatId: '79991234567@c.us', message: 'Привет' }])
    const n = await api.receive(undefined, 5)
    expect(n!.body.messageData!.textMessageData!.textMessage).toContain('Привет')
    await expect(api.deleteNotification(n!.receiptId)).resolves.toEqual(expect.objectContaining({ result: true }))
  })

  it('неверные данные дают понятную ошибку', async () => {
    const { GreenApi } = await import('./api/greenApi')
    const api = new GreenApi({ idInstance: MOCK_ID, apiTokenInstance: 'bad', apiUrl: mockUrl }, mockUrl)
    await expect(api.getState()).rejects.toThrow('Неверный idInstance')
  })
})

describe('ChatApp', () => {
  it('создаёт чат по номеру, отправляет текст и показывает ответ получателя', async () => {
    const u = userEvent.setup()
    render(<ChatApp creds={{ idInstance: MOCK_ID, apiTokenInstance: MOCK_TOKEN, apiUrl: mockUrl }} onLogout={() => {}} apiBase={mockUrl} />)
    await u.type(screen.getByLabelText('Номер телефона получателя'), '8 999 123-45-67')
    await u.click(screen.getByRole('button', { name: 'Создать чат' }))
    expect(screen.getByRole('heading', { name: /\+7 999 123-45-67/ })).toBeInTheDocument()
    await u.type(screen.getByLabelText('Сообщение'), 'Привет, MAX')
    await u.click(screen.getByRole('button', { name: 'Отправить' }))
    const log = screen.getByRole('log', { name: 'Сообщения' })
    expect(await within(log).findByText('Привет, MAX')).toBeInTheDocument()
    // ответ приходит через receiveNotification и показывается в том же чате
    expect(await within(log).findByText(/Ответ на «Привет, MAX»/, {}, { timeout: 12000 })).toBeInTheDocument()
    await waitFor(() => expect(mock.sent.at(-1)).toEqual({ chatId: '79991234567@c.us', message: 'Привет, MAX' }))
  })

  it('не падает, если браузер возвращает Promise из scrollIntoView (регрессия: белый экран в новом Chrome)', async () => {
    const orig = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = () => Promise.resolve() as unknown as undefined
    try {
      const u = userEvent.setup()
      render(<ChatApp creds={{ idInstance: MOCK_ID, apiTokenInstance: MOCK_TOKEN, apiUrl: mockUrl }} onLogout={() => {}} apiBase={mockUrl} />)
      await u.type(screen.getByLabelText('Номер телефона получателя'), '89990001122')
      await u.click(screen.getByRole('button', { name: 'Создать чат' }))
      await u.type(screen.getByLabelText('Сообщение'), 'проверка')
      await u.click(screen.getByRole('button', { name: 'Отправить' }))
      expect(await within(screen.getByRole('log', { name: 'Сообщения' })).findByText('проверка')).toBeInTheDocument()
    } finally {
      Element.prototype.scrollIntoView = orig
    }
  })

  it('неверный номер показывает ошибку и не создаёт чат', async () => {
    const u = userEvent.setup()
    render(<ChatApp creds={{ idInstance: MOCK_ID, apiTokenInstance: MOCK_TOKEN, apiUrl: mockUrl }} onLogout={() => {}} apiBase={mockUrl} />)
    await u.type(screen.getByLabelText('Номер телефона получателя'), '123')
    await u.click(screen.getByRole('button', { name: 'Создать чат' }))
    expect(screen.getByRole('alert')).toHaveTextContent('российский номер')
  })
})
