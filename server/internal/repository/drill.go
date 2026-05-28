package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type DrillRepository struct {
	db *gorm.DB
}

func NewDrillRepository(db *gorm.DB) *DrillRepository {
	return &DrillRepository{db: db}
}

func (r *DrillRepository) Create(drill *model.DrillInstance) error {
	return r.db.Create(drill).Error
}

func (r *DrillRepository) FindByID(id uint) (*model.DrillInstance, error) {
	var drill model.DrillInstance
	err := r.db.Preload("Template").Preload("Creator").First(&drill, id).Error
	if err != nil {
		return nil, err
	}
	return &drill, nil
}

func (r *DrillRepository) List() ([]*model.DrillInstance, error) {
	var drills []*model.DrillInstance
	err := r.db.Preload("Template").Preload("Creator").Find(&drills).Error
	if err != nil {
		return nil, err
	}
	return drills, nil
}

func (r *DrillRepository) Update(drill *model.DrillInstance) error {
	return r.db.Save(drill).Error
}

func (r *DrillRepository) Delete(id uint) error {
	return r.db.Delete(&model.DrillInstance{}, id).Error
}

func (r *DrillRepository) FindByStatus(status string) ([]*model.DrillInstance, error) {
	var drills []*model.DrillInstance
	err := r.db.Where("status = ?", status).Find(&drills).Error
	if err != nil {
		return nil, err
	}
	return drills, nil
}

func (r *DrillRepository) FindByTemplateID(templateID uint) ([]*model.DrillInstance, error) {
	var drills []*model.DrillInstance
	err := r.db.Where("template_id = ?", templateID).Preload("Template").Preload("Creator").Find(&drills).Error
	if err != nil {
		return nil, err
	}
	return drills, nil
}