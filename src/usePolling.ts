import { useEffect, type Dispatch } from 'react'
import type { GreenApi } from './api/greenApi'
import { toText } from './api/notifications'
import type { Action } from './chatState'

/**
 * Цикл получения уведомлений: ждём очередное, обрабатываем и сразу удаляем из очереди GREEN-API.
 * При сбое делаем паузу и пробуем снова; ошибка показывается пользователю.
 */
export function usePolling(api: GreenApi | null, dispatch: Dispatch<Action>, onError: (msg: string | null) => void) {
  useEffect(() => {
    if (!api) return
    const ctrl = new AbortController()
    let alive = true
    let failures = 0
    ;(async () => {
      while (alive) {
        try {
          const n = await api.receive(ctrl.signal, 5)
          failures = 0
          onError(null)
          if (!n) continue
          const m = toText(n)
          if (m) {
            dispatch({
              type: 'add',
              key: m.chatKey,
              title: m.name,
              message: { id: m.id, text: m.text, at: m.timestamp, direction: m.direction, status: 'sent' },
              markUnread: m.direction === 'in',
            })
          }
          await api.deleteNotification(n.receiptId)
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          failures++
          // единичные сбои шлюза (502, 504, обрыв) при долгом ожидании — норма: пробуем снова молча,
          // предупреждение показываем, только если ошибки идут подряд или данные неверны
          const status = (e as { status?: number }).status ?? 0
          const transient = status === 0 || status >= 500
          if (!transient || failures >= 4) onError((e as Error).message)
          await new Promise((r) => setTimeout(r, transient ? 1000 : 3000))
        }
      }
    })()
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [api, dispatch, onError])
}
