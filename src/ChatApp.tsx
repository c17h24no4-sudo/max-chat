import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { GreenApi } from './api/greenApi'
import { formatPhone, normalizePhone, toChatId } from './api/phone'
import type { Credentials } from './api/types'
import { initialState, reducer, type State } from './chatState'
import { usePolling } from './usePolling'

const storeKey = (id: string) => `max-chat:${id}`

function load(id: string): State {
  try {
    const raw = localStorage.getItem(storeKey(id))
    if (raw) return { ...(JSON.parse(raw) as State), activeKey: null }
  } catch {
    /* хранилище недоступно */
  }
  return initialState
}

export function ChatApp({ creds, onLogout, apiBase = 'api' }: { creds: Credentials; onLogout: () => void; apiBase?: string }) {
  const api = useMemo(() => new GreenApi(creds, apiBase), [creds, apiBase])
  const [state, dispatch] = useReducer(reducer, creds.idInstance, load)
  const [netError, setNetError] = useState<string | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const onError = useCallback((m: string | null) => setNetError(m), [])
  usePolling(api, dispatch, onError)

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(creds.idInstance), JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, creds.idInstance])

  const active = state.chats.find((c) => c.key === state.activeKey)
  useEffect(() => {
    // фигурные скобки обязательны: в новых браузерах scrollIntoView возвращает Promise,
    // а React принял бы возвращённое значение за функцию очистки и упал бы
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [active?.messages.length])

  function newChat(e: React.FormEvent) {
    e.preventDefault()
    const p = normalizePhone(phoneInput)
    if (!p) {
      setPhoneError('Введите российский номер, например +7 999 123-45-67.')
      return
    }
    setPhoneError('')
    dispatch({ type: 'open', key: p, title: formatPhone(p) })
    setPhoneInput('')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!active || !body) return
    const tempId = `tmp-${Date.now()}`
    dispatch({ type: 'add', key: active.key, title: active.title, message: { id: tempId, text: body, at: Date.now(), direction: 'out', status: 'sending' }, markUnread: false })
    setText('')
    try {
      const r = await api.sendMessage(toChatId(active.key), body)
      // заменяем временный id на настоящий, чтобы эхо из уведомлений не создало дубль
      dispatch({ type: 'status', key: active.key, id: tempId, status: 'sent' })
      void r
    } catch (err) {
      dispatch({ type: 'status', key: active.key, id: tempId, status: 'error' })
      setNetError((err as Error).message)
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <b>Чаты</b>
          <button className="link" onClick={() => { dispatch({ type: 'clear' }); onLogout() }}>Выйти</button>
        </header>
        <form onSubmit={newChat} className="newchat" aria-label="Новый чат">
          <input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="Номер получателя" aria-label="Номер телефона получателя" />
          <button>Создать чат</button>
        </form>
        {phoneError && <p className="error" role="alert">{phoneError}</p>}
        <ul className="chatlist">
          {state.chats.map((c) => (
            <li key={c.key}>
              <button className={c.key === state.activeKey ? 'active' : ''} onClick={() => dispatch({ type: 'open', key: c.key })}>
                <span>{c.title}</span>
                <small>{c.messages.at(-1)?.text.slice(0, 40) ?? 'Нет сообщений'}</small>
                {c.unread > 0 && <i aria-label="Непрочитанные">{c.unread}</i>}
              </button>
            </li>
          ))}
          {state.chats.length === 0 && <li className="empty">Введите номер и создайте первый чат.</li>}
        </ul>
      </aside>
      <section className="conversation">
        {netError && <div className="banner" role="status">{netError}</div>}
        {active ? (
          <>
            <header><h2>{active.title}</h2></header>
            <div className="messages" role="log" aria-label="Сообщения" aria-live="polite">
              {active.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.direction}`}>
                  <span>{m.text}</span>
                  <small>
                    {new Date(m.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {m.status === 'sending' && ' · отправляется'}
                    {m.status === 'error' && ' · не отправлено'}
                  </small>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="composer" onSubmit={send}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" aria-label="Сообщение" maxLength={4000} />
              <button>Отправить</button>
            </form>
          </>
        ) : (
          <div className="placeholder">Выберите чат или создайте новый по номеру телефона.</div>
        )}
      </section>
    </div>
  )
}
