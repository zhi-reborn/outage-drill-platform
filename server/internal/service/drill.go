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

	if err := s.drillRepo.Update(drill); err != nil {
		return err
	}

	// 自动启动第一个执行步骤
	firstExec, err := s.executionRepo.FindNextPendingByDrillID(id, 0)
	if err != nil || firstExec == nil {
		return nil
	}

	firstExec.Status = "in_progress"
	firstExec.StartTime = &now
	if err := s.executionRepo.Update(firstExec); err != nil {
		return nil
	}

	// 同步到 operation/task 并级联向上更新父节点状态
	s.syncAndCascade(firstExec)
	log.Printf("[AUTO-START] Drill %d started, auto-started first step: execution %d (%s)", id, firstExec.ID, firstExec.StepName)

	return nil
}

func (s *DrillService) syncAndCascade(execution *model.StepExecution) {
	if execution.OperationID != nil && s.operationRepo != nil {
		operation, err := s.operationRepo.FindByID(*execution.OperationID)
		if err != nil {
			return
		}
		if operation.Status != execution.Status {
			s.operationRepo.UpdateStatus(operation.ID, execution.Status)
			log.Printf("[SYNC] Operation %d status → %s", operation.ID, execution.Status)
		}
		s.cascadeTaskStatusFromOp(operation.TaskID)
	} else if execution.TaskID != nil && s.taskRepo != nil {
		task, err := s.taskRepo.FindByID(*execution.TaskID)
		if err != nil {
			return
		}
		if task.Status != execution.Status {
			s.taskRepo.UpdateStatus(task.ID, execution.Status)
			log.Printf("[SYNC] Task %d status → %s", task.ID, execution.Status)
		}
		s.cascadeStageStatus(task.StageID)
	}
}

func (s *DrillService) cascadeTaskStatusFromOp(taskID uint) {
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
		log.Printf("[CASCADE] DrillService Task %d status → %s", taskID, newStatus)
		s.cascadeStageStatus(task.StageID)

		if newStatus == "completed" {
			s.autoStartNextTask(task)
		}
	}
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
		log.Printf("[CASCADE] DrillService Stage %d status → %s", stageID, newStatus)
		s.cascadePhaseStatus(stage.PhaseID)

		if newStatus == "completed" {
			s.autoStartNextStage(stage)
		}
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
		log.Printf("[CASCADE] DrillService Phase %d status → %s", phaseID, newStatus)

		if newStatus == "completed" {
			s.autoStartNextPhase(phase)
		}
	}
}

func (s *DrillService) autoStartNextPhase(completedPhase *model.Phase) {
	if s.phaseRepo == nil || s.stageRepo == nil || s.taskRepo == nil || s.operationRepo == nil {
		return
	}
	phases, err := s.phaseRepo.FindByTemplateID(completedPhase.TemplateID)
	if err != nil || len(phases) == 0 {
		return
	}
	var nextPhase *model.Phase
	for _, p := range phases {
		if p.Order == completedPhase.Order+1 {
			nextPhase = p
			break
		}
	}
	if nextPhase == nil || nextPhase.Status != "pending" {
		return
	}
	now := time.Now()
	nextPhase.Status = "in_progress"
	nextPhase.ActualStartTime = &now
	if err := s.phaseRepo.Update(nextPhase); err != nil {
		log.Printf("[AUTO-START] DrillService: failed to start next phase %d: %v", nextPhase.ID, err)
		return
	}
	log.Printf("[AUTO-START] DrillService: Phase %d → in_progress", nextPhase.ID)

	stages, err := s.stageRepo.FindByPhaseID(nextPhase.ID)
	if err != nil || len(stages) == 0 {
		return
	}
	firstStage := stages[0]
	firstStage.Status = "in_progress"
	firstStage.ActualStartTime = &now
	if err := s.stageRepo.Update(firstStage); err != nil {
		return
	}
	log.Printf("[AUTO-START] DrillService: Stage %d → in_progress", firstStage.ID)

	tasks, err := s.taskRepo.FindByStageID(firstStage.ID)
	if err != nil || len(tasks) == 0 {
		return
	}
	firstTask := tasks[0]
	firstTask.Status = "in_progress"
	firstTask.ActualStartTime = &now
	if err := s.taskRepo.Update(firstTask); err != nil {
		return
	}
	log.Printf("[AUTO-START] DrillService: Task %d → in_progress", firstTask.ID)

	operations, err := s.operationRepo.FindByTaskID(firstTask.ID)
	if err != nil || len(operations) == 0 {
		return
	}
	firstOp := operations[0]
	firstOp.Status = "in_progress"
	firstOp.ActualStartTime = &now
	s.operationRepo.Update(firstOp)
	log.Printf("[AUTO-START] DrillService: Operation %d → in_progress", firstOp.ID)
}

func (s *DrillService) autoStartNextStage(completedStage *model.Stage) {
	if s.stageRepo == nil || s.taskRepo == nil || s.operationRepo == nil {
		return
	}
	stages, err := s.stageRepo.FindByPhaseID(completedStage.PhaseID)
	if err != nil || len(stages) == 0 {
		return
	}
	var nextStage *model.Stage
	for _, st := range stages {
		if st.Order == completedStage.Order+1 {
			nextStage = st
			break
		}
	}
	if nextStage == nil || nextStage.Status != "pending" {
		return
	}
	now := time.Now()
	nextStage.Status = "in_progress"
	nextStage.ActualStartTime = &now
	if err := s.stageRepo.Update(nextStage); err != nil {
		return
	}
	log.Printf("[AUTO-START] DrillService: Stage %d → in_progress", nextStage.ID)

	tasks, err := s.taskRepo.FindByStageID(nextStage.ID)
	if err != nil || len(tasks) == 0 {
		return
	}
	firstTask := tasks[0]
	firstTask.Status = "in_progress"
	firstTask.ActualStartTime = &now
	if err := s.taskRepo.Update(firstTask); err != nil {
		return
	}
	log.Printf("[AUTO-START] DrillService: Task %d → in_progress", firstTask.ID)

	operations, err := s.operationRepo.FindByTaskID(firstTask.ID)
	if err != nil || len(operations) == 0 {
		return
	}
	firstOp := operations[0]
	firstOp.Status = "in_progress"
	firstOp.ActualStartTime = &now
	s.operationRepo.Update(firstOp)
	log.Printf("[AUTO-START] DrillService: Operation %d → in_progress", firstOp.ID)
}

func (s *DrillService) autoStartNextTask(completedTask *model.Task) {
	if s.taskRepo == nil || s.operationRepo == nil {
		return
	}
	tasks, err := s.taskRepo.FindByStageID(completedTask.StageID)
	if err != nil || len(tasks) == 0 {
		return
	}
	var nextTask *model.Task
	for _, t := range tasks {
		if t.Order == completedTask.Order+1 {
			nextTask = t
			break
		}
	}
	if nextTask == nil || nextTask.Status != "pending" {
		return
	}
	now := time.Now()
	nextTask.Status = "in_progress"
	nextTask.ActualStartTime = &now
	if err := s.taskRepo.Update(nextTask); err != nil {
		return
	}
	log.Printf("[AUTO-START] DrillService: Task %d → in_progress", nextTask.ID)

	operations, err := s.operationRepo.FindByTaskID(nextTask.ID)
	if err != nil || len(operations) == 0 {
		return
	}
	firstOp := operations[0]
	firstOp.Status = "in_progress"
	firstOp.ActualStartTime = &now
	s.operationRepo.Update(firstOp)
	log.Printf("[AUTO-START] DrillService: Operation %d → in_progress", firstOp.ID)
}
