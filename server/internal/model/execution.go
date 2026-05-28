package model

import (
	"time"
)

type StepExecution struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	DrillID         uint       `gorm:"not null;index" json:"drill_id"`
	StepOrder       int        `gorm:"not null" json:"step_order"`
	StepName        string     `gorm:"size:100;not null" json:"step_name"`
	TaskID          *uint      `gorm:"index" json:"task_id"`
	OperationID     *uint      `gorm:"index" json:"operation_id"`
	AssigneeID      *uint      `gorm:"index" json:"assignee_id"`
	Status          string     `gorm:"size:20;not null;index" json:"status"`
	StartTime       *time.Time `json:"start_time"`
	EndTime         *time.Time `json:"end_time"`
	DurationSeconds int        `json:"duration_seconds"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Drill    *DrillInstance `gorm:"foreignKey:DrillID" json:"drill,omitempty"`
	Assignee *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

func (StepExecution) TableName() string {
	return "step_executions"
}