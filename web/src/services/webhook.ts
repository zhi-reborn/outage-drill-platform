import api from './api'
import { MessageLog } from '../types'

export const webhookService = {
  getMessageLogs: async (drillId: number): Promise<MessageLog[]> => {
    const response = await api.get<MessageLog[]>('/webhooks/logs', {
      params: { drill_id: drillId }
    })
    return response.data
  },

  sendMessage: async (drillId: number, content: string): Promise<void> => {
    await api.post('/webhooks/send', {
      drill_id: drillId,
      content: content
    })
  },

  updateWebhookUrl: async (url: string): Promise<void> => {
    // 这个功能可能需要后端支持，暂时保留
    console.log('Update webhook URL:', url)
  }
}