package main

import (
	"log"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
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

	drillRepo := repository.NewDrillRepository(database)
	templateRepo := repository.NewTemplateRepository(database)
	executionRepo := repository.NewExecutionRepository(database)

	log.Println("Fixing missing step executions...")

	// 获取所有演练
	drills, err := drillRepo.List()
	if err != nil {
		log.Fatalf("Failed to get drills: %v", err)
	}

	for _, drill := range drills {
		// 检查是否已有步骤执行记录
		executions, err := executionRepo.FindByDrillID(drill.ID)
		if err != nil {
			log.Printf("Error checking executions for drill %d: %v", drill.ID, err)
			continue
		}

		if len(executions) > 0 {
			log.Printf("Drill %d already has %d executions, skipping", drill.ID, len(executions))
			continue
		}

		// 获取模板
		template, err := templateRepo.FindByID(drill.TemplateID)
		if err != nil {
			log.Printf("Error getting template for drill %d: %v", drill.ID, err)
			continue
		}

		// 创建步骤执行记录
		log.Printf("Creating executions for drill %d (%s)", drill.ID, drill.Name)
		for _, step := range template.Steps {
			execution := &model.StepExecution{
				DrillID:   drill.ID,
				StepOrder: step.Order,
				StepName:  step.Name,
				Status:    "pending",
			}
			if err := executionRepo.Create(execution); err != nil {
				log.Printf("Error creating execution for step %d: %v", step.Order, err)
			} else {
				log.Printf("Created execution for step %d: %s", step.Order, step.Name)
			}
		}
	}

	log.Println("Fix completed successfully!")
}