package model

import (
	"time"
)

type MessageLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	DrillID    uint      `gorm:"not null;index" json:"drill_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	SentAt     time.Time `json:"sent_at"`
	WebhookURL string    `gorm:"size:255" json:"webhook_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Drill *DrillInstance `gorm:"foreignKey:DrillID" json:"drill,omitempty"`
}

func (MessageLog) TableName() string {
	return "message_logs"
}