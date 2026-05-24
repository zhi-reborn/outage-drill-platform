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

	log.Println("Creating sample workflow template with new architecture...")

	// 创建新的层级结构模板
	template := model.DrillTemplate{
		Name:        "标准灾备演练流程（层级结构）",
		Description: "包含阶段、环节、任务、操作步骤的完整层级演练流程",
	}

	if err := database.Create(&template).Error; err != nil {
		log.Fatalf("Failed to create template: %v", err)
	}

	log.Printf("Created template: %s (ID: %d)", template.Name, template.ID)

	// 创建阶段1：应用降级阶段
	phase1 := model.Phase{
		TemplateID:    template.ID,
		Name:          "阶段1：应用降级",
		Description:   "停止非核心服务，降低系统负载",
		Order:         1,
		ExecutionMode: "serial", // 串行执行
		Status:        "pending",
	}

	if err := database.Create(&phase1).Error; err != nil {
		log.Fatalf("Failed to create phase1: %v", err)
	}

	log.Printf("Created phase: %s (ID: %d)", phase1.Name, phase1.ID)

	// 创建环节1：服务停止
	stage1 := model.Stage{
		PhaseID:       phase1.ID,
		Name:          "环节1：服务停止",
		Description:   "停止指定的应用服务",
		Order:         1,
		ExecutionMode: "serial",
		Status:        "pending",
	}

	if err := database.Create(&stage1).Error; err != nil {
		log.Fatalf("Failed to create stage1: %v", err)
	}

	log.Printf("Created stage: %s (ID: %d)", stage1.Name, stage1.ID)

	// 创建任务1：停止Web服务
	task1 := model.Task{
		StageID:         stage1.ID,
		Name:            "任务1：停止Web服务",
		Description:     "停止Web应用服务",
		Order:           1,
		ExecutionMode:   "serial",
		Status:          "pending",
		Department:      "应用运维组",
		EstimatedDuration: 5, // 预计5分钟
	}

	if err := database.Create(&task1).Error; err != nil {
		log.Fatalf("Failed to create task1: %v", err)
	}

	log.Printf("Created task: %s (ID: %d)", task1.Name, task1.ID)

	// 创建操作步骤1：登录服务器
	operation1 := model.Operation{
		TaskID:         task1.ID,
		Name:           "操作1：登录服务器",
		Description:    "SSH登录到应用服务器",
		Order:          1,
		ExecutionMode:  "serial",
		Status:         "pending",
		Guide:          "①打开终端 → ②执行ssh user@server → ③输入密码登录",
		TimeoutMinutes: 2,
	}

	if err := database.Create(&operation1).Error; err != nil {
		log.Fatalf("Failed to create operation1: %v", err)
	}

	log.Printf("Created operation: %s (ID: %d)", operation1.Name, operation1.ID)

	// 创建操作步骤2：停止服务
	operation2 := model.Operation{
		TaskID:         task1.ID,
		Name:           "操作2：停止服务",
		Description:    "执行停止服务命令",
		Order:          2,
		ExecutionMode:  "serial",
		Status:         "pending",
		PredecessorIDs: model.OperationPredecessorIDs{operation1.ID}, // 前序操作
		Guide:          "①执行systemctl stop web-service → ②确认服务已停止",
		TimeoutMinutes: 3,
	}

	if err := database.Create(&operation2).Error; err != nil {
		log.Fatalf("Failed to create operation2: %v", err)
	}

	log.Printf("Created operation: %s (ID: %d)", operation2.Name, operation2.ID)

	// 创建任务2：停止API服务（并行任务）
	task2 := model.Task{
		StageID:         stage1.ID,
		Name:            "任务2：停止API服务",
		Description:     "停止API应用服务",
		Order:           2,
		ExecutionMode:   "parallel", // 并行执行
		Status:          "pending",
		Department:      "应用运维组",
		EstimatedDuration: 5,
	}

	if err := database.Create(&task2).Error; err != nil {
		log.Fatalf("Failed to create task2: %v", err)
	}

	log.Printf("Created task: %s (ID: %d)", task2.Name, task2.ID)

	// 为任务2创建操作步骤
	operation3 := model.Operation{
		TaskID:         task2.ID,
		Name:           "操作1：登录API服务器",
		Description:    "SSH登录到API服务器",
		Order:          1,
		ExecutionMode:  "serial",
		Status:         "pending",
		Guide:          "①打开终端 → ②执行ssh user@api-server → ③输入密码登录",
		TimeoutMinutes: 2,
	}

	if err := database.Create(&operation3).Error; err != nil {
		log.Fatalf("Failed to create operation3: %v", err)
	}

	operation4 := model.Operation{
		TaskID:         task2.ID,
		Name:           "操作2：停止API服务",
		Description:    "执行停止API服务命令",
		Order:          2,
		ExecutionMode:  "serial",
		Status:         "pending",
		PredecessorIDs: model.OperationPredecessorIDs{operation3.ID},
		Guide:          "①执行systemctl stop api-service → ②确认服务已停止",
		TimeoutMinutes: 3,
	}

	if err := database.Create(&operation4).Error; err != nil {
		log.Fatalf("Failed to create operation4: %v", err)
	}

	log.Println("Sample workflow template created successfully!")
	log.Println("")
	log.Println("Template structure:")
	log.Println("  Template: 标准灾备演练流程（层级结构）")
	log.Println("    Phase 1: 阶段1：应用降级")
	log.Println("      Stage 1: 环节1：服务停止")
	log.Println("        Task 1: 任务1：停止Web服务 (串行)")
	log.Println("          Operation 1: 操作1：登录服务器")
	log.Println("          Operation 2: 操作2：停止服务")
	log.Println("        Task 2: 任务2：停止API服务 (并行)")
	log.Println("          Operation 1: 操作1：登录API服务器")
	log.Println("          Operation 2: 操作2：停止API服务")
	log.Println("")
	log.Println("Next steps:")
	log.Println("1. Run migration: go run scripts/migrate_workflow.go")
	log.Println("2. Test the new structure in database")
	log.Println("3. Implement backend services")
}