package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/handler"
	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
	"github.com/yourorg/outage-drill-platform/server/internal/websocket"
	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"github.com/yourorg/outage-drill-platform/server/pkg/db"
	wechatPkg "github.com/yourorg/outage-drill-platform/server/pkg/wechat"
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

	userRepo := repository.NewUserRepository(database)
	templateRepo := repository.NewTemplateRepository(database)
	drillRepo := repository.NewDrillRepository(database)
	executionRepo := repository.NewExecutionRepository(database)
	messageRepo := repository.NewMessageRepository(database)
	phaseRepo := repository.NewPhaseRepository(database)
	stageRepo := repository.NewStageRepository(database)
	taskRepo := repository.NewTaskRepository(database)
	operationRepo := repository.NewOperationRepository(database)

	userSvc := service.NewUserService(userRepo)
	authSvc := service.NewAuthService(userRepo, cfg.JWT.Secret, cfg.JWT.ExpireHours)
	templateSvc := service.NewTemplateService(templateRepo)
	drillSvc := service.NewDrillService(drillRepo, templateRepo, executionRepo)
	executionSvc := service.NewExecutionService(executionRepo, drillRepo)
	workflowSvc := service.NewWorkflowService(phaseRepo, stageRepo, taskRepo, operationRepo, templateRepo)

	wechatClient := wechatPkg.NewWebhookClient(cfg.WeChat.WebhookURL)
	notificationSvc := service.NewNotificationService(messageRepo, wechatClient)

	hub := websocket.NewHub()
	go hub.Run()

	router := gin.Default()
	router.Use(middleware.CORSMiddleware())
	router.Use(middleware.LoggerMiddleware())

	authHandler := handler.NewAuthHandler(authSvc)
	userHandler := handler.NewUserHandler(userSvc)
	templateHandler := handler.NewTemplateHandler(templateSvc)
	drillHandler := handler.NewDrillHandler(drillSvc)
	executionHandler := handler.NewExecutionHandler(executionSvc)
	webhookHandler := handler.NewWebhookHandler(notificationSvc)
	wsHandler := handler.NewWebSocketHandler(hub)
	workflowHandler := handler.NewWorkflowHandler(workflowSvc)

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.AuthMiddleware(authSvc), authHandler.Logout)
		}

		users := api.Group("/users")
		users.Use(middleware.AuthMiddleware(authSvc))
		{
			users.GET("", middleware.RequireRole("admin"), userHandler.ListUsers)
			users.POST("", middleware.RequireRole("admin"), userHandler.CreateUser)
			users.GET("/me", userHandler.GetCurrentUser)
			users.GET("/:id", middleware.RequireRole("admin"), userHandler.GetUser)
			users.PUT("/:id", middleware.RequireRole("admin"), userHandler.UpdateUser)
			users.DELETE("/:id", middleware.RequireRole("admin"), userHandler.DeleteUser)
		}

		templates := api.Group("/templates")
		templates.Use(middleware.AuthMiddleware(authSvc))
		{
			templates.GET("", templateHandler.ListTemplates)
			templates.GET("/:id", templateHandler.GetTemplate)
			templates.POST("", middleware.RequireRole("admin"), templateHandler.CreateTemplate)
			templates.PUT("/:id", middleware.RequireRole("admin"), templateHandler.UpdateTemplate)
			templates.DELETE("/:id", middleware.RequireRole("admin"), templateHandler.DeleteTemplate)
		}

		drills := api.Group("/drills")
		drills.Use(middleware.AuthMiddleware(authSvc))
		{
			drills.GET("", drillHandler.ListDrills)
			drills.GET("/:id", drillHandler.GetDrill)
			drills.POST("", middleware.RequireRole("admin", "commander"), drillHandler.CreateDrill)
			drills.POST("/:id/start", middleware.RequireRole("admin", "commander"), drillHandler.StartDrill)
			drills.POST("/:id/pause", middleware.RequireRole("admin", "commander"), drillHandler.PauseDrill)
			drills.POST("/:id/resume", middleware.RequireRole("admin", "commander"), drillHandler.ResumeDrill)
			drills.POST("/:id/end", middleware.RequireRole("admin", "commander"), drillHandler.EndDrill)
		}

		executions := api.Group("/executions")
		executions.Use(middleware.AuthMiddleware(authSvc))
		{
			executions.GET("/my-tasks", executionHandler.GetMyTasks)
			executions.GET("/:id", executionHandler.GetExecution)
			executions.GET("/drill/:drill_id", executionHandler.GetDrillExecutions)
			executions.POST("/:id/assign", middleware.RequireRole("admin", "commander"), executionHandler.AssignStep)
			executions.POST("/:id/start", executionHandler.StartExecution)
			executions.POST("/:id/pause", executionHandler.PauseExecution)
			executions.POST("/:id/resume", executionHandler.ResumeExecution)
			executions.POST("/:id/complete", executionHandler.CompleteExecution)
		}

		webhooks := api.Group("/webhooks")
		webhooks.Use(middleware.AuthMiddleware(authSvc))
		{
			webhooks.GET("/logs", webhookHandler.GetMessageLogs)
			webhooks.POST("/send", middleware.RequireRole("admin"), webhookHandler.SendMessage)
		}

		ws := api.Group("/ws")
		ws.Use(middleware.AuthMiddleware(authSvc))
		{
			ws.GET("", func(c *gin.Context) {
				wsHandler.HandleWebSocket(c)
			})
		}

		workflow := api.Group("/workflow")
		workflow.Use(middleware.AuthMiddleware(authSvc))
		{
			// Phase routes
			workflow.GET("/phases/:id", workflowHandler.GetPhase)
			workflow.GET("/phases/:id/stages", workflowHandler.GetPhaseWithStages)
			workflow.GET("/templates/:template_id/phases", workflowHandler.GetTemplatePhases)
			workflow.POST("/phases", middleware.RequireRole("admin"), workflowHandler.CreatePhase)
			workflow.PUT("/phases/:id", middleware.RequireRole("admin"), workflowHandler.UpdatePhase)
			workflow.DELETE("/phases/:id", middleware.RequireRole("admin"), workflowHandler.DeletePhase)
			workflow.POST("/phases/:id/start", middleware.RequireRole("admin", "commander"), workflowHandler.StartPhase)
			workflow.POST("/phases/:id/complete", middleware.RequireRole("admin", "commander"), workflowHandler.CompletePhase)

			// Stage routes
			workflow.GET("/stages/:id", workflowHandler.GetStage)
			workflow.GET("/stages/:id/tasks", workflowHandler.GetStageWithTasks)
			workflow.GET("/stages/by-phase/:phase_id", workflowHandler.GetPhaseStages)
			workflow.POST("/stages", middleware.RequireRole("admin"), workflowHandler.CreateStage)
			workflow.PUT("/stages/:id", middleware.RequireRole("admin"), workflowHandler.UpdateStage)
			workflow.DELETE("/stages/:id", middleware.RequireRole("admin"), workflowHandler.DeleteStage)
			workflow.POST("/stages/:id/start", middleware.RequireRole("admin", "commander"), workflowHandler.StartStage)
			workflow.POST("/stages/:id/complete", middleware.RequireRole("admin", "commander"), workflowHandler.CompleteStage)

			// Task routes
			workflow.GET("/tasks/:id", workflowHandler.GetTask)
			workflow.GET("/tasks/:id/operations", workflowHandler.GetTaskWithOperations)
			workflow.GET("/tasks/:id/details", workflowHandler.GetTaskWithDetails)
			workflow.GET("/tasks/by-stage/:stage_id", workflowHandler.GetStageTasks)
			workflow.POST("/tasks", middleware.RequireRole("admin"), workflowHandler.CreateTask)
			workflow.PUT("/tasks/:id", middleware.RequireRole("admin"), workflowHandler.UpdateTask)
			workflow.DELETE("/tasks/:id", middleware.RequireRole("admin"), workflowHandler.DeleteTask)
			workflow.POST("/tasks/:id/start", workflowHandler.StartTask)
			workflow.POST("/tasks/:id/pause", workflowHandler.PauseTask)
			workflow.POST("/tasks/:id/complete", workflowHandler.CompleteTask)

			// Operation routes
			workflow.GET("/operations/:id", workflowHandler.GetOperation)
			workflow.GET("/operations/:id/details", workflowHandler.GetOperationWithDetails)
			workflow.GET("/operations/by-task/:task_id", workflowHandler.GetTaskOperations)
			workflow.POST("/operations", middleware.RequireRole("admin"), workflowHandler.CreateOperation)
			workflow.PUT("/operations/:id", middleware.RequireRole("admin"), workflowHandler.UpdateOperation)
			workflow.DELETE("/operations/:id", middleware.RequireRole("admin"), workflowHandler.DeleteOperation)
			workflow.POST("/operations/:id/start", workflowHandler.StartOperation)
			workflow.POST("/operations/:id/pause", workflowHandler.PauseOperation)
			workflow.POST("/operations/:id/complete", workflowHandler.CompleteOperation)

			// Full hierarchy
			workflow.GET("/templates/:template_id/hierarchy", workflowHandler.GetTemplateFullHierarchy)
		}
	}

	router.Static("/assets", "./static/assets")
	router.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	log.Printf("Starting HTTP server on port %d", cfg.Server.HTTPPort)
	if err := router.Run(fmt.Sprintf(":%d", cfg.Server.HTTPPort)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}