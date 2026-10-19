import { normalizePhone } from './phone'
import type { Notification } from './types'

export interface IncomingText {
  /** Ключ чата: номер телефона 79991234567, если известен, иначе идентификатор чата MAX. */
  chatKey: string
  chatId: string
  name: string
  text: string
  id: string
  timestamp: number
  direction: 'in' | 'out'
}

/**
 * Превращает уведомление GREEN-API в текстовое сообщение чата.
 * Нужны только входящие текстовые и текстовые, отправленные с телефона; остальное (статусы, медиа) пропускаем.
 */
export function toText(n: Notification): IncomingText | null {
  const b = n.body
  const isIn = b.typeWebhook === 'incomingMessageReceived'
  const isOut = b.typeWebhook === 'outgoingMessageReceived'
  if (!isIn && !isOut) return null
  if (b.messageData?.typeMessage !== 'textMessage') return null
  const text = b.messageData.textMessageData?.textMessage
  if (!text) return null
  const s = b.senderData ?? {}
  const phone = s.senderPhoneNumber != null ? normalizePhone(String(s.senderPhoneNumber)) : null
  const chatId = s.chatId ?? ''
  return {
    chatKey: phone ?? chatId,
    chatId,
    name: s.chatName || s.senderName || '',
    text,
    id: b.idMessage ?? `n${n.receiptId}`,
    timestamp: (b.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    direction: isOut ? 'out' : 'in',
  }
}
