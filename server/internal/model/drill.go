package model

import (
	"time"
)

type DrillInstance struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	TemplateID uint       `gorm:"not null;index" json:"template_id"`
	Name       string     `gorm:"size:100;not null" json:"name"`
	Status     string     `gorm:"size:20;not null;index" json:"status"` // pending, running, paused, completed, cancelled
	StartTime  *time.Time `json:"start_time"`
	EndTime    *time.Time `json:"end_time"`
	CreatedBy  uint       `gorm:"not null" json:"created_by"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	Template *DrillTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Creator  *User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

func (DrillInstance) TableName() string {
	return "drill_instances"
}