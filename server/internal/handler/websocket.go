package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/websocket"
)

type WebSocketHandler struct {
	hub      *websocket.Hub
	upgrader websocket.Upgrader
}

func NewWebSocketHandler(hub *websocket.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	userID := middleware.GetUserID(c)
	username := middleware.GetUsername(c)
	role := middleware.GetRole(c)

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := websocket.NewClient(h.hub, conn, userID, username, role)
	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}