package service

import (
	"errors"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type TemplateService struct {
	templateRepo *repository.TemplateRepository
}

func NewTemplateService(templateRepo *repository.TemplateRepository) *TemplateService {
	return &TemplateService{templateRepo: templateRepo}
}

func (s *TemplateService) CreateTemplate(name, description string, steps model.StepDefinitions) (*model.DrillTemplate, error) {
	if err := s.validateSteps(steps); err != nil {
		return nil, err
	}

	template := &model.DrillTemplate{
		Name:        name,
		Description: description,
		Steps:       steps,
	}

	if err := s.templateRepo.Create(template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *TemplateService) GetTemplate(id uint) (*model.DrillTemplate, error) {
	return s.templateRepo.FindByID(id)
}

func (s *TemplateService) ListTemplates() ([]*model.DrillTemplate, error) {
	return s.templateRepo.List()
}

func (s *TemplateService) UpdateTemplate(id uint, name, description string, steps model.StepDefinitions) (*model.DrillTemplate, error) {
	template, err := s.templateRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if err := s.validateSteps(steps); err != nil {
		return nil, err
	}

	template.Name = name
	template.Description = description
	template.Steps = steps

	if err := s.templateRepo.Update(template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *TemplateService) DeleteTemplate(id uint) error {
	return s.templateRepo.Delete(id)
}

func (s *TemplateService) validateSteps(steps model.StepDefinitions) error {
	if len(steps) == 0 {
		return errors.New("steps cannot be empty")
	}

	orderMap := make(map[int]bool)
	for _, step := range steps {
		if step.Order <= 0 {
			return errors.New("step order must be positive")
		}
		if step.Name == "" {
			return errors.New("step name cannot be empty")
		}
		if step.TimeoutMinutes <= 0 {
			return errors.New("step timeout must be positive")
		}
		if orderMap[step.Order] {
			return errors.New("duplicate step order")
		}
		orderMap[step.Order] = true
	}

	return nil
}