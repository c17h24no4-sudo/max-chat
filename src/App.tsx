import { useState } from 'react'
import './App.css'
import type { Credentials } from './api/types'
import { ChatApp } from './ChatApp'
import { Login } from './Login'

const KEY = 'max-chat:creds'

function loadCreds(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(KEY) // только на время вкладки
    return raw ? (JSON.parse(raw) as Credentials) : null
  } catch {
    return null
  }
}

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(loadCreds)
  const login = (c: Credentials) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(c)) } catch { /* ignore */ }
    setCreds(c)
  }
  const logout = () => {
    try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
    setCreds(null)
  }
  return creds ? <ChatApp creds={creds} onLogout={logout} /> : <Login onLogin={login} />
}
