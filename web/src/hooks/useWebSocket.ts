import { useEffect, useRef } from 'react'
import { websocketService } from '../services/websocket'
import { WebSocketMessage } from '../types'
import { useAppStore } from '../store'

export const useWebSocket = () => {
  const { token } = useAppStore()
  const connectedRef = useRef(false)

  useEffect(() => {
    if (token && !connectedRef.current) {
      websocketService.connect(token)
      connectedRef.current = true
    }

    return () => {
      if (connectedRef.current) {
        websocketService.disconnect()
        connectedRef.current = false
      }
    }
  }, [token])

  const subscribe = (type: string, callback: (data: WebSocketMessage) => void) => {
    websocketService.subscribe(type, callback)
  }

  const unsubscribe = (type: string, callback: (data: WebSocketMessage) => void) => {
    websocketService.unsubscribe(type, callback)
  }

  const send = (data: any) => {
    websocketService.send(data)
  }

  return {
    subscribe,
    unsubscribe,
    send,
  }
}