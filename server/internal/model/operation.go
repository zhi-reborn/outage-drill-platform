package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// 前序操作ID列表（JSON数组）
type OperationPredecessorIDs []uint

func (p OperationPredecessorIDs) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *OperationPredecessorIDs) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, p)
}

type Operation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TaskID      uint      `gorm:"not null;index" json:"task_id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Order       int       `gorm:"not null" json:"order"` // 操作顺序
	ExecutionMode string  `gorm:"size:20;not null;default:'serial'" json:"execution_mode"` // serial/parallel
	Status      string    `gorm:"size:20;not null;default:'pending'" json:"status"` // pending/running/paused/completed
	
	// 执行人
	ExecutorID *uint `gorm:"index" json:"executor_id"`
	
	// 前序关系
	PredecessorIDs OperationPredecessorIDs `gorm:"type:json" json:"predecessor_ids"` // 前序操作ID列表
	
	// 操作指引
	Guide string `gorm:"type:text" json:"guide"` // 操作指引
	
	// 时间管理
	TimeoutMinutes int `gorm:"not null;default:10" json:"timeout_minutes"` // 超时时间（分钟）
	EstimatedStartTime *time.Time `json:"estimated_start_time"`
	EstimatedEndTime   *time.Time `json:"estimated_end_time"`
	ActualStartTime    *time.Time `json:"actual_start_time"`
	ActualEndTime      *time.Time `json:"actual_end_time"`
	DurationSeconds    int        `json:"duration_seconds"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	Task *Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	Executor *User `gorm:"foreignKey:ExecutorID" json:"executor,omitempty"`
}

func (Operation) TableName() string {
	return "operations"
}