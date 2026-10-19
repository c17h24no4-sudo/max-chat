/** Приводит введённый номер к виду 79991234567; возвращает null, если номер невозможен. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D+/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return '7' + d.slice(1)
  if (d.length === 10) return '7' + d
  return null
}

/** chatId для отправки по номеру телефона (формат GREEN-API). */
export const toChatId = (phone: string) => `${phone}@c.us`

/** Красивый вид: +7 999 123-45-67 */
export function formatPhone(phone: string): string {
  return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9, 11)}`
}
