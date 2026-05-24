package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type PhaseRepository struct {
	db *gorm.DB
}

func NewPhaseRepository(db *gorm.DB) *PhaseRepository {
	return &PhaseRepository{db: db}
}

func (r *PhaseRepository) Create(phase *model.Phase) error {
	return r.db.Create(phase).Error
}

func (r *PhaseRepository) FindByID(id uint) (*model.Phase, error) {
	var phase model.Phase
	err := r.db.First(&phase, id).Error
	if err != nil {
		return nil, err
	}
	return &phase, nil
}

func (r *PhaseRepository) FindByIDWithStages(id uint) (*model.Phase, error) {
	var phase model.Phase
	err := r.db.Preload("Stages").First(&phase, id).Error
	if err != nil {
		return nil, err
	}
	return &phase, nil
}

func (r *PhaseRepository) FindByTemplateID(templateID uint) ([]*model.Phase, error) {
	var phases []*model.Phase
	err := r.db.Where("template_id = ?", templateID).Order("`order` asc").Find(&phases).Error
	if err != nil {
		return nil, err
	}
	return phases, nil
}

func (r *PhaseRepository) FindByTemplateIDWithStages(templateID uint) ([]*model.Phase, error) {
	var phases []*model.Phase
	err := r.db.Where("template_id = ?", templateID).Order("`order` asc").Preload("Stages").Find(&phases).Error
	if err != nil {
		return nil, err
	}
	return phases, nil
}

func (r *PhaseRepository) Update(phase *model.Phase) error {
	return r.db.Omit("created_at").Save(phase).Error
}

func (r *PhaseRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.Phase{}).Where("id = ?", id).Update("status", status).Error
}

func (r *PhaseRepository) Delete(id uint) error {
	return r.db.Delete(&model.Phase{}, id).Error
}

func (r *PhaseRepository) DeleteByTemplateID(templateID uint) error {
	return r.db.Where("template_id = ?", templateID).Delete(&model.Phase{}).Error
}