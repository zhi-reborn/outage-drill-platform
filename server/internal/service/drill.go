package service

import (
	"errors"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type DrillService struct {
	drillRepo     *repository.DrillRepository
	templateRepo  *repository.TemplateRepository
	executionRepo *repository.ExecutionRepository
}

func NewDrillService(
	drillRepo *repository.DrillRepository,
	templateRepo *repository.TemplateRepository,
	executionRepo *repository.ExecutionRepository,
) *DrillService {
	return &DrillService{
		drillRepo:     drillRepo,
		templateRepo:  templateRepo,
		executionRepo: executionRepo,
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

	for _, step := range template.Steps {
		execution := &model.StepExecution{
			DrillID:   drill.ID,
			StepOrder: step.Order,
			StepName:  step.Name,
			Status:    "pending",
		}
		s.executionRepo.Create(execution)
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

func (s *DrillService) ListDrills() ([]*model.DrillInstance, error) {
	return s.drillRepo.List()
}