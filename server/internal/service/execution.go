package service

import (
	"errors"
	"log"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/internal/websocket"
)

type ExecutionService struct {
	executionRepo *repository.ExecutionRepository
	drillRepo     *repository.DrillRepository
	taskRepo      *repository.TaskRepository
	operationRepo *repository.OperationRepository
	stageRepo     *repository.StageRepository
	phaseRepo     *repository.PhaseRepository
	wsHub         *websocket.Hub
}

func NewExecutionService(
	executionRepo *repository.ExecutionRepository,
	drillRepo *repository.DrillRepository,
	taskRepo *repository.TaskRepository,
	operationRepo *repository.OperationRepository,
	stageRepo *repository.StageRepository,
	phaseRepo *repository.PhaseRepository,
	wsHub *websocket.Hub,
) *ExecutionService {
	return &ExecutionService{
		executionRepo: executionRepo,
		drillRepo:     drillRepo,
		taskRepo:      taskRepo,
		operationRepo: operationRepo,
		stageRepo:     stageRepo,
		phaseRepo:     phaseRepo,
		wsHub:         wsHub,
	}
}

func (s *ExecutionService) GetExecution(id uint) (*model.StepExecution, error) {
	return s.executionRepo.FindByID(id)
}

func (s *ExecutionService) GetDrillExecutions(drillID uint) ([]*model.StepExecution, error) {
	executions, err := s.executionRepo.FindByDrillID(drillID)
	if err != nil {
		return nil, err
	}

	// 诊断日志：检查每个execution的Assignee是否被正确加载
	log.Printf("[DEBUG] GetDrillExecutions - drillID: %d, count: %d", drillID, len(executions))
	for i, exec := range executions {
		log.Printf("[DEBUG] Execution[%d] - ID: %d, AssigneeID: %v", i, exec.ID, exec.AssigneeID)
		if exec.Assignee != nil {
			log.Printf("[DEBUG]   Assignee loaded - ID: %d, Name: %s", exec.Assignee.ID, exec.Assignee.Name)
		} else {
			log.Printf("[DEBUG]   Assignee is nil")
		}
	}

	return executions, nil
}

func (s *ExecutionService) GetUserTasks(userID uint) ([]*model.StepExecution, error) {
	return s.executionRepo.FindByAssigneeID(userID)
}

func (s *ExecutionService) GetTaskByID(id uint) (*model.Task, error) {
	return s.taskRepo.FindByID(id)
}

func (s *ExecutionService) GetOperationByID(id uint) (*model.Operation, error) {
	return s.operationRepo.FindByID(id)
}

func (s *ExecutionService) GetStageByID(id uint) (*model.Stage, error) {
	return s.stageRepo.FindByID(id)
}

func (s *ExecutionService) GetPhaseByID(id uint) (*model.Phase, error) {
	return s.phaseRepo.FindByID(id)
}

func (s *ExecutionService) syncTaskStatus(execution *model.StepExecution) {
	if execution.OperationID != nil && s.operationRepo != nil {
		operation, err := s.operationRepo.FindByID(*execution.OperationID)
		if err != nil {
			log.Printf("[WARN] Failed to find operation %d: %v", *execution.OperationID, err)
			return
		}
		if operation.Status != execution.Status {
			s.operationRepo.UpdateStatus(operation.ID, execution.Status)
			log.Printf("[SYNC] Operation %d status → %s", operation.ID, execution.Status)
		}
		s.cascadeTaskStatus(operation.TaskID)
	} else if execution.TaskID != nil && s.taskRepo != nil {
		task, err := s.taskRepo.FindByID(*execution.TaskID)
		if err != nil {
			log.Printf("[WARN] Failed to find task %d: %v", *execution.TaskID, err)
			return
		}
		if task.Status != execution.Status {
			s.taskRepo.UpdateStatus(task.ID, execution.Status)
			log.Printf("[SYNC] Task %d status → %s", task.ID, execution.Status)
		}
		s.cascadeStageStatus(task.StageID)
	}
}

func (s *ExecutionService) cascadeTaskStatus(taskID uint) {
	if s.operationRepo == nil || s.taskRepo == nil {
		return
	}
	ops, err := s.operationRepo.FindByTaskID(taskID)
	if err != nil || len(ops) == 0 {
		return
	}
	statuses := make([]string, len(ops))
	for i, op := range ops {
		statuses[i] = op.Status
	}
	newStatus := aggregateStatus(statuses)

	task, err := s.taskRepo.FindByID(taskID)
	if err != nil {
		return
	}
	if task.Status != newStatus {
		s.taskRepo.UpdateStatus(taskID, newStatus)
		log.Printf("[CASCADE] Task %d status → %s", taskID, newStatus)
		s.cascadeStageStatus(task.StageID)
	}
}

func (s *ExecutionService) autoStartNextStep(drillID uint, currentOrder int) {
	if s.executionRepo == nil {
		return
	}
	nextExec, err := s.executionRepo.FindNextPendingByDrillID(drillID, currentOrder)
	if err != nil || nextExec == nil {
		return
	}

	log.Printf("[AUTO-START] Auto-starting next step: execution %d (order %d, name: %s)", nextExec.ID, nextExec.StepOrder, nextExec.StepName)

	now := time.Now()
	nextExec.StartTime = &now
	nextExec.Status = "in_progress"
	if err := s.executionRepo.Update(nextExec); err != nil {
		log.Printf("[WARN] Failed to auto-start execution %d: %v", nextExec.ID, err)
		return
	}

	s.syncTaskStatus(nextExec)
	s.broadcastStepUpdate(nextExec, "auto_started")
}

func aggregateStatus(statuses []string) string {
	allCompleted := true
	hasInProgress := false
	for _, st := range statuses {
		if st == "in_progress" || st == "running" {
			hasInProgress = true
		}
		if st != "completed" {
			allCompleted = false
		}
	}
	if allCompleted {
		return "completed"
	}
	if hasInProgress {
		return "in_progress"
	}
	return "pending"
}

func (s *ExecutionService) cascadeStageStatus(stageID uint) {
	if s.taskRepo == nil || s.stageRepo == nil {
		return
	}
	tasks, err := s.taskRepo.FindByStageID(stageID)
	if err != nil || len(tasks) == 0 {
		return
	}
	statuses := make([]string, len(tasks))
	for i, t := range tasks {
		statuses[i] = t.Status
	}
	newStatus := aggregateStatus(statuses)

	stage, err := s.stageRepo.FindByID(stageID)
	if err != nil {
		return
	}
	if stage.Status != newStatus {
		s.stageRepo.UpdateStatus(stageID, newStatus)
		log.Printf("[DEBUG] Cascaded stage %d status to %s", stageID, newStatus)
		s.cascadePhaseStatus(stage.PhaseID)
	}
}

func (s *ExecutionService) cascadePhaseStatus(phaseID uint) {
	if s.stageRepo == nil || s.phaseRepo == nil {
		return
	}
	stages, err := s.stageRepo.FindByPhaseID(phaseID)
	if err != nil || len(stages) == 0 {
		return
	}
	statuses := make([]string, len(stages))
	for i, st := range stages {
		statuses[i] = st.Status
	}
	newStatus := aggregateStatus(statuses)

	phase, err := s.phaseRepo.FindByID(phaseID)
	if err != nil {
		return
	}
	if phase.Status != newStatus {
		s.phaseRepo.UpdateStatus(phaseID, newStatus)
		log.Printf("[DEBUG] Cascaded phase %d status to %s", phaseID, newStatus)
	}
}

func (s *ExecutionService) broadcastStepUpdate(execution *model.StepExecution, action string) {
	if s.wsHub == nil {
		return
	}

	message := map[string]interface{}{
		"execution_id":   execution.ID,
		"drill_id":       execution.DrillID,
		"step_order":     execution.StepOrder,
		"step_name":      execution.StepName,
		"status":         execution.Status,
		"action":         action,
		"start_time":     execution.StartTime,
		"end_time":       execution.EndTime,
		"duration_seconds": execution.DurationSeconds,
		"assignee_id":    execution.AssigneeID,
		"timestamp":      time.Now(),
	}

	s.wsHub.BroadcastToDrill(execution.DrillID, "step_update", message)
	s.wsHub.BroadcastToDrill(execution.DrillID, "message", message)
}

func (s *ExecutionService) AssignStep(executionID, assigneeID uint) error {
	err := s.executionRepo.AssignStep(executionID, assigneeID)
	if err != nil {
		return err
	}

	execution, err := s.executionRepo.FindByID(executionID)
	if err != nil {
		return err
	}

	// 同步执行人到关联的 operation 和 task
	if execution.OperationID != nil && s.operationRepo != nil {
		if err := s.operationRepo.UpdateExecutor(*execution.OperationID, &assigneeID); err != nil {
			log.Printf("[WARN] Failed to sync executor to operation %d: %v", *execution.OperationID, err)
		}
	}
	if execution.TaskID != nil && s.taskRepo != nil {
		if err := s.taskRepo.UpdateExecutor(*execution.TaskID, &assigneeID); err != nil {
			log.Printf("[WARN] Failed to sync executor to task %d: %v", *execution.TaskID, err)
		}
	}

	s.broadcastStepUpdate(execution, "assigned")
	return nil
}

func (s *ExecutionService) StartExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	// 修改：允许从pending或paused状态开始
	if execution.Status != "pending" && execution.Status != "paused" {
		return errors.New("can only start pending or paused steps")
	}

	now := time.Now()
	
	// 只有从pending状态开始时才设置开始时间
	if execution.Status == "pending" {
		execution.StartTime = &now
	}
	
	execution.Status = "in_progress"
	err = s.executionRepo.Update(execution)
	if err != nil {
		return err
	}

	s.syncTaskStatus(execution)
	s.broadcastStepUpdate(execution, "started")
	return nil
}

func (s *ExecutionService) PauseExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	// 修改：允许从in_progress状态暂停
	if execution.Status != "in_progress" {
		return errors.New("can only pause in-progress steps")
	}

	execution.Status = "paused"
	err = s.executionRepo.Update(execution)
	if err != nil {
		return err
	}

	s.syncTaskStatus(execution)
	s.broadcastStepUpdate(execution, "paused")
	return nil
}

func (s *ExecutionService) ResumeExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	// 修改：允许从paused状态恢复
	if execution.Status != "paused" {
		return errors.New("can only resume paused steps")
	}

	execution.Status = "in_progress"
	err = s.executionRepo.Update(execution)
	if err != nil {
		return err
	}

	s.syncTaskStatus(execution)
	s.broadcastStepUpdate(execution, "resumed")
	return nil
}

func (s *ExecutionService) CompleteExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	// 修改：允许从pending、in_progress或paused状态完成（管理员可以跳过步骤）
	if execution.Status != "pending" && execution.Status != "in_progress" && execution.Status != "paused" {
		return errors.New("can only complete pending, in-progress or paused steps")
	}

	now := time.Now()
	
	// 如果是从pending状态直接完成，设置开始时间
	if execution.Status == "pending" {
		execution.StartTime = &now
	}
	
	execution.Status = "completed"
	execution.EndTime = &now

	if execution.StartTime != nil {
		duration := now.Sub(*execution.StartTime)
		execution.DurationSeconds = int(duration.Seconds())
	}

	err = s.executionRepo.Update(execution)
	if err != nil {
		return err
	}

	s.syncTaskStatus(execution)
	// 自动开始下一个步骤
	s.autoStartNextStep(execution.DrillID, execution.StepOrder)
	s.broadcastStepUpdate(execution, "completed")
	return nil
}