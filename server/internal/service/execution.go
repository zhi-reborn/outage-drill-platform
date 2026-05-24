package service

import (
	"errors"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type ExecutionService struct {
	executionRepo *repository.ExecutionRepository
	drillRepo     *repository.DrillRepository
}

func NewExecutionService(
	executionRepo *repository.ExecutionRepository,
	drillRepo *repository.DrillRepository,
) *ExecutionService {
	return &ExecutionService{
		executionRepo: executionRepo,
		drillRepo:     drillRepo,
	}
}

func (s *ExecutionService) GetExecution(id uint) (*model.StepExecution, error) {
	return s.executionRepo.FindByID(id)
}

func (s *ExecutionService) GetDrillExecutions(drillID uint) ([]*model.StepExecution, error) {
	return s.executionRepo.FindByDrillID(drillID)
}

func (s *ExecutionService) GetUserTasks(userID uint) ([]*model.StepExecution, error) {
	return s.executionRepo.FindByAssigneeID(userID)
}

func (s *ExecutionService) AssignStep(executionID, assigneeID uint) error {
	execution, err := s.executionRepo.FindByID(executionID)
	if err != nil {
		return err
	}

	if execution.Status != "pending" {
		return errors.New("can only assign pending steps")
	}

	return s.executionRepo.AssignStep(executionID, assigneeID)
}

func (s *ExecutionService) StartExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "pending" && execution.Status != "paused" {
		return errors.New("can only start pending or paused steps")
	}

	now := time.Now()
	
	// 修复：先判断原始状态，再修改状态
	// 只有从pending状态开始时才设置开始时间
	if execution.Status == "pending" {
		execution.StartTime = &now
	}
	
	execution.Status = "in_progress"
	return s.executionRepo.Update(execution)
}

func (s *ExecutionService) PauseExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "in_progress" {
		return errors.New("can only pause in-progress steps")
	}

	execution.Status = "paused"
	return s.executionRepo.Update(execution)
}

func (s *ExecutionService) ResumeExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "paused" {
		return errors.New("can only resume paused steps")
	}

	execution.Status = "in_progress"
	return s.executionRepo.Update(execution)
}

func (s *ExecutionService) CompleteExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "in_progress" {
		return errors.New("can only complete in-progress steps")
	}

	now := time.Now()
	execution.Status = "completed"
	execution.EndTime = &now

	if execution.StartTime != nil {
		duration := now.Sub(*execution.StartTime)
		execution.DurationSeconds = int(duration.Seconds())
	}

	return s.executionRepo.Update(execution)
}