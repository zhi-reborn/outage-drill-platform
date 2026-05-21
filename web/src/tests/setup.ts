import '@testing-library/jest-dom'

global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
  }
}

Object.defineProperty(window, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    setItem(key: string, value: string) {
      this.store[key] = value
    },
    getItem(key: string) {
      return this.store[key] || null
    },
    removeItem(key: string) {
      delete this.store[key]
    },
    clear() {
      this.store = {}
    },
  },
})

Object.defineProperty(window, 'WebSocket', {
  value: class WebSocket {
    url: string
    readyState: number = WebSocket.OPEN
    
    static OPEN = 1
    static CLOSED = 3
    
    constructor(url: string) {
      this.url = url
    }
    
    send(data: string) {}
    close() {}
    onopen() {}
    onclose() {}
    onmessage() {}
    onerror() {}
  },
})