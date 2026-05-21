package main

import (
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"github.com/yourorg/outage-drill-platform/server/pkg/db"
)

func seedUsers(database *gorm.DB) error {
	users := []model.User{
		{
			Username:     "admin",
			PasswordHash: hashPassword("admin123"),
			Name:         "系统管理员",
			Role:         "admin",
		},
		{
			Username:     "commander",
			PasswordHash: hashPassword("commander123"),
			Name:         "指挥员张三",
			Role:         "commander",
		},
		{
			Username:     "participant1",
			PasswordHash: hashPassword("participant123"),
			Name:         "参演人员李四",
			Role:         "participant",
		},
		{
			Username:     "participant2",
			PasswordHash: hashPassword("participant123"),
			Name:         "参演人员王五",
			Role:         "participant",
		},
	}

	for _, user := range users {
		if err := database.FirstOrCreate(&user, model.User{Username: user.Username}).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedTemplates(database *gorm.DB) error {
	template := model.DrillTemplate{
		Name:        "标准灾备演练流程",
		Description: "包含应用降级、数据库切换、业务验证、系统恢复等标准步骤",
		Steps: model.StepDefinitions{
			{
				Order:          1,
				Name:           "应用降级",
				Description:    "停止非核心服务,降低系统负载",
				TimeoutMinutes: 10,
				Guide:          "①登录控制台 → ②执行降级脚本 → ③确认降级成功",
			},
			{
				Order:          2,
				Name:           "数据库切换",
				Description:    "执行主从切换,验证数据一致性",
				TimeoutMinutes: 15,
				Guide:          "①登录RDS控制台 → ②点击切换 → ③确认切换成功",
			},
			{
				Order:          3,
				Name:           "业务验证",
				Description:    "验证核心业务功能正常",
				TimeoutMinutes: 20,
				Guide:          "①访问业务系统 → ②执行测试用例 → ③记录验证结果",
			},
			{
				Order:          4,
				Name:           "系统恢复",
				Description:    "恢复系统到正常状态",
				TimeoutMinutes: 15,
				Guide:          "①启动降级服务 → ②验证服务状态 → ③确认系统正常",
			},
			{
				Order:          5,
				Name:           "演练总结",
				Description:    "总结演练过程,记录问题和改进点",
				TimeoutMinutes: 10,
				Guide:          "①汇总演练数据 → ②编写总结报告 → ③提交审核",
			},
		},
	}

	return database.FirstOrCreate(&template, model.DrillTemplate{Name: template.Name}).Error
}

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.NewMySQL(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	log.Println("Seeding database...")

	if err := seedUsers(database); err != nil {
		log.Fatalf("Failed to seed users: %v", err)
	}

	if err := seedTemplates(database); err != nil {
		log.Fatalf("Failed to seed templates: %v", err)
	}

	log.Println("Database seeded successfully")
}