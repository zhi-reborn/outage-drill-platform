package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type ExecutionHandler struct {
	executionSvc *service.ExecutionService
}

func NewExecutionHandler(executionSvc *service.ExecutionService) *ExecutionHandler {
	return &ExecutionHandler{executionSvc: executionSvc}
}

type AssignStepRequest struct {
	AssigneeID uint `json:"assignee_id" binding:"required"`
}

func (h *ExecutionHandler) GetMyTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tasks, err := h.executionSvc.GetUserTasks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

func (h *ExecutionHandler) GetExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	execution, err := h.executionSvc.GetExecution(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
		return
	}

	c.JSON(http.StatusOK, execution)
}

func (h *ExecutionHandler) GetDrillExecutions(c *gin.Context) {
	drillID, err := strconv.ParseUint(c.Param("drill_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	executions, err := h.executionSvc.GetDrillExecutions(uint(drillID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, executions)
}

func (h *ExecutionHandler) AssignStep(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	var req AssignStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.executionSvc.AssignStep(uint(id), req.AssigneeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "step assigned"})
}

func (h *ExecutionHandler) StartExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.StartExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution started"})
}

func (h *ExecutionHandler) CompleteExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.CompleteExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution completed"})
}