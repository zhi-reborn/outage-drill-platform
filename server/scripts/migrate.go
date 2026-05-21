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

	log.Println("Running migrations...")

	err = database.AutoMigrate(
		&model.User{},
		&model.DrillTemplate{},
		&model.DrillInstance{},
		&model.StepExecution{},
		&model.MessageLog{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	log.Println("Migrations completed successfully")
}