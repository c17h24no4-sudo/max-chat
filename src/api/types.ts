export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  /** Адрес API из личного кабинета, обычно https://api.green-api.com или https://7103.api.green-api.com */
  apiUrl: string
}

export interface Notification {
  receiptId: number
  body: {
    typeWebhook: string
    idMessage?: string
    timestamp?: number
    senderData?: { chatId?: string; sender?: string; senderPhoneNumber?: number | string; senderName?: string; chatName?: string }
    messageData?: { typeMessage?: string; textMessageData?: { textMessage?: string } }
  }
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
