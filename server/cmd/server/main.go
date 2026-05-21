package main

import (
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

	userSvc := service.NewUserService(userRepo)
	authSvc := service.NewAuthService(userRepo, cfg.JWT.Secret, cfg.JWT.ExpireHours)
	templateSvc := service.NewTemplateService(templateRepo)
	drillSvc := service.NewDrillService(drillRepo, templateRepo, executionRepo)
	executionSvc := service.NewExecutionService(executionRepo, drillRepo)

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
	}

	router.Static("/assets", "./static/assets")
	router.NoRoute(func(c *gin.Context) {
		c.File("./static/index.html")
	})

	log.Printf("Starting HTTP server on port %d", cfg.Server.HTTPPort)
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}