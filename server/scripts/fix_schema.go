package main

import (
	"log"

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

	log.Println("Fixing database schema...")

	// 1. 删除外键约束
	log.Println("Step 1: Dropping foreign key constraint...")
	if err := database.Exec("ALTER TABLE step_executions DROP FOREIGN KEY fk_step_executions_assignee").Error; err != nil {
		log.Printf("Warning: Could not drop foreign key (may not exist): %v", err)
	}

	// 2. 修改字段允许NULL
	log.Println("Step 2: Modifying assignee_id to allow NULL...")
	if err := database.Exec("ALTER TABLE step_executions MODIFY COLUMN assignee_id INT UNSIGNED NULL").Error; err != nil {
		log.Fatalf("Failed to modify column: %v", err)
	}

	// 3. 重新添加外键约束（允许NULL）
	log.Println("Step 3: Adding foreign key constraint (allowing NULL)...")
	if err := database.Exec(`
		ALTER TABLE step_executions 
		ADD CONSTRAINT fk_step_executions_assignee 
		FOREIGN KEY (assignee_id) REFERENCES users(id) 
		ON DELETE SET NULL
	`).Error; err != nil {
		log.Printf("Warning: Could not add foreign key: %v", err)
	}

	log.Println("Database schema fixed successfully!")
	log.Println("Now you can run: go run scripts/fix_executions.go")
}