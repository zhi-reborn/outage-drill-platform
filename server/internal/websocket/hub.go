package websocket

import (
	"encoding/json"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastToDrill(drillID uint, messageType string, data interface{}) error {
	message := map[string]interface{}{
		"type":     messageType,
		"drill_id": drillID,
		"data":     data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.mu.RLock()
	for client := range h.clients {
		if client.drillID == drillID {
			select {
			case client.send <- jsonData:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
	h.mu.RUnlock()

	return nil
}

func (h *Hub) BroadcastToUser(userID uint, messageType string, data interface{}) error {
	message := map[string]interface{}{
		"type":    messageType,
		"user_id": userID,
		"data":    data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.mu.RLock()
	for client := range h.clients {
		if client.userID == userID {
			select {
			case client.send <- jsonData:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
	h.mu.RUnlock()

	return nil
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}