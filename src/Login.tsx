import { useState } from 'react'
import { GreenApi } from './api/greenApi'
import type { Credentials } from './api/types'

export function Login({ onLogin }: { onLogin: (c: Credentials) => void }) {
  const [id, setId] = useState('')
  const [token, setToken] = useState('')
  const [url, setUrl] = useState('https://api.green-api.com')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = { idInstance: id.trim(), apiTokenInstance: token.trim(), apiUrl: url.trim().replace(/\/+$/, '') }
    if (!/^\d+$/.test(c.idInstance) || !c.apiTokenInstance) {
      setError('Введите idInstance (цифры) и apiTokenInstance.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const st = await new GreenApi(c).getState()
      if (st.stateInstance !== 'authorized') {
        setError(`Инстанс не авторизован в MAX (состояние: ${st.stateInstance}). Отсканируйте QR-код в личном кабинете GREEN-API.`)
        return
      }
      onLogin(c)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} aria-label="Вход">
        <h1>Чат MAX</h1>
        <p className="hint">Введите данные инстанса из личного кабинета GREEN-API. Они хранятся только в этой вкладке.</p>
        <label>idInstance<input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" autoComplete="off" /></label>
        <label>apiTokenInstance<input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" /></label>
        <label>Адрес API<input value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? 'Проверяем…' : 'Войти'}</button>
      </form>
    </main>
  )
}
