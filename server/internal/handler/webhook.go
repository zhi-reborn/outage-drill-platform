package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type WebhookHandler struct {
	notificationSvc *service.NotificationService
}

func NewWebhookHandler(notificationSvc *service.NotificationService) *WebhookHandler {
	return &WebhookHandler{notificationSvc: notificationSvc}
}

type SendMessageRequest struct {
	DrillID uint   `json:"drill_id" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func (h *WebhookHandler) GetMessageLogs(c *gin.Context) {
	drillIDStr := c.Query("drill_id")
	if drillIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "drill_id required"})
		return
	}

	drillID, err := strconv.ParseUint(drillIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill_id"})
		return
	}

	logs, err := h.notificationSvc.GetMessageLogs(uint(drillID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (h *WebhookHandler) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "message sent"})
}