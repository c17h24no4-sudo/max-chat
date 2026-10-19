import type { Credentials, Notification } from './types'
import { ApiError } from './types'

/**
 * Клиент GREEN-API (MAX). Браузер не может обращаться к API напрямую (CORS), поэтому запросы идут через
 * прокси нашего сервера (/api/...), который добавляет адрес инстанса в заголовок X-Api-Url.
 */
export class GreenApi {
  private c: Credentials
  private base: string

  constructor(c: Credentials, base = 'api') {
    this.c = c
    this.base = base
  }

  private url(method: string, extra = '') {
    const { idInstance, apiTokenInstance } = this.c
    return `${this.base}/waInstance${idInstance}/${method}/${apiTokenInstance}${extra}`
  }

  private async call<T>(method: string, url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(url, {
        method,
        signal,
        headers: { 'Content-Type': 'application/json', 'X-Api-Url': this.c.apiUrl },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      throw new ApiError('Нет связи с сервером. Проверьте интернет и запустите прокси.', 0)
    }
    if (res.status === 401 || res.status === 403) throw new ApiError('Неверный idInstance или apiTokenInstance.', res.status)
    if (res.status === 466) throw new ApiError('Превышен лимит тарифа GREEN-API.', res.status)
    if (!res.ok) throw new ApiError(`Ошибка GREEN-API (${res.status}).`, res.status)
    const text = await res.text()
    return (text ? JSON.parse(text) : null) as T
  }

  /** Проверка учётных данных: инстанс должен быть авторизован в MAX. */
  getState(): Promise<{ stateInstance: string }> {
    return this.call('GET', this.url('getStateInstance'))
  }

  sendMessage(chatId: string, message: string): Promise<{ idMessage: string }> {
    return this.call('POST', this.url('sendMessage'), { chatId, message })
  }

  /** Долгий запрос: ждёт до receiveTimeout секунд очередное уведомление; null, если их нет. */
  receive(signal?: AbortSignal, timeout = 5): Promise<Notification | null> {
    return this.call('GET', this.url('receiveNotification', `?receiveTimeout=${timeout}`), undefined, signal)
  }

  deleteNotification(receiptId: number): Promise<{ result: boolean }> {
    return this.call('DELETE', `${this.base}/waInstance${this.c.idInstance}/deleteNotification/${this.c.apiTokenInstance}/${receiptId}`)
  }
}
