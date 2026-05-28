package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type TemplateRepository struct {
	db *gorm.DB
}

func NewTemplateRepository(db *gorm.DB) *TemplateRepository {
	return &TemplateRepository{db: db}
}

func (r *TemplateRepository) Create(template *model.DrillTemplate) error {
	return r.db.Create(template).Error
}

func (r *TemplateRepository) FindByID(id uint) (*model.DrillTemplate, error) {
	var template model.DrillTemplate
	err := r.db.First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *TemplateRepository) List() ([]*model.DrillTemplate, error) {
	var templates []*model.DrillTemplate
	err := r.db.Find(&templates).Error
	if err != nil {
		return nil, err
	}
	return templates, nil
}

func (r *TemplateRepository) Update(template *model.DrillTemplate) error {
	return r.db.Save(template).Error
}

func (r *TemplateRepository) Delete(id uint) error {
	return r.db.Delete(&model.DrillTemplate{}, id).Error
}

func (r *TemplateRepository) FindByIDWithPhases(id uint) (*model.DrillTemplate, error) {
	var template model.DrillTemplate
	err := r.db.Preload("Phases").Preload("Phases.Stages").Preload("Phases.Stages.Tasks").Preload("Phases.Stages.Tasks.Operations").First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}