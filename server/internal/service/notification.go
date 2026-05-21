package service

import (
	"fmt"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/pkg/wechat"
)

type NotificationService struct {
	messageRepo  *repository.MessageRepository
	wechatClient *wechat.WebhookClient
}

func NewNotificationService(
	messageRepo *repository.MessageRepository,
	wechatClient *wechat.WebhookClient,
) *NotificationService {
	return &NotificationService{
		messageRepo:  messageRepo,
		wechatClient: wechatClient,
	}
}

func (s *NotificationService) SendDrillStartNotification(drill *model.DrillInstance) error {
	content := fmt.Sprintf("## 演练开始通知\n\n**演练名称**：%s\n\n**开始时间**：%s\n\n请相关人员及时登录参演工作台。",
		drill.Name,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return s.sendMessage(drill.ID, content)
}

func (s *NotificationService) SendStepActivationNotification(execution *model.StepExecution, assigneeName string) error {
	drillName := ""
	if execution.Drill != nil {
		drillName = execution.Drill.Name
	}
	content := fmt.Sprintf("## 步骤激活通知\n\n**演练名称**：%s\n\n**步骤%d**：%s\n\n执行人：%s\n\n请及时登录参演工作台执行任务。",
		drillName,
		execution.StepOrder,
		execution.StepName,
		assigneeName,
	)

	return s.sendMessage(execution.DrillID, content)
}

func (s *NotificationService) SendStepCompletionNotification(execution *model.StepExecution) error {
	drillName := ""
	assigneeName := ""
	if execution.Drill != nil {
		drillName = execution.Drill.Name
	}
	if execution.Assignee != nil {
		assigneeName = execution.Assignee.Name
	}
	content := fmt.Sprintf("## 步骤完成通知\n\n**演练名称**：%s\n\n**步骤%d**：%s 已完成\n\n执行人：%s\n\n耗时：%d秒",
		drillName,
		execution.StepOrder,
		execution.StepName,
		assigneeName,
		execution.DurationSeconds,
	)

	return s.sendMessage(execution.DrillID, content)
}

func (s *NotificationService) SendDrillEndNotification(drill *model.DrillInstance) error {
	content := fmt.Sprintf("## 演练结束通知\n\n**演练名称**：%s\n\n**结束时间**：%s\n\n演练已完成。",
		drill.Name,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return s.sendMessage(drill.ID, content)
}

func (s *NotificationService) sendMessage(drillID uint, content string) error {
	err := s.wechatClient.SendMarkdownMessage(content)

	message := &model.MessageLog{
		DrillID:    drillID,
		Content:    content,
		SentAt:     time.Now(),
		WebhookURL: s.wechatClient.GetWebhookURL(),
	}

	if err != nil {
		message.Content = fmt.Sprintf("[FAILED] %s", content)
	}

	s.messageRepo.Create(message)

	return err
}

func (s *NotificationService) GetMessageLogs(drillID uint) ([]*model.MessageLog, error) {
	return s.messageRepo.FindByDrillID(drillID)
}