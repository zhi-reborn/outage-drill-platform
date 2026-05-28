package service

import (
	"errors"
	"log"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type DrillService struct {
	drillRepo     *repository.DrillRepository
	templateRepo  *repository.TemplateRepository
	executionRepo *repository.ExecutionRepository
	taskRepo      *repository.TaskRepository
	operationRepo *repository.OperationRepository
	stageRepo     *repository.StageRepository
	phaseRepo     *repository.PhaseRepository
}

func NewDrillService(
	drillRepo *repository.DrillRepository,
	templateRepo *repository.TemplateRepository,
	executionRepo *repository.ExecutionRepository,
	taskRepo *repository.TaskRepository,
	operationRepo *repository.OperationRepository,
	stageRepo *repository.StageRepository,
	phaseRepo *repository.PhaseRepository,
) *DrillService {
	return &DrillService{
		drillRepo:     drillRepo,
		templateRepo:  templateRepo,
		executionRepo: executionRepo,
		taskRepo:      taskRepo,
		operationRepo: operationRepo,
		stageRepo:     stageRepo,
		phaseRepo:     phaseRepo,
	}
}

func (s *DrillService) CreateDrill(templateID uint, name string, createdBy uint) (*model.DrillInstance, error) {
	template, err := s.templateRepo.FindByID(templateID)
	if err != nil {
		return nil, errors.New("template not found")
	}

	drill := &model.DrillInstance{
		TemplateID: templateID,
		Name:       name,
		Status:     "pending",
		CreatedBy:  createdBy,
	}

	if err := s.drillRepo.Create(drill); err != nil {
		return nil, err
	}

	// 优先使用旧的Steps字段（向后兼容）
	if len(template.Steps) > 0 {
		for _, step := range template.Steps {
			execution := &model.StepExecution{
				DrillID:   drill.ID,
				StepOrder: step.Order,
				StepName:  step.Name,
				Status:    "pending",
			}
			if err := s.executionRepo.Create(execution); err != nil {
				return nil, errors.New("failed to create step execution: " + err.Error())
			}
		}
	} else {
		// 使用新的层级结构（从tasks或operations创建execution记录）
		templateWithPhases, err := s.templateRepo.FindByIDWithPhases(templateID)
		if err != nil {
			return nil, errors.New("failed to load template hierarchy: " + err.Error())
		}

		// 从层级结构中提取所有tasks或operations
		stepOrder := 1
		for _, phase := range templateWithPhases.Phases {
			for _, stage := range phase.Stages {
				for _, task := range stage.Tasks {
					taskID := task.ID
					// 如果task有operations，从operations创建
					if len(task.Operations) > 0 {
						for _, operation := range task.Operations {
							opID := operation.ID
							execution := &model.StepExecution{
								DrillID:     drill.ID,
								StepOrder:   stepOrder,
								StepName:    task.Name + " - " + operation.Name,
								TaskID:      &taskID,
								OperationID: &opID,
								Status:      "pending",
							}
							if err := s.executionRepo.Create(execution); err != nil {
								return nil, errors.New("failed to create step execution: " + err.Error())
							}
							stepOrder++
						}
					} else {
						// 如果没有operations，从task创建
						execution := &model.StepExecution{
							DrillID:   drill.ID,
							StepOrder: stepOrder,
							StepName:  task.Name,
							TaskID:    &taskID,
							Status:    "pending",
						}
						if err := s.executionRepo.Create(execution); err != nil {
							return nil, errors.New("failed to create step execution: " + err.Error())
						}
						stepOrder++
					}
				}
			}
		}

		// 如果没有找到任何tasks或operations，返回错误
		if stepOrder == 1 {
			return nil, errors.New("template has no steps, tasks or operations defined")
		}
	}

	return drill, nil
}

func (s *DrillService) StartDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "pending" {
		return errors.New("drill can only be started from pending status")
	}

	now := time.Now()
	drill.Status = "running"
	drill.StartTime = &now

	return s.drillRepo.Update(drill)
}

func (s *DrillService) PauseDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "running" {
		return errors.New("drill can only be paused from running status")
	}

	drill.Status = "paused"
	return s.drillRepo.Update(drill)
}

func (s *DrillService) ResumeDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "paused" {
		return errors.New("drill can only be resumed from paused status")
	}

	drill.Status = "running"
	return s.drillRepo.Update(drill)
}

func (s *DrillService) EndDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status == "completed" || drill.Status == "cancelled" {
		return errors.New("drill already ended")
	}

	now := time.Now()
	drill.Status = "completed"
	drill.EndTime = &now

	return s.drillRepo.Update(drill)
}

func (s *DrillService) GetDrill(id uint) (*model.DrillInstance, error) {
	return s.drillRepo.FindByID(id)
}

func (s *DrillService) SyncDrillSteps(drillID uint) error {
	drill, err := s.drillRepo.FindByID(drillID)
	if err != nil {
		return err
	}

	// 检查是否已有步骤记录
	existingExecutions, err := s.executionRepo.FindByDrillID(drillID)
	if err != nil {
		return err
	}

	// 从模板层级结构生成步骤记录
	template, err := s.templateRepo.FindByID(drill.TemplateID)
	if err != nil {
		return errors.New("template not found")
	}

	// 优先使用旧的Steps字段
	if len(template.Steps) > 0 {
		for _, step := range template.Steps {
			execution := &model.StepExecution{
				DrillID:   drillID,
				StepOrder: step.Order,
				StepName:  step.Name,
				Status:    "pending",
			}
			if err := s.executionRepo.Create(execution); err != nil {
				return errors.New("failed to create step execution: " + err.Error())
			}
		}
		return nil
	}

	// 使用新的层级结构
	templateWithPhases, err := s.templateRepo.FindByIDWithPhases(drill.TemplateID)
	if err != nil {
		return errors.New("failed to load template hierarchy: " + err.Error())
	}

	// 构建 stepName -> (taskID, operationID) 映射
	type IDMapping struct {
		TaskID      uint
		OperationID *uint
	}
	nameToIDs := make(map[string]IDMapping)
	for _, phase := range templateWithPhases.Phases {
		for _, stage := range phase.Stages {
			for _, task := range stage.Tasks {
				if len(task.Operations) > 0 {
					for _, operation := range task.Operations {
						opID := operation.ID
						nameToIDs[task.Name+" - "+operation.Name] = IDMapping{TaskID: task.ID, OperationID: &opID}
					}
				} else {
					nameToIDs[task.Name] = IDMapping{TaskID: task.ID, OperationID: nil}
				}
			}
		}
	}

	// 如果已有步骤记录，更新 task_id/operation_id 关联并同步状态
	if len(existingExecutions) > 0 {
		updatedStageIDs := make(map[uint]bool)
		for _, exec := range existingExecutions {
			if mapping, ok := nameToIDs[exec.StepName]; ok {
				needUpdate := false
				if exec.TaskID == nil {
					exec.TaskID = &mapping.TaskID
					needUpdate = true
				}
				if exec.OperationID == nil && mapping.OperationID != nil {
					exec.OperationID = mapping.OperationID
					needUpdate = true
				}
				if needUpdate {
					s.executionRepo.Update(exec)
				}
				// 同步状态到 tasks 和 operations 表
				if exec.Status != "pending" {
					s.taskRepo.UpdateStatus(mapping.TaskID, exec.Status)
					if mapping.OperationID != nil {
						s.operationRepo.UpdateStatus(*mapping.OperationID, exec.Status)
					}
				}
				// 同步执行人到 tasks 和 operations 表
				if exec.AssigneeID != nil {
					s.taskRepo.UpdateExecutor(mapping.TaskID, exec.AssigneeID)
					if mapping.OperationID != nil {
						s.operationRepo.UpdateExecutor(*mapping.OperationID, exec.AssigneeID)
					}
				}
				// 收集需要级联更新的 stage
				task, err := s.taskRepo.FindByID(mapping.TaskID)
				if err == nil {
					updatedStageIDs[task.StageID] = true
				}
			}
		}
		// 级联更新 stage 和 phase 状态
		for stageID := range updatedStageIDs {
			s.cascadeStageStatus(stageID)
		}
		return nil
	}

	// 没有步骤记录，创建新的
	stepOrder := 1
	for _, phase := range templateWithPhases.Phases {
		for _, stage := range phase.Stages {
			for _, task := range stage.Tasks {
				taskID := task.ID
				if len(task.Operations) > 0 {
					for _, operation := range task.Operations {
						opID := operation.ID
						execution := &model.StepExecution{
							DrillID:     drillID,
							StepOrder:   stepOrder,
							StepName:    task.Name + " - " + operation.Name,
							TaskID:      &taskID,
							OperationID: &opID,
							Status:      "pending",
						}
						if err := s.executionRepo.Create(execution); err != nil {
							return errors.New("failed to create step execution: " + err.Error())
						}
						stepOrder++
					}
				} else {
					execution := &model.StepExecution{
						DrillID:   drillID,
						StepOrder: stepOrder,
						StepName:  task.Name,
						TaskID:    &taskID,
						Status:    "pending",
					}
					if err := s.executionRepo.Create(execution); err != nil {
						return errors.New("failed to create step execution: " + err.Error())
					}
					stepOrder++
				}
			}
		}
	}

	if stepOrder == 1 {
		return errors.New("template has no steps, tasks or operations defined")
	}

	return nil
}

func (s *DrillService) ListDrills() ([]*model.DrillInstance, error) {
	return s.drillRepo.List()
}

func (s *DrillService) DeleteDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "pending" && drill.Status != "completed" {
		return errors.New("只能删除待开始或已完成的演练")
	}

	err = s.executionRepo.DeleteByDrillID(id)
	if err != nil {
		return err
	}

	return s.drillRepo.Delete(id)
}

func (s *DrillService) cascadeStageStatus(stageID uint) {
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
		log.Printf("[DEBUG] DrillService cascaded stage %d status to %s", stageID, newStatus)
		s.cascadePhaseStatus(stage.PhaseID)
	}
}

func (s *DrillService) cascadePhaseStatus(phaseID uint) {
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
		log.Printf("[DEBUG] DrillService cascaded phase %d status to %s", phaseID, newStatus)
	}
}
