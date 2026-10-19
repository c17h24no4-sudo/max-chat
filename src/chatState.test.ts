import { describe, expect, it } from 'vitest'
import { initialState, reducer, type Message } from './chatState'

const msg = (id: string, direction: Message['direction'] = 'in'): Message => ({ id, text: id, at: 1, direction, status: 'sent' })

describe('reducer', () => {
  it('открывает новый чат и не дублирует существующий', () => {
    let s = reducer(initialState, { type: 'open', key: '7999', title: 'A' })
    s = reducer(s, { type: 'open', key: '7999' })
    expect(s.chats).toHaveLength(1)
    expect(s.activeKey).toBe('7999')
  })

  it('новое сообщение в неактивном чате увеличивает счётчик непрочитанных', () => {
    let s = reducer(initialState, { type: 'open', key: 'a', title: 'A' })
    s = reducer(s, { type: 'open', key: 'b', title: 'B' })
    s = reducer(s, { type: 'add', key: 'a', title: 'A', message: msg('1'), markUnread: true })
    expect(s.chats.find((c) => c.key === 'a')!.unread).toBe(1)
  })

  it('в активном чате счётчик не растёт', () => {
    let s = reducer(initialState, { type: 'open', key: 'a', title: 'A' })
    s = reducer(s, { type: 'add', key: 'a', title: 'A', message: msg('1'), markUnread: true })
    expect(s.chats[0].unread).toBe(0)
  })

  it('повторная доставка того же сообщения не создаёт дубль', () => {
    let s = reducer(initialState, { type: 'open', key: 'a', title: 'A' })
    s = reducer(s, { type: 'add', key: 'a', title: 'A', message: msg('1'), markUnread: true })
    s = reducer(s, { type: 'add', key: 'a', title: 'A', message: msg('1'), markUnread: true })
    expect(s.chats[0].messages).toHaveLength(1)
  })

  it('ответ из неизвестного чата создаёт чат и поднимает его вверх', () => {
    let s = reducer(initialState, { type: 'open', key: 'a', title: 'A' })
    s = reducer(s, { type: 'add', key: 'z', title: 'Z', message: msg('1'), markUnread: true })
    expect(s.chats[0].key).toBe('z')
  })

  it('меняет статус отправки', () => {
    let s = reducer(initialState, { type: 'open', key: 'a', title: 'A' })
    s = reducer(s, { type: 'add', key: 'a', title: 'A', message: { ...msg('t', 'out'), status: 'sending' }, markUnread: false })
    s = reducer(s, { type: 'status', key: 'a', id: 't', status: 'error' })
    expect(s.chats[0].messages[0].status).toBe('error')
  })
})
