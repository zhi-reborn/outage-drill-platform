package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type StepDefinition struct {
	Order          int    `json:"order"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	TimeoutMinutes int    `json:"timeout_minutes"`
	Guide          string `json:"guide"`
}

type StepDefinitions []StepDefinition

func (s StepDefinitions) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *StepDefinitions) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, s)
}

type DrillTemplate struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Name        string          `gorm:"size:100;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	Steps       StepDefinitions `gorm:"type:json;not null" json:"steps"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (DrillTemplate) TableName() string {
	return "drill_templates"
}