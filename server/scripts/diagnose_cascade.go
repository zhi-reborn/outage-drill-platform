package main

import (
	"fmt"
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

	fmt.Println("=== Drills ===")
	var drills []*model.DrillInstance
	database.Find(&drills)
	for _, d := range drills {
		fmt.Printf("  Drill %d: name=%s, template_id=%d, status=%s\n", d.ID, d.Name, d.TemplateID, d.Status)
	}

	fmt.Println("\n=== Phases ===")
	var phases []*model.Phase
	database.Order("`order` asc").Find(&phases)
	for _, p := range phases {
		fmt.Printf("  Phase %d: template_id=%d, order=%d, name=%s, status=%s\n", p.ID, p.TemplateID, p.Order, p.Name, p.Status)
	}

	fmt.Println("\n=== Stages ===")
	var stages []*model.Stage
	database.Order("`order` asc").Find(&stages)
	for _, s := range stages {
		fmt.Printf("  Stage %d: phase_id=%d, order=%d, name=%s, status=%s\n", s.ID, s.PhaseID, s.Order, s.Name, s.Status)
	}

	fmt.Println("\n=== Tasks (first 30) ===")
	var tasks []*model.Task
	database.Order("`order` asc").Limit(30).Find(&tasks)
	for _, t := range tasks {
		fmt.Printf("  Task %d: stage_id=%d, order=%d, name=%s, status=%s\n", t.ID, t.StageID, t.Order, t.Name, t.Status)
	}

	fmt.Println("\n=== Operations (first 30) ===")
	var ops []*model.Operation
	database.Order("`order` asc").Limit(30).Find(&ops)
	for _, o := range ops {
		fmt.Printf("  Op %d: task_id=%d, order=%d, name=%s, status=%s\n", o.ID, o.TaskID, o.Order, o.Name, o.Status)
	}

	fmt.Println("\n=== Task Status Distribution ===")
	type StatusCount struct {
		Status string
		Count  int
	}
	var taskCounts []StatusCount
	database.Model(&model.Task{}).Select("status, count(*) as count").Group("status").Scan(&taskCounts)
	for _, sc := range taskCounts {
		fmt.Printf("  %s: %d\n", sc.Status, sc.Count)
	}

	fmt.Println("\n=== Operation Status Distribution ===")
	var opCounts []StatusCount
	database.Model(&model.Operation{}).Select("status, count(*) as count").Group("status").Scan(&opCounts)
	for _, sc := range opCounts {
		fmt.Printf("  %s: %d\n", sc.Status, sc.Count)
	}
}
