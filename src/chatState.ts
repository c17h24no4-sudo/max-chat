export interface Message {
  id: string
  text: string
  at: number
  direction: 'in' | 'out'
  status?: 'sending' | 'sent' | 'error'
}

export interface Chat {
  key: string // номер телефона 79991234567
  title: string
  messages: Message[]
  unread: number
}

export type State = { chats: Chat[]; activeKey: string | null }

export type Action =
  | { type: 'open'; key: string; title?: string }
  | { type: 'add'; key: string; title: string; message: Message; markUnread: boolean }
  | { type: 'status'; key: string; id: string; status: Message['status'] }
  | { type: 'rename'; oldKey: string; newKey: string }
  | { type: 'clear' }

export const initialState: State = { chats: [], activeKey: null }

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'open': {
      const exists = s.chats.some((c) => c.key === a.key)
      const chats = exists
        ? s.chats.map((c) => (c.key === a.key ? { ...c, unread: 0 } : c))
        : [{ key: a.key, title: a.title ?? a.key, messages: [], unread: 0 }, ...s.chats]
      return { chats, activeKey: a.key }
    }
    case 'add': {
      if (s.chats.some((c) => c.key === a.key && c.messages.some((m) => m.id === a.message.id))) return s // дубль
      const found = s.chats.find((c) => c.key === a.key)
      const unread = a.markUnread && s.activeKey !== a.key ? 1 : 0
      const chats = found
        ? s.chats.map((c) => (c.key === a.key ? { ...c, messages: [...c.messages, a.message], unread: c.unread + unread, title: c.title === c.key && a.title ? a.title : c.title } : c))
        : [{ key: a.key, title: a.title || a.key, messages: [a.message], unread }, ...s.chats]
      // чат с новым сообщением поднимается вверх
      chats.sort((x, y) => (y.key === a.key ? 1 : 0) - (x.key === a.key ? 1 : 0))
      return { ...s, chats }
    }
    case 'status':
      return { ...s, chats: s.chats.map((c) => (c.key === a.key ? { ...c, messages: c.messages.map((m) => (m.id === a.id ? { ...m, status: a.status } : m)) } : c)) }
    case 'rename':
      return { ...s, activeKey: s.activeKey === a.oldKey ? a.newKey : s.activeKey, chats: s.chats.map((c) => (c.key === a.oldKey ? { ...c, key: a.newKey } : c)) }
    case 'clear':
      return initialState
  }
}
