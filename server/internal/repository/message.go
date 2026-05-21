package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) Create(message *model.MessageLog) error {
	return r.db.Create(message).Error
}

func (r *MessageRepository) FindByDrillID(drillID uint) ([]*model.MessageLog, error) {
	var messages []*model.MessageLog
	err := r.db.Where("drill_id = ?", drillID).Order("sent_at desc").Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *MessageRepository) List(limit int) ([]*model.MessageLog, error) {
	var messages []*model.MessageLog
	err := r.db.Order("sent_at desc").Limit(limit).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}