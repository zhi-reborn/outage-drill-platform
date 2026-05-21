# 断网断电演练平台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个完整的断网断电演练平台，包含指挥中心大屏、参演工作台、管理后台，支持实时状态同步和企业微信消息推送。

**Architecture:** 单体架构，Go 后端同时提供 HTTP API (8080) 和 WebSocket (8081) 服务，React 前端构建后嵌入 Go 服务。MySQL 数据库存储业务数据，企业微信 Webhook 实现消息推送。

**Tech Stack:** Go 1.21+, React 18, Ant Design 5, MySQL 8.0, WebSocket, JWT, Vite

---

## 项目结构

### 后端文件结构
```
server/
├── cmd/server/main.go                    # 主服务入口
├── internal/
│   ├── handler/                          # HTTP handlers
│   │   ├── auth.go                       # 认证相关
│   │   ├── user.go                       # 用户管理
│   │   ├── template.go                   # 流程模板
│   │   ├── drill.go                      # 演练实例
│   │   ├── execution.go                  # 步骤执行
│   │   └── webhook.go                    # 消息推送
│   ├── service/                          # 业务逻辑
│   │   ├── auth.go
│   │   ├── user.go
│   │   ├── template.go
│   │   ├── drill.go
│   │   ├── execution.go
│   │   └── notification.go
│   ├── repository/                       # 数据访问
│   │   ├── user.go
│   │   ├── template.go
│   │   ├── drill.go
│   │   ├── execution.go
│   │   └── message.go
│   ├── model/                            # 数据模型
│   │   ├── user.go
│   │   ├── template.go
│   │   ├── drill.go
│   │   ├── execution.go
│   │   └── message.go
│   ├── middleware/                       # 中间件
│   │   ├── auth.go
│   │   ├── cors.go
│   │   └── logger.go
│   └── websocket/                        # WebSocket
│       ├── hub.go                        # 连接管理
│       └── client.go                     # 客户端连接
├── pkg/
│   ├── auth/jwt.go                       # JWT 工具
│   ├── wechat/webhook.go                 # 企业微信客户端
│   ├── db/mysql.go                       # 数据库连接
│   └── config/config.go                  # 配置管理
├── static/                               # 前端构建输出
├── config/config.yaml                     # 配置文件
├── go.mod
└── go.sum
```

### 前端文件结构
```
web/
├── src/
│   ├── components/                        # 可复用组件
│   │   ├── Layout/
│   │   ├── StepCard/
│   │   └── MessageList/
│   ├── pages/
│   │   ├── Login/
│   │   ├── Dashboard/                    # 指挥中心大屏
│   │   ├── Workbench/                    # 参演工作台
│   │   └── Admin/                        # 管理后台
│   │       ├── UserManagement/
│   │       ├── TemplateManagement/
│   │       ├── DrillManagement/
│   │       └── WebhookConfig/
│   ├── services/                         # API 服务
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── drill.ts
│   │   └── websocket.ts
│   ├── hooks/                            # 自定义 hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   └── useDrill.ts
│   ├── store/                            # 状态管理
│   │   └── index.ts
│   ├── types/                            # TypeScript 类型
│   │   └── index.ts
│   ├── utils/                            # 工具函数
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 阶段一：项目初始化和数据库设计

### Task 1: 初始化后端项目

**Files:**
- Create: `server/go.mod`
- Create: `server/cmd/server/main.go`
- Create: `server/config/config.yaml`

- [ ] **Step 1: 创建 Go 模块和基础目录结构**

```bash
cd server
go mod init github.com/yourorg/outage-drill-platform/server
mkdir -p cmd/server internal/{handler,service,repository,model,middleware,websocket} pkg/{auth,wechat,db,config} static config
```

- [ ] **Step 2: 创建配置文件**

创建 `server/config/config.yaml`:

```yaml
server:
  http_port: 8080
  websocket_port: 8081

database:
  host: localhost
  port: 3306
  user: root
  password: your_password
  dbname: outage_drill

jwt:
  secret: your-secret-key-change-in-production
  expire_hours: 24

wechat:
  webhook_url: ""
```

- [ ] **Step 3: 创建配置管理代码**

创建 `server/pkg/config/config.go`:

```go
package config

import (
	"os"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	JWT      JWTConfig      `yaml:"jwt"`
	WeChat   WeChatConfig   `yaml:"wechat"`
}

type ServerConfig struct {
	HTTPPort     int `yaml:"http_port"`
	WebSocketPort int `yaml:"websocket_port"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
}

type JWTConfig struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire_hours"`
}

type WeChatConfig struct {
	WebhookURL string `yaml:"webhook_url"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
```

- [ ] **Step 4: 创建主服务入口**

创建 `server/cmd/server/main.go`:

```go
package main

import (
	"log"
	"os"

	"github.com/yourorg/outage-drill-platform/server/pkg/config"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Starting server with config: HTTP=%d, WebSocket=%d", 
		cfg.Server.HTTPPort, cfg.Server.WebSocketPort)
	
	os.Exit(0)
}
```

- [ ] **Step 5: 安装依赖并验证**

```bash
cd server
go get gopkg.in/yaml.v3
go mod tidy
go run cmd/server/main.go
```

Expected: 输出 "Starting server with config: HTTP=8080, WebSocket=8081"

- [ ] **Step 6: 提交代码**

```bash
git add server/
git commit -m "feat: initialize Go project structure and configuration"
```

---

### Task 2: 数据库连接和模型定义

**Files:**
- Create: `server/pkg/db/mysql.go`
- Create: `server/internal/model/user.go`
- Create: `server/internal/model/template.go`
- Create: `server/internal/model/drill.go`
- Create: `server/internal/model/execution.go`
- Create: `server/internal/model/message.go`

- [ ] **Step 1: 创建数据库连接工具**

创建 `server/pkg/db/mysql.go`:

```go
package db

import (
	"fmt"
	"time"

	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func NewMySQL(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}
```

- [ ] **Step 2: 定义用户模型**

创建 `server/internal/model/user.go`:

```go
package model

import (
	"time"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Name         string    `gorm:"size:100;not null" json:"name"`
	Role         string    `gorm:"size:20;not null" json:"role"` // admin, commander, participant
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
```

- [ ] **Step 3: 定义流程模板模型**

创建 `server/internal/model/template.go`:

```go
package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type StepDefinition struct {
	Order          int    `json:"order"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	TimeoutMinutes int    `json:"timeout_minutes"`
	Guide          string `json:"guide"`
}

type StepDefinitions []StepDefinition

func (s StepDefinitions) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *StepDefinitions) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, s)
}

type DrillTemplate struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Name        string          `gorm:"size:100;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	Steps       StepDefinitions `gorm:"type:json;not null" json:"steps"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (DrillTemplate) TableName() string {
	return "drill_templates"
}
```

- [ ] **Step 4: 定义演练实例模型**

创建 `server/internal/model/drill.go`:

```go
package model

import (
	"time"
)

type DrillInstance struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TemplateID uint      `gorm:"not null;index" json:"template_id"`
	Name       string    `gorm:"size:100;not null" json:"name"`
	Status     string    `gorm:"size:20;not null;index" json:"status"` // pending, running, paused, completed, cancelled
	StartTime  *time.Time `json:"start_time"`
	EndTime    *time.Time `json:"end_time"`
	CreatedBy  uint      `gorm:"not null" json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Template   *DrillTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Creator    *User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

func (DrillInstance) TableName() string {
	return "drill_instances"
}
```

- [ ] **Step 5: 定义步骤执行记录模型**

创建 `server/internal/model/execution.go`:

```go
package model

import (
	"time"
)

type StepExecution struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	DrillID         uint       `gorm:"not null;index" json:"drill_id"`
	StepOrder       int        `gorm:"not null" json:"step_order"`
	StepName        string     `gorm:"size:100;not null" json:"step_name"`
	AssigneeID      uint       `gorm:"not null;index" json:"assignee_id"`
	Status          string     `gorm:"size:20;not null;index" json:"status"` // pending, in_progress, completed, timeout
	StartTime       *time.Time `json:"start_time"`
	EndTime         *time.Time `json:"end_time"`
	DurationSeconds int        `json:"duration_seconds"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Drill    *DrillInstance `gorm:"foreignKey:DrillID" json:"drill,omitempty"`
	Assignee *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

func (StepExecution) TableName() string {
	return "step_executions"
}
```

- [ ] **Step 6: 定义消息记录模型**

创建 `server/internal/model/message.go`:

```go
package model

import (
	"time"
)

type MessageLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	DrillID    uint      `gorm:"not null;index" json:"drill_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	SentAt     time.Time `json:"sent_at"`
	WebhookURL string    `gorm:"size:255" json:"webhook_url"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Drill *DrillInstance `gorm:"foreignKey:DrillID" json:"drill,omitempty"`
}

func (MessageLog) TableName() string {
	return "message_logs"
}
```

- [ ] **Step 7: 安装 GORM 依赖**

```bash
cd server
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql
go mod tidy
```

- [ ] **Step 8: 验证模型编译**

```bash
cd server
go build ./internal/model/...
```

Expected: 编译成功，无错误

- [ ] **Step 9: 提交代码**

```bash
git add server/
git commit -m "feat: add database connection and data models"
```

---

### Task 3: 数据库迁移脚本

**Files:**
- Create: `server/scripts/migrate.go`
- Create: `server/scripts/seed.go`

- [ ] **Step 1: 创建数据库迁移脚本**

创建 `server/scripts/migrate.go`:

```go
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
```

- [ ] **Step 2: 创建数据填充脚本**

创建 `server/scripts/seed.go`:

```go
package main

import (
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/pkg/config"
	"github.com/yourorg/outage-drill-platform/server/pkg/db"
)

func seedUsers(database *gorm.DB) error {
	users := []model.User{
		{
			Username:     "admin",
			PasswordHash: hashPassword("admin123"),
			Name:         "系统管理员",
			Role:         "admin",
		},
		{
			Username:     "commander",
			PasswordHash: hashPassword("commander123"),
			Name:         "指挥员张三",
			Role:         "commander",
		},
		{
			Username:     "participant1",
			PasswordHash: hashPassword("participant123"),
			Name:         "参演人员李四",
			Role:         "participant",
		},
		{
			Username:     "participant2",
			PasswordHash: hashPassword("participant123"),
			Name:         "参演人员王五",
			Role:         "participant",
		},
	}

	for _, user := range users {
		if err := database.FirstOrCreate(&user, model.User{Username: user.Username}).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedTemplates(database *gorm.DB) error {
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
			{
				Order:          4,
				Name:           "系统恢复",
				Description:    "恢复系统到正常状态",
				TimeoutMinutes: 15,
				Guide:          "①启动降级服务 → ②验证服务状态 → ③确认系统正常",
			},
			{
				Order:          5,
				Name:           "演练总结",
				Description:    "总结演练过程，记录问题和改进点",
				TimeoutMinutes: 10,
				Guide:          "①汇总演练数据 → ②编写总结报告 → ③提交审核",
			},
		},
	}

	return database.FirstOrCreate(&template, model.DrillTemplate{Name: template.Name}).Error
}

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	database, err := db.NewMySQL(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	log.Println("Seeding database...")

	if err := seedUsers(database); err != nil {
		log.Fatalf("Failed to seed users: %v", err)
	}

	if err := seedTemplates(database); err != nil {
		log.Fatalf("Failed to seed templates: %v", err)
	}

	log.Println("Database seeded successfully")
}
```

- [ ] **Step 3: 安装 bcrypt 依赖**

```bash
cd server
go get -u golang.org/x/crypto/bcrypt
go mod tidy
```

- [ ] **Step 4: 创建数据库**

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **Step 5: 运行迁移脚本**

```bash
cd server
go run scripts/migrate.go
```

Expected: 输出 "Migrations completed successfully"

- [ ] **Step 6: 运行数据填充脚本**

```bash
cd server
go run scripts/seed.go
```

Expected: 输出 "Database seeded successfully"

- [ ] **Step 7: 验证数据库表和数据**

```bash
mysql -u root -p outage_drill -e "SHOW TABLES; SELECT * FROM users; SELECT * FROM drill_templates;"
```

Expected: 显示 5 张表，4 个用户，1 个模板

- [ ] **Step 8: 提交代码**

```bash
git add server/
git commit -m "feat: add database migration and seed scripts"
```

---

## 阶段二：后端核心功能

### Task 4: JWT 认证工具

**Files:**
- Create: `server/pkg/auth/jwt.go`
- Create: `server/pkg/auth/auth_test.go`

- [ ] **Step 1: 编写 JWT 工具测试**

创建 `server/pkg/auth/auth_test.go`:

```go
package auth

import (
	"testing"
	"time"
)

func TestGenerateAndParseToken(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	role := "admin"
	expireHours := 24

	token, err := GenerateToken(secret, userID, username, role, expireHours)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Fatal("Token should not be empty")
	}

	claims, err := ParseToken(secret, token)
	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected userID %d, got %d", userID, claims.UserID)
	}

	if claims.Username != username {
		t.Errorf("Expected username %s, got %s", username, claims.Username)
	}

	if claims.Role != role {
		t.Errorf("Expected role %s, got %s", role, claims.Role)
	}
}

func TestParseInvalidToken(t *testing.T) {
	secret := "test-secret-key"
	invalidToken := "invalid.token.here"

	_, err := ParseToken(secret, invalidToken)
	if err == nil {
		t.Fatal("Should return error for invalid token")
	}
}

func TestTokenExpiration(t *testing.T) {
	secret := "test-secret-key"
	userID := uint(1)
	username := "testuser"
	role := "admin"
	expireHours := 0

	token, err := GenerateToken(secret, userID, username, role, expireHours)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	time.Sleep(2 * time.Second)

	_, err = ParseToken(secret, token)
	if err == nil {
		t.Fatal("Should return error for expired token")
	}
}
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server
go test ./pkg/auth/... -v
```

Expected: 测试失败，提示函数未定义

- [ ] **Step 3: 实现 JWT 工具**

创建 `server/pkg/auth/jwt.go`:

```go
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(secret string, userID uint, username, role string, expireHours int) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret string, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
```

- [ ] **Step 4: 安装 JWT 依赖**

```bash
cd server
go get -u github.com/golang-jwt/jwt/v5
go mod tidy
```

- [ ] **Step 5: 运行测试验证通过**

```bash
cd server
go test ./pkg/auth/... -v
```

Expected: 所有测试通过

- [ ] **Step 6: 提交代码**

```bash
git add server/
git commit -m "feat: implement JWT authentication utilities with tests"
```

---

### Task 5: 用户 Repository 层

**Files:**
- Create: `server/internal/repository/user.go`
- Create: `server/internal/repository/user_test.go`

- [ ] **Step 1: 编写用户 Repository 测试**

创建 `server/internal/repository/user_test.go`:

```go
package repository

import (
	"testing"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	err = db.AutoMigrate(&model.User{})
	if err != nil {
		t.Fatalf("Failed to migrate: %v", err)
	}

	return db
}

func TestCreateUser(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}

	err := repo.Create(user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.ID == 0 {
		t.Fatal("User ID should not be zero after creation")
	}
}

func TestFindByUsername(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}
	repo.Create(user)

	found, err := repo.FindByUsername("testuser")
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}

	if found.Username != "testuser" {
		t.Errorf("Expected username testuser, got %s", found.Username)
	}
}

func TestFindByID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	user := &model.User{
		Username:     "testuser",
		PasswordHash: hashPassword("password123"),
		Name:         "Test User",
		Role:         "participant",
	}
	repo.Create(user)

	found, err := repo.FindByID(user.ID)
	if err != nil {
		t.Fatalf("Failed to find user: %v", err)
	}

	if found.ID != user.ID {
		t.Errorf("Expected ID %d, got %d", user.ID, found.ID)
	}
}

func TestList(t *testing.T) {
	db := setupTestDB(t)
	repo := NewUserRepository(db)

	users := []*model.User{
		{Username: "user1", PasswordHash: "hash1", Name: "User 1", Role: "admin"},
		{Username: "user2", PasswordHash: "hash2", Name: "User 2", Role: "participant"},
		{Username: "user3", PasswordHash: "hash3", Name: "User 3", Role: "commander"},
	}

	for _, u := range users {
		repo.Create(u)
	}

	list, err := repo.List()
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	if len(list) != 3 {
		t.Errorf("Expected 3 users, got %d", len(list))
	}
}

func hashPassword(password string) string {
	bytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes)
}
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server
go test ./internal/repository/... -v
```

Expected: 测试失败，提示函数未定义

- [ ] **Step 3: 实现用户 Repository**

创建 `server/internal/repository/user.go`:

```go
package repository

import (
	"errors"

	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByUsername(username string) (*model.User, error) {
	var user model.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) List() ([]*model.User, error) {
	var users []*model.User
	err := r.db.Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&model.User{}, id).Error
}

func (r *UserRepository) ExistsByUsername(username string) (bool, error) {
	var count int64
	err := r.db.Model(&model.User{}).Where("username = ?", username).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *UserRepository) FindByIDs(ids []uint) ([]*model.User, error) {
	if len(ids) == 0 {
		return []*model.User{}, nil
	}
	var users []*model.User
	err := r.db.Where("id IN ?", ids).Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

func (r *UserRepository) ValidatePassword(user *model.User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	return err == nil
}

var (
	ErrUserNotFound = errors.New("user not found")
)
```

- [ ] **Step 4: 安装 SQLite 测试依赖**

```bash
cd server
go get -u gorm.io/driver/sqlite
go mod tidy
```

- [ ] **Step 5: 运行测试验证通过**

```bash
cd server
go test ./internal/repository/... -v
```

Expected: 所有测试通过

- [ ] **Step 6: 提交代码**

```bash
git add server/
git commit -m "feat: implement user repository with tests"
```

---

### Task 6: 用户 Service 层

**Files:**
- Create: `server/internal/service/user.go`
- Create: `server/internal/service/user_test.go`

- [ ] **Step 1: 编写用户 Service 测试**

创建 `server/internal/service/user_test.go`:

```go
package service

import (
	"errors"
	"testing"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type mockUserRepo struct {
	users map[uint]*model.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users: make(map[uint]*model.User),
	}
}

func (m *mockUserRepo) Create(user *model.User) error {
	user.ID = uint(len(m.users) + 1)
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) FindByID(id uint) (*model.User, error) {
	user, ok := m.users[id]
	if !ok {
		return nil, errors.New("not found")
	}
	return user, nil
}

func (m *mockUserRepo) FindByUsername(username string) (*model.User, error) {
	for _, user := range m.users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, errors.New("not found")
}

func (m *mockUserRepo) List() ([]*model.User, error) {
	var users []*model.User
	for _, user := range m.users {
		users = append(users, user)
	}
	return users, nil
}

func (m *mockUserRepo) Update(user *model.User) error {
	m.users[user.ID] = user
	return nil
}

func (m *mockUserRepo) Delete(id uint) error {
	delete(m.users, id)
	return nil
}

func (m *mockUserRepo) ExistsByUsername(username string) (bool, error) {
	for _, user := range m.users {
		if user.Username == username {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockUserRepo) FindByIDs(ids []uint) ([]*model.User, error) {
	var users []*model.User
	for _, id := range ids {
		if user, ok := m.users[id]; ok {
			users = append(users, user)
		}
	}
	return users, nil
}

func (m *mockUserRepo) ValidatePassword(user *model.User, password string) bool {
	return password == "correct-password"
}

func TestCreateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, err := svc.CreateUser("testuser", "password123", "Test User", "participant")
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	if user.Username != "testuser" {
		t.Errorf("Expected username testuser, got %s", user.Username)
	}

	if user.Role != "participant" {
		t.Errorf("Expected role participant, got %s", user.Role)
	}
}

func TestCreateDuplicateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	_, err := svc.CreateUser("testuser", "password123", "Test User", "participant")
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	_, err = svc.CreateUser("testuser", "password456", "Another User", "admin")
	if err == nil {
		t.Fatal("Should return error for duplicate username")
	}
}

func TestGetUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	created, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	user, err := svc.GetUser(created.ID)
	if err != nil {
		t.Fatalf("Failed to get user: %v", err)
	}

	if user.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, user.ID)
	}
}

func TestListUsers(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	svc.CreateUser("user1", "pass1", "User 1", "admin")
	svc.CreateUser("user2", "pass2", "User 2", "participant")

	users, err := svc.ListUsers()
	if err != nil {
		t.Fatalf("Failed to list users: %v", err)
	}

	if len(users) != 2 {
		t.Errorf("Expected 2 users, got %d", len(users))
	}
}

func TestUpdateUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	updated, err := svc.UpdateUser(user.ID, "newpassword", "Updated Name", "commander")
	if err != nil {
		t.Fatalf("Failed to update user: %v", err)
	}

	if updated.Name != "Updated Name" {
		t.Errorf("Expected name Updated Name, got %s", updated.Name)
	}

	if updated.Role != "commander" {
		t.Errorf("Expected role commander, got %s", updated.Role)
	}
}

func TestDeleteUser(t *testing.T) {
	repo := newMockUserRepo()
	svc := NewUserService(repo)

	user, _ := svc.CreateUser("testuser", "password123", "Test User", "participant")

	err := svc.DeleteUser(user.ID)
	if err != nil {
		t.Fatalf("Failed to delete user: %v", err)
	}

	_, err = svc.GetUser(user.ID)
	if err == nil {
		t.Fatal("User should be deleted")
	}
}
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server
go test ./internal/service/... -v
```

Expected: 测试失败，提示函数未定义

- [ ] **Step 3: 实现用户 Service**

创建 `server/internal/service/user.go`:

```go
package service

import (
	"errors"

	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) CreateUser(username, password, name, role string) (*model.User, error) {
	exists, err := s.userRepo.ExistsByUsername(username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("username already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username:     username,
		PasswordHash: string(hashedPassword),
		Name:         name,
		Role:         role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) GetUser(id uint) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

func (s *UserService) ListUsers() ([]*model.User, error) {
	return s.userRepo.List()
}

func (s *UserService) UpdateUser(id uint, password, name, role string) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = string(hashedPassword)
	}

	if name != "" {
		user.Name = name
	}

	if role != "" {
		user.Role = role
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

func (s *UserService) ValidateUser(username, password string) (*model.User, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if !s.userRepo.ValidatePassword(user, password) {
		return nil, errors.New("invalid username or password")
	}

	return user, nil
}

func (s *UserService) GetUsersByIDs(ids []uint) ([]*model.User, error) {
	return s.userRepo.FindByIDs(ids)
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
cd server
go test ./internal/service/... -v
```

Expected: 所有测试通过

- [ ] **Step 5: 提交代码**

```bash
git add server/
git commit -m "feat: implement user service with tests"
```

---

由于实施计划非常长，我将继续创建剩余的任务。让我继续编写完整的计划文档...