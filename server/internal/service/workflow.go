package service

import (
	"errors"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type WorkflowService struct {
	phaseRepo     *repository.PhaseRepository
	stageRepo     *repository.StageRepository
	taskRepo      *repository.TaskRepository
	operationRepo *repository.OperationRepository
	templateRepo  *repository.TemplateRepository
}

func NewWorkflowService(
	phaseRepo *repository.PhaseRepository,
	stageRepo *repository.StageRepository,
	taskRepo *repository.TaskRepository,
	operationRepo *repository.OperationRepository,
	templateRepo *repository.TemplateRepository,
) *WorkflowService {
	return &WorkflowService{
		phaseRepo:     phaseRepo,
		stageRepo:     stageRepo,
		taskRepo:      taskRepo,
		operationRepo: operationRepo,
		templateRepo:  templateRepo,
	}
}

// Phase operations
func (s *WorkflowService) CreatePhase(phase *model.Phase) error {
	return s.phaseRepo.Create(phase)
}

func (s *WorkflowService) GetPhase(id uint) (*model.Phase, error) {
	return s.phaseRepo.FindByID(id)
}

func (s *WorkflowService) GetPhaseWithStages(id uint) (*model.Phase, error) {
	return s.phaseRepo.FindByIDWithStages(id)
}

func (s *WorkflowService) GetTemplatePhases(templateID uint) ([]*model.Phase, error) {
	return s.phaseRepo.FindByTemplateID(templateID)
}

func (s *WorkflowService) UpdatePhase(phase *model.Phase) error {
	return s.phaseRepo.Update(phase)
}

func (s *WorkflowService) DeletePhase(id uint) error {
	return s.phaseRepo.Delete(id)
}

// Stage operations
func (s *WorkflowService) CreateStage(stage *model.Stage) error {
	return s.stageRepo.Create(stage)
}

func (s *WorkflowService) GetStage(id uint) (*model.Stage, error) {
	return s.stageRepo.FindByID(id)
}

func (s *WorkflowService) GetStageWithTasks(id uint) (*model.Stage, error) {
	return s.stageRepo.FindByIDWithTasks(id)
}

func (s *WorkflowService) GetPhaseStages(phaseID uint) ([]*model.Stage, error) {
	return s.stageRepo.FindByPhaseID(phaseID)
}

func (s *WorkflowService) UpdateStage(stage *model.Stage) error {
	return s.stageRepo.Update(stage)
}

func (s *WorkflowService) DeleteStage(id uint) error {
	return s.stageRepo.Delete(id)
}

// Task operations
func (s *WorkflowService) CreateTask(task *model.Task) error {
	return s.taskRepo.Create(task)
}

func (s *WorkflowService) GetTask(id uint) (*model.Task, error) {
	return s.taskRepo.FindByID(id)
}

func (s *WorkflowService) GetTaskWithOperations(id uint) (*model.Task, error) {
	return s.taskRepo.FindByIDWithOperations(id)
}

func (s *WorkflowService) GetTaskWithDetails(id uint) (*model.Task, error) {
	return s.taskRepo.FindByIDWithDetails(id)
}

func (s *WorkflowService) GetStageTasks(stageID uint) ([]*model.Task, error) {
	return s.taskRepo.FindByStageID(stageID)
}

func (s *WorkflowService) UpdateTask(task *model.Task) error {
	return s.taskRepo.Update(task)
}

func (s *WorkflowService) DeleteTask(id uint) error {
	return s.taskRepo.Delete(id)
}

// Operation operations
func (s *WorkflowService) CreateOperation(operation *model.Operation) error {
	return s.operationRepo.Create(operation)
}

func (s *WorkflowService) GetOperation(id uint) (*model.Operation, error) {
	return s.operationRepo.FindByID(id)
}

func (s *WorkflowService) GetOperationWithDetails(id uint) (*model.Operation, error) {
	return s.operationRepo.FindByIDWithDetails(id)
}

func (s *WorkflowService) GetTaskOperations(taskID uint) ([]*model.Operation, error) {
	return s.operationRepo.FindByTaskID(taskID)
}

func (s *WorkflowService) UpdateOperation(operation *model.Operation) error {
	return s.operationRepo.Update(operation)
}

func (s *WorkflowService) DeleteOperation(id uint) error {
	return s.operationRepo.Delete(id)
}

// Execution operations
func (s *WorkflowService) StartPhase(id uint) error {
	phase, err := s.phaseRepo.FindByID(id)
	if err != nil {
		return err
	}

	if phase.Status != "pending" {
		return errors.New("can only start pending phases")
	}

	now := time.Now()
	phase.Status = "in_progress"
	phase.ActualStartTime = &now
	return s.phaseRepo.Update(phase)
}

func (s *WorkflowService) CompletePhase(id uint) error {
	phase, err := s.phaseRepo.FindByID(id)
	if err != nil {
		return err
	}

	if phase.Status != "in_progress" {
		return errors.New("can only complete in-progress phases")
	}

	now := time.Now()
	phase.Status = "completed"
	phase.ActualEndTime = &now
	if phase.ActualStartTime != nil {
		duration := now.Sub(*phase.ActualStartTime)
		phase.DurationSeconds = int(duration.Seconds())
	}
	return s.phaseRepo.Update(phase)
}

func (s *WorkflowService) StartStage(id uint) error {
	stage, err := s.stageRepo.FindByID(id)
	if err != nil {
		return err
	}

	if stage.Status != "pending" {
		return errors.New("can only start pending stages")
	}

	now := time.Now()
	stage.Status = "in_progress"
	stage.ActualStartTime = &now
	return s.stageRepo.Update(stage)
}

func (s *WorkflowService) CompleteStage(id uint) error {
	stage, err := s.stageRepo.FindByID(id)
	if err != nil {
		return err
	}

	if stage.Status != "in_progress" {
		return errors.New("can only complete in-progress stages")
	}

	now := time.Now()
	stage.Status = "completed"
	stage.ActualEndTime = &now
	if stage.ActualStartTime != nil {
		duration := now.Sub(*stage.ActualStartTime)
		stage.DurationSeconds = int(duration.Seconds())
	}
	return s.stageRepo.Update(stage)
}

func (s *WorkflowService) StartTask(id uint) error {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return err
	}

	if task.Status != "pending" && task.Status != "paused" {
		return errors.New("can only start pending or paused tasks")
	}

	if task.Status == "pending" {
		if err := s.checkTaskPredecessors(task); err != nil {
			return err
		}
	}

	now := time.Now()
	task.Status = "in_progress"
	if task.Status == "pending" {
		task.ActualStartTime = &now
	}
	return s.taskRepo.Update(task)
}

func (s *WorkflowService) PauseTask(id uint) error {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return err
	}

	if task.Status != "in_progress" {
		return errors.New("can only pause in-progress tasks")
	}

	task.Status = "paused"
	return s.taskRepo.Update(task)
}

func (s *WorkflowService) CompleteTask(id uint) error {
	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return err
	}

	if task.Status != "in_progress" {
		return errors.New("can only complete in-progress tasks")
	}

	now := time.Now()
	task.Status = "completed"
	task.ActualEndTime = &now
	if task.ActualStartTime != nil {
		duration := now.Sub(*task.ActualStartTime)
		task.DurationSeconds = int(duration.Seconds())
	}
	return s.taskRepo.Update(task)
}

func (s *WorkflowService) StartOperation(id uint) error {
	operation, err := s.operationRepo.FindByID(id)
	if err != nil {
		return err
	}

	if operation.Status != "pending" && operation.Status != "paused" {
		return errors.New("can only start pending or paused operations")
	}

	if operation.Status == "pending" {
		if err := s.checkOperationPredecessors(operation); err != nil {
			return err
		}
	}

	now := time.Now()
	operation.Status = "in_progress"
	if operation.Status == "pending" {
		operation.ActualStartTime = &now
	}
	return s.operationRepo.Update(operation)
}

func (s *WorkflowService) PauseOperation(id uint) error {
	operation, err := s.operationRepo.FindByID(id)
	if err != nil {
		return err
	}

	if operation.Status != "in_progress" {
		return errors.New("can only pause in-progress operations")
	}

	operation.Status = "paused"
	return s.operationRepo.Update(operation)
}

func (s *WorkflowService) CompleteOperation(id uint) error {
	operation, err := s.operationRepo.FindByID(id)
	if err != nil {
		return err
	}

	if operation.Status != "in_progress" {
		return errors.New("can only complete in-progress operations")
	}

	now := time.Now()
	operation.Status = "completed"
	operation.ActualEndTime = &now
	if operation.ActualStartTime != nil {
		duration := now.Sub(*operation.ActualStartTime)
		operation.DurationSeconds = int(duration.Seconds())
	}
	return s.operationRepo.Update(operation)
}

// Predecessor check functions
func (s *WorkflowService) checkTaskPredecessors(task *model.Task) error {
	if len(task.PredecessorIDs) == 0 {
		return nil
	}

	pendingTasks, err := s.taskRepo.FindPendingByPredecessorIDs(task.PredecessorIDs)
	if err != nil {
		return err
	}

	if len(pendingTasks) > 0 {
		return errors.New("predecessor tasks not completed")
	}

	return nil
}

func (s *WorkflowService) checkOperationPredecessors(operation *model.Operation) error {
	if len(operation.PredecessorIDs) == 0 {
		return nil
	}

	pendingOperations, err := s.operationRepo.FindPendingByPredecessorIDs(operation.PredecessorIDs)
	if err != nil {
		return err
	}

	if len(pendingOperations) > 0 {
		return errors.New("predecessor operations not completed")
	}

	return nil
}

// Get full hierarchy
func (s *WorkflowService) GetTemplateFullHierarchy(templateID uint) (*model.DrillTemplate, error) {
	template, err := s.templateRepo.FindByID(templateID)
	if err != nil {
		return nil, err
	}

	phases, err := s.phaseRepo.FindByTemplateIDWithStages(templateID)
	if err != nil {
		return nil, err
	}

	for _, phase := range phases {
		stages, err := s.stageRepo.FindByPhaseIDWithTasks(phase.ID)
		if err != nil {
			return nil, err
		}
		phase.Stages = stages

		for _, stage := range phase.Stages {
			tasks, err := s.taskRepo.FindByStageIDWithOperations(stage.ID)
			if err != nil {
				return nil, err
			}
			stage.Tasks = tasks
		}
	}

	template.Phases = phases
	return template, nil
}

// Auto-activation mechanism
// When an operation is completed, check if subsequent operations can be auto-activated
func (s *WorkflowService) AutoActivateOperations(taskID uint) error {
	operations, err := s.operationRepo.FindByTaskID(taskID)
	if err != nil {
		return err
	}

	for _, op := range operations {
		if op.Status != "pending" {
			continue
		}

		if len(op.PredecessorIDs) == 0 {
			continue
		}

		pendingOps, err := s.operationRepo.FindPendingByPredecessorIDs(op.PredecessorIDs)
		if err != nil {
			return err
		}

		if len(pendingOps) == 0 {
			now := time.Now()
			op.Status = "in_progress"
			op.ActualStartTime = &now
			if err := s.operationRepo.Update(op); err != nil {
				return err
			}
		}
	}

	return nil
}

// When a task is completed, check if subsequent tasks can be auto-activated
func (s *WorkflowService) AutoActivateTasks(stageID uint) error {
	tasks, err := s.taskRepo.FindByStageID(stageID)
	if err != nil {
		return err
	}

	for _, task := range tasks {
		if task.Status != "pending" {
			continue
		}

		if len(task.PredecessorIDs) == 0 {
			continue
		}

		pendingTasks, err := s.taskRepo.FindPendingByPredecessorIDs(task.PredecessorIDs)
		if err != nil {
			return err
		}

		if len(pendingTasks) == 0 {
			now := time.Now()
			task.Status = "in_progress"
			task.ActualStartTime = &now
			if err := s.taskRepo.Update(task); err != nil {
				return err
			}
		}
	}

	return nil
}

// When a stage is completed, check if subsequent stages can be auto-activated
func (s *WorkflowService) AutoActivateStages(phaseID uint) error {
	stages, err := s.stageRepo.FindByPhaseID(phaseID)
	if err != nil {
		return err
	}

	allCompleted := true
	for _, stage := range stages {
		if stage.Status != "completed" {
			allCompleted = false
			break
		}
	}

	if allCompleted {
		return s.CompletePhase(phaseID)
	}

	return nil
}

// When a phase is completed, check if subsequent phases can be auto-activated
func (s *WorkflowService) AutoActivatePhases(templateID uint) error {
	phases, err := s.phaseRepo.FindByTemplateID(templateID)
	if err != nil {
		return err
	}

	allCompleted := true
	for _, phase := range phases {
		if phase.Status != "completed" {
			allCompleted = false
			break
		}
	}

	if allCompleted {
		template, err := s.templateRepo.FindByID(templateID)
		if err != nil {
			return err
		}
		return s.updateTemplateStatus(template, "completed")
	}

	return nil
}

func (s *WorkflowService) updateTemplateStatus(template *model.DrillTemplate, status string) error {
	return nil
}

// Enhanced completion methods with auto-activation
func (s *WorkflowService) CompleteOperationWithAutoActivation(id uint) error {
	if err := s.CompleteOperation(id); err != nil {
		return err
	}

	operation, err := s.operationRepo.FindByID(id)
	if err != nil {
		return err
	}

	return s.AutoActivateOperations(operation.TaskID)
}

func (s *WorkflowService) CompleteTaskWithAutoActivation(id uint) error {
	if err := s.CompleteTask(id); err != nil {
		return err
	}

	task, err := s.taskRepo.FindByID(id)
	if err != nil {
		return err
	}

	if err := s.AutoActivateTasks(task.StageID); err != nil {
		return err
	}

	operations, err := s.operationRepo.FindByTaskID(task.ID)
	if err != nil {
		return err
	}

	allCompleted := true
	for _, op := range operations {
		if op.Status != "completed" {
			allCompleted = false
			break
		}
	}

	if allCompleted {
		return s.AutoActivateStages(task.StageID)
	}

	return nil
}

func (s *WorkflowService) CompleteStageWithAutoActivation(id uint) error {
	if err := s.CompleteStage(id); err != nil {
		return err
	}

	stage, err := s.stageRepo.FindByID(id)
	if err != nil {
		return err
	}

	return s.AutoActivateStages(stage.PhaseID)
}

func (s *WorkflowService) CompletePhaseWithAutoActivation(id uint) error {
	if err := s.CompletePhase(id); err != nil {
		return err
	}

	phase, err := s.phaseRepo.FindByID(id)
	if err != nil {
		return err
	}

	return s.AutoActivatePhases(phase.TemplateID)
}