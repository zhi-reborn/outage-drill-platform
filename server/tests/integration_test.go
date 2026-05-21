package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/handler"
	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
	"github.com/yourorg/outage-drill-platform/server/internal/websocket"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	err = db.AutoMigrate(
		&model.User{},
		&model.DrillTemplate{},
		&model.DrillInstance{},
		&model.StepExecution{},
		&model.MessageLog{},
	)
	if err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	return db
}

func seedTestData(db *gorm.DB) error {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	users := []model.User{
		{
			Username:     "admin",
			PasswordHash: string(hashedPassword),
			Name:         "系统管理员",
			Role:         "admin",
		},
		{
			Username:     "commander",
			PasswordHash: string(hashedPassword),
			Name:         "指挥员张三",
			Role:         "commander",
		},
		{
			Username:     "participant1",
			PasswordHash: string(hashedPassword),
			Name:         "参演人员李四",
			Role:         "participant",
		},
	}

	for _, user := range users {
		if err := db.Create(&user).Error; err != nil {
			return err
		}
	}

	template := model.DrillTemplate{
		Name:        "标准灾备演练流程",
		Description: "包含应用降级、数据库切换、业务验证、系统恢复等标准步骤",
		Steps: model.StepDefinitions{
			{
				Order:          1,
				Name:           "应用降级",
				Description:    "停止非核心服务，降低系统负载",
				TimeoutMinutes: 10,
				Guide:          "①登录控制台 → ②执行降级脚本 → ③确认降级成功",
			},
			{
				Order:          2,
				Name:           "数据库切换",
				Description:    "执行主从切换，验证数据一致性",
				TimeoutMinutes: 15,
				Guide:          "①登录RDS控制台 → ②点击切换 → ③确认切换成功",
			},
			{
				Order:          3,
				Name:           "业务验证",
				Description:    "验证核心业务功能正常",
				TimeoutMinutes: 20,
				Guide:          "①访问业务系统 → ②执行测试用例 → ③记录验证结果",
			},
		},
	}

	return db.Create(&template).Error
}

func setupTestRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)

	userRepo := repository.NewUserRepository(db)
	templateRepo := repository.NewTemplateRepository(db)
	drillRepo := repository.NewDrillRepository(db)
	executionRepo := repository.NewExecutionRepository(db)
	messageRepo := repository.NewMessageRepository(db)

	userSvc := service.NewUserService(userRepo)
	authSvc := service.NewAuthService(userRepo, "test-secret-key", 24)
	templateSvc := service.NewTemplateService(templateRepo)
	drillSvc := service.NewDrillService(drillRepo, templateRepo, executionRepo)
	executionSvc := service.NewExecutionService(executionRepo, drillRepo)

	hub := websocket.NewHub()
	go hub.Run()

	router := gin.New()
	router.Use(middleware.CORSMiddleware())

	authHandler := handler.NewAuthHandler(authSvc)
	userHandler := handler.NewUserHandler(userSvc)
	templateHandler := handler.NewTemplateHandler(templateSvc)
	drillHandler := handler.NewDrillHandler(drillSvc)
	executionHandler := handler.NewExecutionHandler(executionSvc)

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
		}

		templates := api.Group("/templates")
		templates.Use(middleware.AuthMiddleware(authSvc))
		{
			templates.GET("", templateHandler.ListTemplates)
			templates.GET("/:id", templateHandler.GetTemplate)
			templates.POST("", middleware.RequireRole("admin"), templateHandler.CreateTemplate)
		}

		drills := api.Group("/drills")
		drills.Use(middleware.AuthMiddleware(authSvc))
		{
			drills.GET("", drillHandler.ListDrills)
			drills.GET("/:id", drillHandler.GetDrill)
			drills.POST("", middleware.RequireRole("admin", "commander"), drillHandler.CreateDrill)
			drills.POST("/:id/start", middleware.RequireRole("admin", "commander"), drillHandler.StartDrill)
			drills.POST("/:id/end", middleware.RequireRole("admin", "commander"), drillHandler.EndDrill)
		}

		executions := api.Group("/executions")
		executions.Use(middleware.AuthMiddleware(authSvc))
		{
			executions.GET("/my-tasks", executionHandler.GetMyTasks)
			executions.GET("/:id", executionHandler.GetExecution)
			executions.GET("/drill/:drill_id", executionHandler.GetDrillExecutions)
			executions.POST("/:id/start", executionHandler.StartExecution)
			executions.POST("/:id/complete", executionHandler.CompleteExecution)
		}
	}

	return router
}

func TestLoginIntegration(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	reqBody := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	body, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	if response["token"] == "" {
		t.Error("Expected token in response")
	}
}

func TestLoginWithWrongPassword(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	reqBody := map[string]string{
		"username": "admin",
		"password": "wrongpassword",
	}
	body, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

func TestUnauthorizedAccess(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	req, _ := http.NewRequest("GET", "/api/users", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401 for unauthorized access, got %d", w.Code)
	}
}

func TestTemplateListIntegration(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	loginReq := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	loginBody, _ := json.Marshal(loginReq)

	loginReqHTTP, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	loginReqHTTP.Header.Set("Content-Type", "application/json")

	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReqHTTP)

	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	token := loginResponse["token"].(string)

	req, _ := http.NewRequest("GET", "/api/templates", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var templates []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &templates)

	if len(templates) == 0 {
		t.Error("Expected at least one template")
	}
}

func TestDrillFlowIntegration(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	loginReq := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	loginBody, _ := json.Marshal(loginReq)

	loginReqHTTP, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	loginReqHTTP.Header.Set("Content-Type", "application/json")

	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReqHTTP)

	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	token := loginResponse["token"].(string)

	var templates []map[string]interface{}
	templateReq, _ := http.NewRequest("GET", "/api/templates", nil)
	templateReq.Header.Set("Authorization", "Bearer "+token)
	templateW := httptest.NewRecorder()
	router.ServeHTTP(templateW, templateReq)
	json.Unmarshal(templateW.Body.Bytes(), &templates)

	templateID := uint(templates[0]["id"].(float64))

	createDrillReq := map[string]interface{}{
		"template_id": templateID,
		"name":        "测试演练",
	}
	createDrillBody, _ := json.Marshal(createDrillReq)

	createDrillReqHTTP, _ := http.NewRequest("POST", "/api/drills", bytes.NewReader(createDrillBody))
	createDrillReqHTTP.Header.Set("Content-Type", "application/json")
	createDrillReqHTTP.Header.Set("Authorization", "Bearer "+token)

	createDrillW := httptest.NewRecorder()
	router.ServeHTTP(createDrillW, createDrillReqHTTP)

	if createDrillW.Code != http.StatusCreated {
		t.Errorf("Expected status 201 for drill creation, got %d. Body: %s", createDrillW.Code, createDrillW.Body.String())
	}

	var drillResponse map[string]interface{}
	json.Unmarshal(createDrillW.Body.Bytes(), &drillResponse)
	drillID := uint(drillResponse["id"].(float64))

	startDrillReq, _ := http.NewRequest("POST", "/api/drills/"+string(rune(drillID))+"/start", nil)
	startDrillReq.Header.Set("Authorization", "Bearer "+token)

	startDrillW := httptest.NewRecorder()
	router.ServeHTTP(startDrillW, startDrillReq)

	if startDrillW.Code != http.StatusOK {
		t.Errorf("Expected status 200 for drill start, got %d", startDrillW.Code)
	}

	getDrillReq, _ := http.NewRequest("GET", "/api/drills/"+string(rune(drillID)), nil)
	getDrillReq.Header.Set("Authorization", "Bearer "+token)

	getDrillW := httptest.NewRecorder()
	router.ServeHTTP(getDrillW, getDrillReq)

	var drillDetails map[string]interface{}
	json.Unmarshal(getDrillW.Body.Bytes(), &drillDetails)

	if drillDetails["status"] != "running" {
		t.Errorf("Expected drill status 'running', got '%s'", drillDetails["status"])
	}

	endDrillReq, _ := http.NewRequest("POST", "/api/drills/"+string(rune(drillID))+"/end", nil)
	endDrillReq.Header.Set("Authorization", "Bearer "+token)

	endDrillW := httptest.NewRecorder()
	router.ServeHTTP(endDrillW, endDrillReq)

	if endDrillW.Code != http.StatusOK {
		t.Errorf("Expected status 200 for drill end, got %d", endDrillW.Code)
	}
}

func TestUserManagementIntegration(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	loginReq := map[string]string{
		"username": "admin",
		"password": "admin123",
	}
	loginBody, _ := json.Marshal(loginReq)

	loginReqHTTP, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	loginReqHTTP.Header.Set("Content-Type", "application/json")

	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReqHTTP)

	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	token := loginResponse["token"].(string)

	createUserReq := map[string]string{
		"username": "newuser",
		"password": "password123",
		"name":     "新用户",
		"role":     "participant",
	}
	createUserBody, _ := json.Marshal(createUserReq)

	createUserReqHTTP, _ := http.NewRequest("POST", "/api/users", bytes.NewReader(createUserBody))
	createUserReqHTTP.Header.Set("Content-Type", "application/json")
	createUserReqHTTP.Header.Set("Authorization", "Bearer "+token)

	createUserW := httptest.NewRecorder()
	router.ServeHTTP(createUserW, createUserReqHTTP)

	if createUserW.Code != http.StatusCreated {
		t.Errorf("Expected status 201 for user creation, got %d", createUserW.Code)
	}

	listUsersReq, _ := http.NewRequest("GET", "/api/users", nil)
	listUsersReq.Header.Set("Authorization", "Bearer "+token)

	listUsersW := httptest.NewRecorder()
	router.ServeHTTP(listUsersW, listUsersReq)

	var users []map[string]interface{}
	json.Unmarshal(listUsersW.Body.Bytes(), &users)

	if len(users) < 4 {
		t.Errorf("Expected at least 4 users, got %d", len(users))
	}
}

func TestParticipantRoleRestriction(t *testing.T) {
	db := setupTestDB(t)
	if err := seedTestData(db); err != nil {
		t.Fatalf("Failed to seed test data: %v", err)
	}

	router := setupTestRouter(db)

	loginReq := map[string]string{
		"username": "participant1",
		"password": "admin123",
	}
	loginBody, _ := json.Marshal(loginReq)

	loginReqHTTP, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewReader(loginBody))
	loginReqHTTP.Header.Set("Content-Type", "application/json")

	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReqHTTP)

	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	token := loginResponse["token"].(string)

	createTemplateReq := map[string]interface{}{
		"name":        "测试模板",
		"description": "测试描述",
		"steps": []map[string]interface{}{
			{
				"order":          1,
				"name":           "步骤1",
				"description":    "描述1",
				"timeout_minutes": 10,
				"guide":          "指引1",
			},
		},
	}
	createTemplateBody, _ := json.Marshal(createTemplateReq)

	createTemplateReqHTTP, _ := http.NewRequest("POST", "/api/templates", bytes.NewReader(createTemplateBody))
	createTemplateReqHTTP.Header.Set("Content-Type", "application/json")
	createTemplateReqHTTP.Header.Set("Authorization", "Bearer "+token)

	createTemplateW := httptest.NewRecorder()
	router.ServeHTTP(createTemplateW, createTemplateReqHTTP)

	if createTemplateW.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for participant creating template, got %d", createTemplateW.Code)
	}
}