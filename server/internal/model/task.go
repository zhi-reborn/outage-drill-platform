package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// 前序任务ID列表（JSON数组）
type PredecessorIDs []uint

func (p PredecessorIDs) Value() (driver.Value, error) {
	return json.Marshal(p)
}

func (p *PredecessorIDs) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, p)
}

type Task struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	StageID     uint      `gorm:"not null;index" json:"stage_id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Order       int       `gorm:"not null" json:"order"` // 任务顺序
	ExecutionMode string  `gorm:"size:20;not null;default:'serial'" json:"execution_mode"` // serial/parallel
	Status      string    `gorm:"size:20;not null;default:'pending'" json:"status"` // pending/running/paused/completed
	
	// 责任体系
	Department      string `gorm:"size:100" json:"department"` // 责任部门
	ResponsiblePersonID *uint `gorm:"index" json:"responsible_person_id"` // 责任人ID
	ExecutorID      *uint `gorm:"index" json:"executor_id"` // 执行人ID
	ReviewerID      *uint `gorm:"index" json:"reviewer_id"` // 复核人ID
	
	// 前序关系
	PredecessorIDs PredecessorIDs `gorm:"type:json" json:"predecessor_ids"` // 前序任务ID列表
	
	// 时间管理
	EstimatedStartTime *time.Time `json:"estimated_start_time"`
	EstimatedEndTime   *time.Time `json:"estimated_end_time"`
	EstimatedDuration  int        `json:"estimated_duration"` // 预计耗时（分钟）
	ActualStartTime    *time.Time `json:"actual_start_time"`
	ActualEndTime      *time.Time `json:"actual_end_time"`
	DurationSeconds    int        `json:"duration_seconds"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	Stage *Stage `gorm:"foreignKey:StageID" json:"stage,omitempty"`
	Operations []*Operation `gorm:"foreignKey:TaskID" json:"operations,omitempty"`
	
	// 关联用户信息
	ResponsiblePerson *User `gorm:"foreignKey:ResponsiblePersonID" json:"responsible_person,omitempty"`
	Executor *User `gorm:"foreignKey:ExecutorID" json:"executor,omitempty"`
	Reviewer *User `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
}

func (Task) TableName() string {
	return "tasks"
}