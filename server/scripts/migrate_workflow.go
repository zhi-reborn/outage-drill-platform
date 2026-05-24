package main

import (
	"log"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"github.com/yourorg/outage-drill-platform/server/pkg/db"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.NewMySQL(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	log.Println("Running new workflow architecture migrations...")

	// 创建新的表结构
	err = database.AutoMigrate(
		&model.Phase{},
		&model.Stage{},
		&model.Task{},
		&model.Operation{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate new tables: %v", err)
	}

	log.Println("New tables created successfully:")
	log.Println("  - phases (阶段)")
	log.Println("  - stages (环节)")
	log.Println("  - tasks (任务)")
	log.Println("  - operations (操作步骤)")

	// 更新现有模板表，添加phases关联
	log.Println("Updating existing templates table...")
	err = database.AutoMigrate(&model.DrillTemplate{})
	if err != nil {
		log.Fatalf("Failed to update templates table: %v", err)
	}

	log.Println("Migration completed successfully!")
	log.Println("")
	log.Println("Next steps:")
	log.Println("1. Create sample workflow templates with new structure")
	log.Println("2. Test the new data models")
	log.Println("3. Implement backend services")
}