import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone, toChatId } from './phone'
import { toText } from './notifications'
import type { Notification } from './types'

describe('phone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['9991234567', '79991234567'],
  ])('нормализует %s', (raw, want) => expect(normalizePhone(raw)).toBe(want))

  it.each(['', 'abc', '12345', '899912345678'])('отклоняет %s', (raw) => expect(normalizePhone(raw)).toBeNull())

  it('формирует chatId и красивый вид', () => {
    expect(toChatId('79991234567')).toBe('79991234567@c.us')
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })
})

const incoming = (over: Partial<Notification['body']> = {}): Notification => ({
  receiptId: 5,
  body: {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'm1',
    timestamp: 1763115112,
    senderData: { chatId: '10000000', chatName: 'Анна', senderPhoneNumber: 79991234567 },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    ...over,
  },
})

describe('toText', () => {
  it('входящее текстовое привязывается к чату по номеру телефона, а не по внутреннему id', () => {
    const m = toText(incoming())!
    expect(m.chatKey).toBe('79991234567')
    expect(m.text).toBe('Привет')
    expect(m.direction).toBe('in')
    expect(m.timestamp).toBe(1763115112000)
  })

  it('без номера использует chatId', () => {
    const n = incoming({ senderData: { chatId: '10000000' } })
    expect(toText(n)!.chatKey).toBe('10000000')
  })

  it('пропускает статусы и медиа', () => {
    expect(toText(incoming({ typeWebhook: 'outgoingMessageStatus' }))).toBeNull()
    expect(toText(incoming({ messageData: { typeMessage: 'imageMessage' } }))).toBeNull()
    expect(toText(incoming({ messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: '' } } }))).toBeNull()
  })

  it('сообщение, отправленное с телефона, помечается как исходящее', () => {
    expect(toText(incoming({ typeWebhook: 'outgoingMessageReceived' }))!.direction).toBe('out')
  })
})
