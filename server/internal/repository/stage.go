package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type StageRepository struct {
	db *gorm.DB
}

func NewStageRepository(db *gorm.DB) *StageRepository {
	return &StageRepository{db: db}
}

func (r *StageRepository) Create(stage *model.Stage) error {
	return r.db.Create(stage).Error
}

func (r *StageRepository) FindByID(id uint) (*model.Stage, error) {
	var stage model.Stage
	err := r.db.First(&stage, id).Error
	if err != nil {
		return nil, err
	}
	return &stage, nil
}

func (r *StageRepository) FindByIDWithTasks(id uint) (*model.Stage, error) {
	var stage model.Stage
	err := r.db.Preload("Tasks").First(&stage, id).Error
	if err != nil {
		return nil, err
	}
	return &stage, nil
}

func (r *StageRepository) FindByPhaseID(phaseID uint) ([]*model.Stage, error) {
	var stages []*model.Stage
	err := r.db.Where("phase_id = ?", phaseID).Order("`order` asc").Find(&stages).Error
	if err != nil {
		return nil, err
	}
	return stages, nil
}

func (r *StageRepository) FindByPhaseIDWithTasks(phaseID uint) ([]*model.Stage, error) {
	var stages []*model.Stage
	err := r.db.Where("phase_id = ?", phaseID).Order("`order` asc").Preload("Tasks").Find(&stages).Error
	if err != nil {
		return nil, err
	}
	return stages, nil
}

func (r *StageRepository) Update(stage *model.Stage) error {
	return r.db.Omit("created_at").Save(stage).Error
}

func (r *StageRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.Stage{}).Where("id = ?", id).Update("status", status).Error
}

func (r *StageRepository) Delete(id uint) error {
	return r.db.Delete(&model.Stage{}, id).Error
}

func (r *StageRepository) DeleteByPhaseID(phaseID uint) error {
	return r.db.Where("phase_id = ?", phaseID).Delete(&model.Stage{}).Error
}