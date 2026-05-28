package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type TaskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) *TaskRepository {
	return &TaskRepository{db: db}
}

func (r *TaskRepository) Create(task *model.Task) error {
	return r.db.Create(task).Error
}

func (r *TaskRepository) FindByID(id uint) (*model.Task, error) {
	var task model.Task
	err := r.db.First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) FindByIDWithOperations(id uint) (*model.Task, error) {
	var task model.Task
	err := r.db.Preload("Operations").First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) FindByIDWithDetails(id uint) (*model.Task, error) {
	var task model.Task
	err := r.db.Preload("Operations").
		Preload("ResponsiblePerson").
		Preload("Executor").
		Preload("Reviewer").
		First(&task, id).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *TaskRepository) FindByStageID(stageID uint) ([]*model.Task, error) {
	var tasks []*model.Task
	err := r.db.Where("stage_id = ?", stageID).Order("`order` asc").Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (r *TaskRepository) FindByStageIDWithOperations(stageID uint) ([]*model.Task, error) {
	var tasks []*model.Task
	err := r.db.Where("stage_id = ?", stageID).Order("`order` asc").
		Preload("Operations").
		Preload("Operations.Executor").
		Preload("Executor").
		Preload("ResponsiblePerson").
		Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}

func (r *TaskRepository) Update(task *model.Task) error {
	return r.db.Omit("created_at").Save(task).Error
}

func (r *TaskRepository) UpdateStatus(id uint, status string) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("status", status).Error
}

func (r *TaskRepository) UpdateExecutor(id uint, executorID *uint) error {
	return r.db.Model(&model.Task{}).Where("id = ?", id).Update("executor_id", executorID).Error
}

func (r *TaskRepository) Delete(id uint) error {
	return r.db.Delete(&model.Task{}, id).Error
}

func (r *TaskRepository) DeleteByStageID(stageID uint) error {
	return r.db.Where("stage_id = ?", stageID).Delete(&model.Task{}).Error
}

func (r *TaskRepository) FindPendingByPredecessorIDs(predecessorIDs []uint) ([]*model.Task, error) {
	var tasks []*model.Task
	err := r.db.Where("id IN ?", predecessorIDs).Where("status != ?", "completed").Find(&tasks).Error
	if err != nil {
		return nil, err
	}
	return tasks, nil
}