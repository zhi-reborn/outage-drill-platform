package main

import (
	"fmt"
	"log"
	"time"

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

	var phases []*model.Phase
	database.Order("template_id asc, `order` asc").Find(&phases)

	templateGroups := make(map[uint][]*model.Phase)
	for _, p := range phases {
		templateGroups[p.TemplateID] = append(templateGroups[p.TemplateID], p)
	}

	now := time.Now()
	fixCount := 0

	for tmplID, phases := range templateGroups {
		fmt.Printf("\n--- Template %d ---\n", tmplID)
		for i, phase := range phases {
			fmt.Printf("  Phase %d (order=%d): %s → %s\n", phase.ID, phase.Order, phase.Name, phase.Status)

			if phase.Status != "completed" {
				continue
			}

			if i+1 < len(phases) {
				nextPhase := phases[i+1]
				if nextPhase.Status == "pending" {
					fmt.Printf("    FIX: Auto-starting next phase %d (%s)\n", nextPhase.ID, nextPhase.Name)

					nextPhase.Status = "in_progress"
					nextPhase.ActualStartTime = &now
					database.Save(nextPhase)
					fixCount++

					var stages []*model.Stage
					database.Where("phase_id = ?", nextPhase.ID).Order("`order` asc").Find(&stages)
					if len(stages) > 0 {
						firstStage := stages[0]
						firstStage.Status = "in_progress"
						firstStage.ActualStartTime = &now
						database.Save(firstStage)
						fixCount++
						fmt.Printf("    FIX: Stage %d → in_progress\n", firstStage.ID)

						var tasks []*model.Task
						database.Where("stage_id = ?", firstStage.ID).Order("`order` asc").Find(&tasks)
						if len(tasks) > 0 {
							firstTask := tasks[0]
							firstTask.Status = "in_progress"
							firstTask.ActualStartTime = &now
							database.Save(firstTask)
							fixCount++
							fmt.Printf("    FIX: Task %d → in_progress\n", firstTask.ID)

							var ops []*model.Operation
							database.Where("task_id = ?", firstTask.ID).Order("`order` asc").Find(&ops)
							if len(ops) > 0 {
								firstOp := ops[0]
								firstOp.Status = "in_progress"
								firstOp.ActualStartTime = &now
								database.Save(firstOp)
								fixCount++
								fmt.Printf("    FIX: Operation %d → in_progress\n", firstOp.ID)
							}
						}
					}
				}
			}
		}
	}

	fmt.Printf("\n=== Fixed %d records ===\n", fixCount)
}
