package main

import (
	"fmt"
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

	tables := []string{"phases", "stages", "tasks", "operations"}

	for _, table := range tables {
		result := database.Table(table).Where("status = ?", "running").Update("status", "in_progress")
		if result.Error != nil {
			log.Printf("Failed to update %s: %v", table, result.Error)
			continue
		}
		if result.RowsAffected > 0 {
			fmt.Printf("Fixed %s: %d rows updated (running → in_progress)\n", table, result.RowsAffected)
		} else {
			fmt.Printf("%s: no rows needed fixing\n", table)
		}
	}

	fmt.Println("Status fix complete!")
}
