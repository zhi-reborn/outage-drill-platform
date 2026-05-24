package model

import (
	"time"
)

type Phase struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TemplateID  uint      `gorm:"not null;index" json:"template_id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Order       int       `gorm:"not null" json:"order"` // 阶段顺序
	ExecutionMode string  `gorm:"size:20;not null;default:'serial'" json:"execution_mode"` // serial/parallel
	Status      string    `gorm:"size:20;not null;default:'pending'" json:"status"` // pending/running/completed
	
	// 时间管理
	EstimatedStartTime *time.Time `json:"estimated_start_time"`
	EstimatedEndTime   *time.Time `json:"estimated_end_time"`
	ActualStartTime    *time.Time `json:"actual_start_time"`
	ActualEndTime      *time.Time `json:"actual_end_time"`
	DurationSeconds    int        `json:"duration_seconds"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	
	Template *DrillTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Stages   []*Stage       `gorm:"foreignKey:PhaseID" json:"stages,omitempty"`
}

func (Phase) TableName() string {
	return "phases"
}