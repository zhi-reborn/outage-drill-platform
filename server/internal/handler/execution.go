package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/model"
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

type StepExecutionResponse struct {
	*model.StepExecution
	PhaseName string `json:"phase_name"`
	StageName string `json:"stage_name"`
	TaskName  string `json:"task_name"`
}

func (h *ExecutionHandler) enrichExecutions(executions []*model.StepExecution) []*StepExecutionResponse {
	taskMap := make(map[uint]*model.Task)
	opMap := make(map[uint]*model.Operation)
	stageMap := make(map[uint]*model.Stage)
	phaseMap := make(map[uint]*model.Phase)

	for _, exec := range executions {
		if exec.TaskID != nil {
			if _, ok := taskMap[*exec.TaskID]; !ok {
				task, err := h.executionSvc.GetTaskByID(*exec.TaskID)
				if err == nil {
					taskMap[*exec.TaskID] = task
				}
			}
		}
		if exec.OperationID != nil {
			if _, ok := opMap[*exec.OperationID]; !ok {
				op, err := h.executionSvc.GetOperationByID(*exec.OperationID)
				if err == nil {
					opMap[*exec.OperationID] = op
					if _, ok := taskMap[op.TaskID]; !ok {
						task, err := h.executionSvc.GetTaskByID(op.TaskID)
						if err == nil {
							taskMap[op.TaskID] = task
						}
					}
				}
			}
		}
	}

	for _, task := range taskMap {
		if _, ok := stageMap[task.StageID]; !ok {
			stage, err := h.executionSvc.GetStageByID(task.StageID)
			if err == nil {
				stageMap[task.StageID] = stage
				if _, ok := phaseMap[stage.PhaseID]; !ok {
					phase, err := h.executionSvc.GetPhaseByID(stage.PhaseID)
					if err == nil {
						phaseMap[stage.PhaseID] = phase
					}
				}
			}
		}
	}

	result := make([]*StepExecutionResponse, len(executions))
	for i, exec := range executions {
		resp := &StepExecutionResponse{StepExecution: exec}
		var taskID *uint
		if exec.TaskID != nil {
			taskID = exec.TaskID
		} else if exec.OperationID != nil {
			if op, ok := opMap[*exec.OperationID]; ok {
				taskID = &op.TaskID
			}
		}
		if taskID != nil {
			if task, ok := taskMap[*taskID]; ok {
				resp.TaskName = task.Name
				if stage, ok := stageMap[task.StageID]; ok {
					resp.StageName = stage.Name
					if phase, ok := phaseMap[stage.PhaseID]; ok {
						resp.PhaseName = phase.Name
					}
				}
			}
		}
		result[i] = resp
	}
	return result
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

	enriched := h.enrichExecutions(executions)
	c.JSON(http.StatusOK, enriched)
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

func (h *ExecutionHandler) PauseExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.PauseExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution paused"})
}

func (h *ExecutionHandler) ResumeExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.ResumeExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution resumed"})
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
