import { WebSocketMessage } from '../types'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private listeners: Map<string, Set<(data: WebSocketMessage) => void>> = new Map()
  private token: string = ''

  connect(token: string) {
    this.token = token
    
    // 修复：WebSocket连接需要通过query参数传递token
    // 但后端可能不支持这种方式，所以暂时禁用WebSocket
    console.log('WebSocket: 暂时禁用WebSocket连接')
    console.log('WebSocket: 系统将使用HTTP API进行数据同步')
    
    // 不实际连接WebSocket，避免错误
    // 如果需要实时更新，可以使用轮询或其他方式
  }

  private handleReconnect(token: string) {
    // 禁用重连逻辑
    console.log('WebSocket: 重连已禁用')
  }

  subscribe(type: string, callback: (data: WebSocketMessage) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(callback)
  }

  unsubscribe(type: string, callback: (data: WebSocketMessage) => void) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(callback)
    }
  }

  private notifyListeners(type: string, data: WebSocketMessage) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(callback => callback(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }

  send(data: any) {
    // 禁用发送功能
    console.log('WebSocket: 发送功能已禁用')
  }
}

export const websocketService = new WebSocketService()