package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type OperationRepository struct {
	db *gorm.DB
}

func NewOperationRepository(db *gorm.DB) *OperationRepository {
	return &OperationRepository{db: db}
}

func (r *OperationRepository) Create(operation *model.Operation) error {
	return r.db.Create(operation).Error
}

func (r *OperationRepository) FindByID(id uint) (*model.Operation, error) {
	var operation model.Operation
	err := r.db.First(&operation, id).Error
	if err != nil {
		return nil, err
	}
	return &operation, nil
}

func (r *OperationRepository) FindByIDWithDetails(id uint) (*model.Operation, error) {
	var operation model.Operation
	err := r.db.Preload("Executor").First(&operation, id).Error
	if err != nil {
		return nil, err
	}
	return &operation, nil
}

func (r *OperationRepository) FindByTaskID(taskID uint) ([]*model.Operation, error) {
	var operations []*model.Operation
	err := r.db.Where("task_id = ?", taskID).Order("`order` asc").Find(&operations).Error
	if err != nil {
		return nil, err
	}
	return operations, nil
}

func (r *OperationRepository) Update(operation *model.Operation) error {
	return r.db.Omit("created_at").Save(operation).Error
}

func (r *OperationRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.Operation{}).Where("id = ?", id).Update("status", status).Error
}

func (r *OperationRepository) UpdateExecutor(id uint, executorID *uint) error {
	return r.db.Model(&model.Operation{}).Where("id = ?", id).Update("executor_id", executorID).Error
}

func (r *OperationRepository) Delete(id uint) error {
	return r.db.Delete(&model.Operation{}, id).Error
}

func (r *OperationRepository) DeleteByTaskID(taskID uint) error {
	return r.db.Where("task_id = ?", taskID).Delete(&model.Operation{}).Error
}

func (r *OperationRepository) FindPendingByPredecessorIDs(predecessorIDs []uint) ([]*model.Operation, error) {
	var operations []*model.Operation
	err := r.db.Where("id IN ?", predecessorIDs).Where("status != ?", "completed").Find(&operations).Error
	if err != nil {
		return nil, err
	}
	return operations, nil
}