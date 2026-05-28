package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type ExecutionRepository struct {
	db *gorm.DB
}

func NewExecutionRepository(db *gorm.DB) *ExecutionRepository {
	return &ExecutionRepository{db: db}
}

func (r *ExecutionRepository) Create(execution *model.StepExecution) error {
	return r.db.Create(execution).Error
}

func (r *ExecutionRepository) FindByID(id uint) (*model.StepExecution, error) {
	var execution model.StepExecution
	err := r.db.Preload("Drill").Preload("Assignee").First(&execution, id).Error
	if err != nil {
		return nil, err
	}
	return &execution, nil
}

func (r *ExecutionRepository) FindByDrillID(drillID uint) ([]*model.StepExecution, error) {
	var executions []*model.StepExecution
	err := r.db.Where("drill_id = ?", drillID).
		Preload("Drill").
		Preload("Assignee").
		Order("step_order").
		Find(&executions).Error
	if err != nil {
		return nil, err
	}
	return executions, nil
}

func (r *ExecutionRepository) FindByAssigneeID(assigneeID uint) ([]*model.StepExecution, error) {
	var executions []*model.StepExecution
	err := r.db.Where("assignee_id = ?", assigneeID).
		Preload("Drill").
		Order("created_at desc").
		Find(&executions).Error
	if err != nil {
		return nil, err
	}
	return executions, nil
}

func (r *ExecutionRepository) Update(execution *model.StepExecution) error {
	return r.db.Save(execution).Error
}

func (r *ExecutionRepository) AssignStep(executionID uint, assigneeID uint) error {
	// 使用原生SQL更新，确保正确处理指针类型字段
	return r.db.Exec("UPDATE step_executions SET assignee_id = ? WHERE id = ?", assigneeID, executionID).Error
}

func (r *ExecutionRepository) DeleteByDrillID(drillID uint) error {
	return r.db.Where("drill_id = ?", drillID).Delete(&model.StepExecution{}).Error
}
