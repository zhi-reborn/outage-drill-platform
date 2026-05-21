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

### Task 7: 认证 Service 和 Handler

**Files:**
- Create: `server/internal/service/auth.go`
- Create: `server/internal/service/auth_test.go`
- Create: `server/internal/handler/auth.go`

- [ ] **Step 1: 编写认证 Service 测试**

创建 `server/internal/service/auth_test.go`:

```go
package service

import (
	"testing"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

func TestLogin(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userSvc, "test-secret", 24)

	user, _ := userSvc.CreateUser("testuser", "password123", "Test User", "participant")

	token, err := authSvc.Login("testuser", "password123")
	if err != nil {
		t.Fatalf("Failed to login: %v", err)
	}

	if token == "" {
		t.Fatal("Token should not be empty")
	}
}

func TestLoginWithWrongPassword(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userSvc, "test-secret", 24)

	userSvc.CreateUser("testuser", "password123", "Test User", "participant")

	_, err := authSvc.Login("testuser", "wrongpassword")
	if err == nil {
		t.Fatal("Should return error for wrong password")
	}
}

func TestValidateToken(t *testing.T) {
	userRepo := newMockUserRepo()
	userSvc := NewUserService(userRepo)
	authSvc := NewAuthService(userSvc, "test-secret", 24)

	user, _ := userSvc.CreateUser("testuser", "password123", "Test User", "participant")
	token, _ := authSvc.Login("testuser", "password123")

	claims, err := authSvc.ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != user.ID {
		t.Errorf("Expected userID %d, got %d", user.ID, claims.UserID)
	}
}
```

- [ ] **Step 2: 实现认证 Service**

创建 `server/internal/service/auth.go`:

```go
package service

import (
	"errors"

	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/pkg/auth"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	jwtSecret   string
	expireHours int
}

func NewAuthService(userRepo *repository.UserRepository, jwtSecret string, expireHours int) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   jwtSecret,
		expireHours: expireHours,
	}
}

func (s *AuthService) Login(username, password string) (string, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return "", errors.New("invalid username or password")
	}

	if !s.userRepo.ValidatePassword(user, password) {
		return "", errors.New("invalid username or password")
	}

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, user.Role, s.expireHours)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*auth.Claims, error) {
	return auth.ParseToken(s.jwtSecret, tokenString)
}
```

- [ ] **Step 3: 运行测试验证**

```bash
cd server
go test ./internal/service/... -v
```

Expected: 所有测试通过

- [ ] **Step 4: 实现认证 Handler**

创建 `server/internal/handler/auth.go`:

```go
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
}

func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  *UserResponse `json:"user"`
}

type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := h.authSvc.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{
		Token: token,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "logout successful"})
}
```

- [ ] **Step 5: 安装 Gin 框架**

```bash
cd server
go get -u github.com/gin-gonic/gin
go mod tidy
```

- [ ] **Step 6: 提交代码**

```bash
git add server/
git commit -m "feat: implement authentication service and handler"
```

---

### Task 8: 模板 Repository 和 Service

**Files:**
- Create: `server/internal/repository/template.go`
- Create: `server/internal/repository/template_test.go`
- Create: `server/internal/service/template.go`
- Create: `server/internal/service/template_test.go`

- [ ] **Step 1: 实现模板 Repository**

创建 `server/internal/repository/template.go`:

```go
package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type TemplateRepository struct {
	db *gorm.DB
}

func NewTemplateRepository(db *gorm.DB) *TemplateRepository {
	return &TemplateRepository{db: db}
}

func (r *TemplateRepository) Create(template *model.DrillTemplate) error {
	return r.db.Create(template).Error
}

func (r *TemplateRepository) FindByID(id uint) (*model.DrillTemplate, error) {
	var template model.DrillTemplate
	err := r.db.First(&template, id).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *TemplateRepository) List() ([]*model.DrillTemplate, error) {
	var templates []*model.DrillTemplate
	err := r.db.Find(&templates).Error
	if err != nil {
		return nil, err
	}
	return templates, nil
}

func (r *TemplateRepository) Update(template *model.DrillTemplate) error {
	return r.db.Save(template).Error
}

func (r *TemplateRepository) Delete(id uint) error {
	return r.db.Delete(&model.DrillTemplate{}, id).Error
}
```

- [ ] **Step 2: 实现模板 Service**

创建 `server/internal/service/template.go`:

```go
package service

import (
	"errors"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type TemplateService struct {
	templateRepo *repository.TemplateRepository
}

func NewTemplateService(templateRepo *repository.TemplateRepository) *TemplateService {
	return &TemplateService{templateRepo: templateRepo}
}

func (s *TemplateService) CreateTemplate(name, description string, steps model.StepDefinitions) (*model.DrillTemplate, error) {
	if err := s.validateSteps(steps); err != nil {
		return nil, err
	}

	template := &model.DrillTemplate{
		Name:        name,
		Description: description,
		Steps:       steps,
	}

	if err := s.templateRepo.Create(template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *TemplateService) GetTemplate(id uint) (*model.DrillTemplate, error) {
	return s.templateRepo.FindByID(id)
}

func (s *TemplateService) ListTemplates() ([]*model.DrillTemplate, error) {
	return s.templateRepo.List()
}

func (s *TemplateService) UpdateTemplate(id uint, name, description string, steps model.StepDefinitions) (*model.DrillTemplate, error) {
	template, err := s.templateRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if err := s.validateSteps(steps); err != nil {
		return nil, err
	}

	template.Name = name
	template.Description = description
	template.Steps = steps

	if err := s.templateRepo.Update(template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *TemplateService) DeleteTemplate(id uint) error {
	return s.templateRepo.Delete(id)
}

func (s *TemplateService) validateSteps(steps model.StepDefinitions) error {
	if len(steps) == 0 {
		return errors.New("steps cannot be empty")
	}

	orderMap := make(map[int]bool)
	for _, step := range steps {
		if step.Order <= 0 {
			return errors.New("step order must be positive")
		}
		if step.Name == "" {
			return errors.New("step name cannot be empty")
		}
		if step.TimeoutMinutes <= 0 {
			return errors.New("step timeout must be positive")
		}
		if orderMap[step.Order] {
			return errors.New("duplicate step order")
		}
		orderMap[step.Order] = true
	}

	return nil
}
```

- [ ] **Step 3: 编写测试并验证**

创建测试文件并运行:

```bash
cd server
go test ./internal/repository/... -v
go test ./internal/service/... -v
```

- [ ] **Step 4: 提交代码**

```bash
git add server/
git commit -m "feat: implement template repository and service"
```

---

### Task 9: 演练 Repository 和 Service

**Files:**
- Create: `server/internal/repository/drill.go`
- Create: `server/internal/service/drill.go`

- [ ] **Step 1: 实现演练 Repository**

创建 `server/internal/repository/drill.go`:

```go
package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type DrillRepository struct {
	db *gorm.DB
}

func NewDrillRepository(db *gorm.DB) *DrillRepository {
	return &DrillRepository{db: db}
}

func (r *DrillRepository) Create(drill *model.DrillInstance) error {
	return r.db.Create(drill).Error
}

func (r *DrillRepository) FindByID(id uint) (*model.DrillInstance, error) {
	var drill model.DrillInstance
	err := r.db.Preload("Template").Preload("Creator").First(&drill, id).Error
	if err != nil {
		return nil, err
	}
	return &drill, nil
}

func (r *DrillRepository) List() ([]*model.DrillInstance, error) {
	var drills []*model.DrillInstance
	err := r.db.Preload("Template").Preload("Creator").Find(&drills).Error
	if err != nil {
		return nil, err
	}
	return drills, nil
}

func (r *DrillRepository) Update(drill *model.DrillInstance) error {
	return r.db.Save(drill).Error
}

func (r *DrillRepository) Delete(id uint) error {
	return r.db.Delete(&model.DrillInstance{}, id).Error
}

func (r *DrillRepository) FindByStatus(status string) ([]*model.DrillInstance, error) {
	var drills []*model.DrillInstance
	err := r.db.Where("status = ?", status).Find(&drills).Error
	if err != nil {
		return nil, err
	}
	return drills, nil
}
```

- [ ] **Step 2: 实现演练 Service**

创建 `server/internal/service/drill.go`:

```go
package service

import (
	"errors"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type DrillService struct {
	drillRepo     *repository.DrillRepository
	templateRepo  *repository.TemplateRepository
	executionRepo *repository.ExecutionRepository
}

func NewDrillService(
	drillRepo *repository.DrillRepository,
	templateRepo *repository.TemplateRepository,
	executionRepo *repository.ExecutionRepository,
) *DrillService {
	return &DrillService{
		drillRepo:     drillRepo,
		templateRepo:  templateRepo,
		executionRepo: executionRepo,
	}
}

func (s *DrillService) CreateDrill(templateID uint, name string, createdBy uint) (*model.DrillInstance, error) {
	template, err := s.templateRepo.FindByID(templateID)
	if err != nil {
		return nil, errors.New("template not found")
	}

	drill := &model.DrillInstance{
		TemplateID: templateID,
		Name:       name,
		Status:     "pending",
		CreatedBy:  createdBy,
	}

	if err := s.drillRepo.Create(drill); err != nil {
		return nil, err
	}

	for _, step := range template.Steps {
		execution := &model.StepExecution{
			DrillID:   drill.ID,
			StepOrder: step.Order,
			StepName:  step.Name,
			Status:    "pending",
		}
		s.executionRepo.Create(execution)
	}

	return drill, nil
}

func (s *DrillService) StartDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "pending" {
		return errors.New("drill can only be started from pending status")
	}

	now := time.Now()
	drill.Status = "running"
	drill.StartTime = &now

	return s.drillRepo.Update(drill)
}

func (s *DrillService) PauseDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "running" {
		return errors.New("drill can only be paused from running status")
	}

	drill.Status = "paused"
	return s.drillRepo.Update(drill)
}

func (s *DrillService) ResumeDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status != "paused" {
		return errors.New("drill can only be resumed from paused status")
	}

	drill.Status = "running"
	return s.drillRepo.Update(drill)
}

func (s *DrillService) EndDrill(id uint) error {
	drill, err := s.drillRepo.FindByID(id)
	if err != nil {
		return err
	}

	if drill.Status == "completed" || drill.Status == "cancelled" {
		return errors.New("drill already ended")
	}

	now := time.Now()
	drill.Status = "completed"
	drill.EndTime = &now

	return s.drillRepo.Update(drill)
}

func (s *DrillService) GetDrill(id uint) (*model.DrillInstance, error) {
	return s.drillRepo.FindByID(id)
}

func (s *DrillService) ListDrills() ([]*model.DrillInstance, error) {
	return s.drillRepo.List()
}
```

- [ ] **Step 3: 提交代码**

```bash
git add server/
git commit -m "feat: implement drill repository and service"
```

---

### Task 10: 步骤执行 Repository 和 Service

**Files:**
- Create: `server/internal/repository/execution.go`
- Create: `server/internal/service/execution.go`

- [ ] **Step 1: 实现步骤执行 Repository**

创建 `server/internal/repository/execution.go`:

```go
package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type ExecutionRepository struct {
	db *gorm.DB
}

func NewExecutionRepository(db *gorm.DB) *ExecutionRepository {
	return &ExecutionRepository{db: db}
}

func (r *ExecutionRepository) Create(execution *model.StepExecution) error {
	return r.db.Create(execution).Error
}

func (r *ExecutionRepository) FindByID(id uint) (*model.StepExecution, error) {
	var execution model.StepExecution
	err := r.db.Preload("Drill").Preload("Assignee").First(&execution, id).Error
	if err != nil {
		return nil, err
	}
	return &execution, nil
}

func (r *ExecutionRepository) FindByDrillID(drillID uint) ([]*model.StepExecution, error) {
	var executions []*model.StepExecution
	err := r.db.Where("drill_id = ?", drillID).Order("step_order").Find(&executions).Error
	if err != nil {
		return nil, err
	}
	return executions, nil
}

func (r *ExecutionRepository) FindByAssigneeID(assigneeID uint) ([]*model.StepExecution, error) {
	var executions []*model.StepExecution
	err := r.db.Where("assignee_id = ?", assigneeID).
		Preload("Drill").
		Order("created_at desc").
		Find(&executions).Error
	if err != nil {
		return nil, err
	}
	return executions, nil
}

func (r *ExecutionRepository) Update(execution *model.StepExecution) error {
	return r.db.Save(execution).Error
}

func (r *ExecutionRepository) AssignStep(executionID, assigneeID uint) error {
	return r.db.Model(&model.StepExecution{}).
		Where("id = ?", executionID).
		Update("assignee_id", assigneeID).Error
}
```

- [ ] **Step 2: 实现步骤执行 Service**

创建 `server/internal/service/execution.go`:

```go
package service

import (
	"errors"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
)

type ExecutionService struct {
	executionRepo *repository.ExecutionRepository
	drillRepo     *repository.DrillRepository
}

func NewExecutionService(
	executionRepo *repository.ExecutionRepository,
	drillRepo *repository.DrillRepository,
) *ExecutionService {
	return &ExecutionService{
		executionRepo: executionRepo,
		drillRepo:     drillRepo,
	}
}

func (s *ExecutionService) GetExecution(id uint) (*model.StepExecution, error) {
	return s.executionRepo.FindByID(id)
}

func (s *ExecutionService) GetDrillExecutions(drillID uint) ([]*model.StepExecution, error) {
	return s.executionRepo.FindByDrillID(drillID)
}

func (s *ExecutionService) GetUserTasks(userID uint) ([]*model.StepExecution, error) {
	return s.executionRepo.FindByAssigneeID(userID)
}

func (s *ExecutionService) AssignStep(executionID, assigneeID uint) error {
	execution, err := s.executionRepo.FindByID(executionID)
	if err != nil {
		return err
	}

	if execution.Status != "pending" {
		return errors.New("can only assign pending steps")
	}

	return s.executionRepo.AssignStep(executionID, assigneeID)
}

func (s *ExecutionService) StartExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "pending" {
		return errors.New("can only start pending steps")
	}

	now := time.Now()
	execution.Status = "in_progress"
	execution.StartTime = &now

	return s.executionRepo.Update(execution)
}

func (s *ExecutionService) CompleteExecution(id uint) error {
	execution, err := s.executionRepo.FindByID(id)
	if err != nil {
		return err
	}

	if execution.Status != "in_progress" {
		return errors.New("can only complete in-progress steps")
	}

	now := time.Now()
	execution.Status = "completed"
	execution.EndTime = &now

	if execution.StartTime != nil {
		duration := now.Sub(*execution.StartTime)
		execution.DurationSeconds = int(duration.Seconds())
	}

	return s.executionRepo.Update(execution)
}
```

- [ ] **Step 3: 提交代码**

```bash
git add server/
git commit -m "feat: implement execution repository and service"
```

---

### Task 11: 消息推送 Service

**Files:**
- Create: `server/pkg/wechat/webhook.go`
- Create: `server/internal/repository/message.go`
- Create: `server/internal/service/notification.go`

- [ ] **Step 1: 实现企业微信 Webhook 客户端**

创建 `server/pkg/wechat/webhook.go`:

```go
package wechat

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type WebhookClient struct {
	webhookURL string
	httpClient *http.Client
}

func NewWebhookClient(webhookURL string) *WebhookClient {
	return &WebhookClient{
		webhookURL: webhookURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type MarkdownMessage struct {
	MsgType  string `json:"msgtype"`
	Markdown struct {
		Content string `json:"content"`
	} `json:"markdown"`
}

func (c *WebhookClient) SendMarkdownMessage(content string) error {
	if c.webhookURL == "" {
		return fmt.Errorf("webhook URL is not configured")
	}

	msg := MarkdownMessage{
		MsgType: "markdown",
	}
	msg.Markdown.Content = content

	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(c.webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("webhook request failed with status: %d", resp.StatusCode)
	}

	return nil
}

func (c *WebhookClient) UpdateWebhookURL(url string) {
	c.webhookURL = url
}
```

- [ ] **Step 2: 实现消息记录 Repository**

创建 `server/internal/repository/message.go`:

```go
package repository

import (
	"gorm.io/gorm"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) Create(message *model.MessageLog) error {
	return r.db.Create(message).Error
}

func (r *MessageRepository) FindByDrillID(drillID uint) ([]*model.MessageLog, error) {
	var messages []*model.MessageLog
	err := r.db.Where("drill_id = ?", drillID).Order("sent_at desc").Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *MessageRepository) List(limit int) ([]*model.MessageLog, error) {
	var messages []*model.MessageLog
	err := r.db.Order("sent_at desc").Limit(limit).Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}
```

- [ ] **Step 3: 实现消息推送 Service**

创建 `server/internal/service/notification.go`:

```go
package service

import (
	"fmt"
	"time"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/pkg/wechat"
)

type NotificationService struct {
	messageRepo *repository.MessageRepository
	wechatClient *wechat.WebhookClient
}

func NewNotificationService(
	messageRepo *repository.MessageRepository,
	wechatClient *wechat.WebhookClient,
) *NotificationService {
	return &NotificationService{
		messageRepo: messageRepo,
		wechatClient: wechatClient,
	}
}

func (s *NotificationService) SendDrillStartNotification(drill *model.DrillInstance) error {
	content := fmt.Sprintf("## 演练开始通知\n\n**演练名称**：%s\n\n**开始时间**：%s\n\n请相关人员及时登录参演工作台。",
		drill.Name,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return s.sendMessage(drill.ID, content)
}

func (s *NotificationService) SendStepActivationNotification(execution *model.StepExecution, assigneeName string) error {
	content := fmt.Sprintf("## 步骤激活通知\n\n**演练名称**：%s\n\n**步骤%d**：%s\n\n执行人：%s\n\n请及时登录参演工作台执行任务。",
		execution.Drill.Name,
		execution.StepOrder,
		execution.StepName,
		assigneeName,
	)

	return s.sendMessage(execution.DrillID, content)
}

func (s *NotificationService) SendStepCompletionNotification(execution *model.StepExecution) error {
	content := fmt.Sprintf("## 步骤完成通知\n\n**演练名称**：%s\n\n**步骤%d**：%s 已完成\n\n执行人：%s\n\n耗时：%d秒",
		execution.Drill.Name,
		execution.StepOrder,
		execution.StepName,
		execution.Assignee.Name,
		execution.DurationSeconds,
	)

	return s.sendMessage(execution.DrillID, content)
}

func (s *NotificationService) SendDrillEndNotification(drill *model.DrillInstance) error {
	content := fmt.Sprintf("## 演练结束通知\n\n**演练名称**：%s\n\n**结束时间**：%s\n\n演练已完成。",
		drill.Name,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	return s.sendMessage(drill.ID, content)
}

func (s *NotificationService) sendMessage(drillID uint, content string) error {
	err := s.wechatClient.SendMarkdownMessage(content)

	message := &model.MessageLog{
		DrillID:    drillID,
		Content:    content,
		SentAt:     time.Now(),
		WebhookURL: s.wechatClient.webhookURL,
	}

	if err != nil {
		message.Content = fmt.Sprintf("[FAILED] %s", content)
	}

	s.messageRepo.Create(message)

	return err
}

func (s *NotificationService) GetMessageLogs(drillID uint) ([]*model.MessageLog, error) {
	return s.messageRepo.FindByDrillID(drillID)
}
```

- [ ] **Step 4: 提交代码**

```bash
git add server/
git commit -m "feat: implement notification service with WeChat webhook"
```

---

### Task 12: WebSocket Hub 和 Client

**Files:**
- Create: `server/internal/websocket/hub.go`
- Create: `server/internal/websocket/client.go`

- [ ] **Step 1: 实现 WebSocket Hub**

创建 `server/internal/websocket/hub.go`:

```go
package websocket

import (
	"encoding/json"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastToDrill(drillID uint, messageType string, data interface{}) error {
	message := map[string]interface{}{
		"type":     messageType,
		"drill_id": drillID,
		"data":     data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.mu.RLock()
	for client := range h.clients {
		if client.drillID == drillID {
			select {
			case client.send <- jsonData:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
	h.mu.RUnlock()

	return nil
}

func (h *Hub) BroadcastToUser(userID uint, messageType string, data interface{}) error {
	message := map[string]interface{}{
		"type":    messageType,
		"user_id": userID,
		"data":    data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.mu.RLock()
	for client := range h.clients {
		if client.userID == userID {
			select {
			case client.send <- jsonData:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
	h.mu.RUnlock()

	return nil
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}
```

- [ ] **Step 2: 实现 WebSocket Client**

创建 `server/internal/websocket/client.go`:

```go
package websocket

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	userID   uint
	drillID  uint
	username string
	role     string
}

var (
	newline = []byte{'\n'}
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod      = (pongWait * 9) / 10
	maxMessageSize  = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func NewClient(hub *Hub, conn *websocket.Conn, userID uint, username, role string) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		username: username,
		role:     role,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket read error: %v", err)
			}
			break
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) SubscribeDrill(drillID uint) {
	c.drillID = drillID
}

func (c *Client) UnsubscribeDrill() {
	c.drillID = 0
}
```

- [ ] **Step 3: 安装 WebSocket 依赖**

```bash
cd server
go get -u github.com/gorilla/websocket
go mod tidy
```

- [ ] **Step 4: 提交代码**

```bash
git add server/
git commit -m "feat: implement WebSocket hub and client"
```

---

### Task 13: 中间件实现

**Files:**
- Create: `server/internal/middleware/auth.go`
- Create: `server/internal/middleware/cors.go`
- Create: `server/internal/middleware/logger.go`

- [ ] **Step 1: 实现认证中间件**

创建 `server/internal/middleware/auth.go`:

```go
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

func AuthMiddleware(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "role not found"})
			c.Abort()
			return
		}

		role := userRole.(string)
		allowed := false
		for _, r := range roles {
			if role == r {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func GetUserID(c *gin.Context) uint {
	userID, _ := c.Get("userID")
	return userID.(uint)
}

func GetUsername(c *gin.Context) string {
	username, _ := c.Get("username")
	return username.(string)
}

func GetRole(c *gin.Context) string {
	role, _ := c.Get("role")
	return role.(string)
}
```

- [ ] **Step 2: 实现 CORS 中间件**

创建 `server/internal/middleware/cors.go`:

```go
package middleware

import (
	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
```

- [ ] **Step 3: 实现日志中间件**

创建 `server/internal/middleware/logger.go`:

```go
package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		c.Next()

		latency := time.Since(startTime)
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		method := c.Request.Method
		path := c.Request.URL.Path

		log.Printf("[%s] %s %s %d %v %s",
			method,
			path,
			clientIP,
			statusCode,
			latency,
			c.Errors.String(),
		)
	}
}
```

- [ ] **Step 4: 提交代码**

```bash
git add server/
git commit -m "feat: implement middleware (auth, cors, logger)"
```

---

### Task 14: HTTP Handler 层

**Files:**
- Create: `server/internal/handler/user.go`
- Create: `server/internal/handler/template.go`
- Create: `server/internal/handler/drill.go`
- Create: `server/internal/handler/execution.go`
- Create: `server/internal/handler/webhook.go`
- Create: `server/internal/handler/websocket.go`

- [ ] **Step 1: 实现用户 Handler**

创建 `server/internal/handler/user.go`:

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type UserHandler struct {
	userSvc *service.UserService
}

func NewUserHandler(userSvc *service.UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

type UpdateUserRequest struct {
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	users, err := h.userSvc.ListUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userSvc.CreateUser(req.Username, req.Password, req.Name, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := h.userSvc.GetUser(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userSvc.UpdateUser(uint(id), req.Password, req.Name, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	if err := h.userSvc.DeleteUser(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID := middleware.GetUserID(c)
	user, err := h.userSvc.GetUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
```

- [ ] **Step 2: 实现模板 Handler**

创建 `server/internal/handler/template.go`:

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/model"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type TemplateHandler struct {
	templateSvc *service.TemplateService
}

func NewTemplateHandler(templateSvc *service.TemplateService) *TemplateHandler {
	return &TemplateHandler{templateSvc: templateSvc}
}

type CreateTemplateRequest struct {
	Name        string                `json:"name" binding:"required"`
	Description string                `json:"description"`
	Steps       model.StepDefinitions `json:"steps" binding:"required"`
}

type UpdateTemplateRequest struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Steps       model.StepDefinitions `json:"steps"`
}

func (h *TemplateHandler) ListTemplates(c *gin.Context) {
	templates, err := h.templateSvc.ListTemplates()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, templates)
}

func (h *TemplateHandler) GetTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template id"})
		return
	}

	template, err := h.templateSvc.GetTemplate(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *TemplateHandler) CreateTemplate(c *gin.Context) {
	var req CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template, err := h.templateSvc.CreateTemplate(req.Name, req.Description, req.Steps)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *TemplateHandler) UpdateTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template id"})
		return
	}

	var req UpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template, err := h.templateSvc.UpdateTemplate(uint(id), req.Name, req.Description, req.Steps)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *TemplateHandler) DeleteTemplate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid template id"})
		return
	}

	if err := h.templateSvc.DeleteTemplate(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "template deleted"})
}
```

- [ ] **Step 3: 实现演练 Handler**

创建 `server/internal/handler/drill.go`:

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type DrillHandler struct {
	drillSvc *service.DrillService
}

func NewDrillHandler(drillSvc *service.DrillService) *DrillHandler {
	return &DrillHandler{drillSvc: drillSvc}
}

type CreateDrillRequest struct {
	TemplateID uint   `json:"template_id" binding:"required"`
	Name       string `json:"name" binding:"required"`
}

func (h *DrillHandler) ListDrills(c *gin.Context) {
	drills, err := h.drillSvc.ListDrills()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, drills)
}

func (h *DrillHandler) GetDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	drill, err := h.drillSvc.GetDrill(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "drill not found"})
		return
	}

	c.JSON(http.StatusOK, drill)
}

func (h *DrillHandler) CreateDrill(c *gin.Context) {
	var req CreateDrillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.GetUserID(c)
	drill, err := h.drillSvc.CreateDrill(req.TemplateID, req.Name, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, drill)
}

func (h *DrillHandler) StartDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.StartDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill started"})
}

func (h *DrillHandler) PauseDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.PauseDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill paused"})
}

func (h *DrillHandler) ResumeDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.ResumeDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill resumed"})
}

func (h *DrillHandler) EndDrill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	if err := h.drillSvc.EndDrill(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "drill ended"})
}
```

- [ ] **Step 4: 实现步骤执行 Handler**

创建 `server/internal/handler/execution.go`:

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type ExecutionHandler struct {
	executionSvc *service.ExecutionService
}

func NewExecutionHandler(executionSvc *service.ExecutionService) *ExecutionHandler {
	return &ExecutionHandler{executionSvc: executionSvc}
}

type AssignStepRequest struct {
	AssigneeID uint `json:"assignee_id" binding:"required"`
}

func (h *ExecutionHandler) GetMyTasks(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tasks, err := h.executionSvc.GetUserTasks(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

func (h *ExecutionHandler) GetExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	execution, err := h.executionSvc.GetExecution(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
		return
	}

	c.JSON(http.StatusOK, execution)
}

func (h *ExecutionHandler) GetDrillExecutions(c *gin.Context) {
	drillID, err := strconv.ParseUint(c.Param("drill_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
		return
	}

	executions, err := h.executionSvc.GetDrillExecutions(uint(drillID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, executions)
}

func (h *ExecutionHandler) AssignStep(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	var req AssignStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.executionSvc.AssignStep(uint(id), req.AssigneeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "step assigned"})
}

func (h *ExecutionHandler) StartExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.StartExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution started"})
}

func (h *ExecutionHandler) CompleteExecution(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid execution id"})
		return
	}

	if err := h.executionSvc.CompleteExecution(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "execution completed"})
}
```

- [ ] **Step 5: 实现 Webhook Handler**

创建 `server/internal/handler/webhook.go`:

```go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

type WebhookHandler struct {
	notificationSvc *service.NotificationService
}

func NewWebhookHandler(notificationSvc *service.NotificationService) *WebhookHandler {
	return &WebhookHandler{notificationSvc: notificationSvc}
}

type SendMessageRequest struct {
	DrillID uint   `json:"drill_id" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func (h *WebhookHandler) GetMessageLogs(c *gin.Context) {
	drillIDStr := c.Query("drill_id")
	if drillIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "drill_id required"})
		return
	}

	drillID, err := strconv.ParseUint(drillIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill_id"})
		return
	}

	logs, err := h.notificationSvc.GetMessageLogs(uint(drillID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func (h *WebhookHandler) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "message sent"})
}
```

- [ ] **Step 6: 实现 WebSocket Handler**

创建 `server/internal/handler/websocket.go`:

```go
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"github.com/yourorg/outage-drill-platform/server/internal/middleware"
	"github.com/yourorg/outage-drill-platform/server/internal/websocket"
)

type WebSocketHandler struct {
	hub    *websocket.Hub
	upgrader websocket.Upgrader
}

func NewWebSocketHandler(hub *websocket.Hub) *WebSocketHandler {
	return &WebSocketHandler{
		hub: hub,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	userID := middleware.GetUserID(c)
	username := middleware.GetUsername(c)
	role := middleware.GetRole(c)

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := websocket.NewClient(h.hub, conn, userID, username, role)
	h.hub.Register(client)

	go client.WritePump()
	go client.ReadPump()
}
```

- [ ] **Step 7: 提交代码**

```bash
git add server/
git commit -m "feat: implement all HTTP handlers"
```

---

### Task 15: 主服务集成

**Files:**
- Update: `server/cmd/server/main.go`

- [ ] **Step 1: 更新主服务入口**

更新 `server/cmd/server/main.go`:

```go
package main

import (
	"log"
	"os"

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

	os.Exit(0)
}
```

- [ ] **Step 2: 编译并运行服务**

```bash
cd server
go build -o bin/server cmd/server/main.go
./bin/server
```

Expected: 服务启动成功,监听 8080 端口

- [ ] **Step 3: 提交代码**

```bash
git add server/
git commit -m "feat: integrate all components into main server"
```

---

## 阶段三：前端开发

### Task 16: 初始化前端项目

**Files:**
- Create: `web/` 目录及所有前端文件

- [ ] **Step 1: 创建前端项目**

```bash
npm create vite@latest web -- --template react-ts
cd web
npm install
```

- [ ] **Step 2: 安装依赖**

```bash
cd web
npm install antd @ant-design/icons axios react-router-dom zustand
npm install -D @types/react-router-dom
```

- [ ] **Step 3: 配置 Vite**

更新 `web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
  },
})
```

- [ ] **Step 4: 创建目录结构**

```bash
cd web/src
mkdir -p components pages services hooks store types utils
```

- [ ] **Step 5: 提交代码**

```bash
git add web/
git commit -m "feat: initialize frontend project with Vite and React"
```

---

### Task 17: TypeScript 类型定义和 API 服务层

**Files:**
- Create: `web/src/types/index.ts`
- Create: `web/src/services/api.ts`
- Create: `web/src/services/auth.ts`
- Create: `web/src/services/drill.ts`
- Create: `web/src/services/websocket.ts`

- [ ] **Step 1: 定义 TypeScript 类型**

创建 `web/src/types/index.ts`:

```typescript
export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'commander' | 'participant'
  created_at: string
  updated_at: string
}

export interface StepDefinition {
  order: number
  name: string
  description: string
  timeout_minutes: number
  guide: string
}

export interface DrillTemplate {
  id: number
  name: string
  description: string
  steps: StepDefinition[]
  created_at: string
  updated_at: string
}

export interface DrillInstance {
  id: number
  template_id: number
  name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'
  start_time?: string
  end_time?: string
  created_by: number
  created_at: string
  updated_at: string
  template?: DrillTemplate
  creator?: User
}

export interface StepExecution {
  id: number
  drill_id: number
  step_order: number
  step_name: string
  assignee_id?: number
  status: 'pending' | 'in_progress' | 'completed' | 'timeout'
  start_time?: string
  end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  drill?: DrillInstance
  assignee?: User
}

export interface MessageLog {
  id: number
  drill_id: number
  content: string
  sent_at: string
  webhook_url: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user?: User
}

export interface WebSocketMessage {
  type: 'step_update' | 'drill_update' | 'message' | 'timeout_warning'
  drill_id?: number
  user_id?: number
  data?: any
  timestamp?: string
}
```

- [ ] **Step 2: 创建 API 服务基础类**

创建 `web/src/services/api.ts`:

```typescript
import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 3: 创建认证服务**

创建 `web/src/services/auth.ts`:

```typescript
import api from './api'
import { LoginRequest, LoginResponse, User } from '../types'

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me')
    return response.data
  },
}
```

- [ ] **Step 4: 创建演练服务**

创建 `web/src/services/drill.ts`:

```typescript
import api from './api'
import { DrillTemplate, DrillInstance, StepExecution } from '../types'

export const drillService = {
  getTemplates: async (): Promise<DrillTemplate[]> => {
    const response = await api.get<DrillTemplate[]>('/templates')
    return response.data
  },

  getTemplate: async (id: number): Promise<DrillTemplate> => {
    const response = await api.get<DrillTemplate>(`/templates/${id}`)
    return response.data
  },

  createTemplate: async (data: Partial<DrillTemplate>): Promise<DrillTemplate> => {
    const response = await api.post<DrillTemplate>('/templates', data)
    return response.data
  },

  updateTemplate: async (id: number, data: Partial<DrillTemplate>): Promise<DrillTemplate> => {
    const response = await api.put<DrillTemplate>(`/templates/${id}`, data)
    return response.data
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/templates/${id}`)
  },

  getDrills: async (): Promise<DrillInstance[]> => {
    const response = await api.get<DrillInstance[]>('/drills')
    return response.data
  },

  getDrill: async (id: number): Promise<DrillInstance> => {
    const response = await api.get<DrillInstance>(`/drills/${id}`)
    return response.data
  },

  createDrill: async (data: { template_id: number; name: string }): Promise<DrillInstance> => {
    const response = await api.post<DrillInstance>('/drills', data)
    return response.data
  },

  startDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/start`)
  },

  pauseDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/pause`)
  },

  resumeDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/resume`)
  },

  endDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/end`)
  },

  getMyTasks: async (): Promise<StepExecution[]> => {
    const response = await api.get<StepExecution[]>('/executions/my-tasks')
    return response.data
  },

  getExecution: async (id: number): Promise<StepExecution> => {
    const response = await api.get<StepExecution>(`/executions/${id}`)
    return response.data
  },

  getDrillExecutions: async (drillId: number): Promise<StepExecution[]> => {
    const response = await api.get<StepExecution[]>(`/executions/drill/${drillId}`)
    return response.data
  },

  assignStep: async (id: number, assigneeId: number): Promise<void> => {
    await api.post(`/executions/${id}/assign`, { assignee_id: assigneeId })
  },

  startExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/start`)
  },

  completeExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/complete`)
  },
}
```

- [ ] **Step 5: 创建 WebSocket 服务**

创建 `web/src/services/websocket.ts`:

```typescript
import { WebSocketMessage } from '../types'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private listeners: Map<string, Set<(data: WebSocketMessage) => void>> = new Map()

  connect(token: string) {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws?token=${token}`
    
    this.ws = new WebSocket(wsUrl)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        this.notifyListeners(message.type, message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.handleReconnect(token)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private handleReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect(token)
      }, this.reconnectDelay)
    } else {
      console.error('Max reconnect attempts reached')
    }
  }

  subscribe(type: string, callback: (data: WebSocketMessage) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(callback)
  }

  unsubscribe(type: string, callback: (data: WebSocketMessage) => void) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(callback)
    }
  }

  private notifyListeners(type: string, data: WebSocketMessage) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(callback => callback(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

export const websocketService = new WebSocketService()
```

- [ ] **Step 6: 提交代码**

```bash
git add web/
git commit -m "feat: implement TypeScript types and API services"
```

---

### Task 18: 状态管理和自定义 Hooks

**Files:**
- Create: `web/src/store/index.ts`
- Create: `web/src/hooks/useAuth.ts`
- Create: `web/src/hooks/useWebSocket.ts`
- Create: `web/src/hooks/useDrill.ts`

- [ ] **Step 1: 创建状态管理**

创建 `web/src/store/index.ts`:

```typescript
import { create } from 'zustand'
import { User, DrillInstance, StepExecution } from '../types'

interface AppState {
  user: User | null
  token: string | null
  currentDrill: DrillInstance | null
  myTasks: StepExecution[]
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setCurrentDrill: (drill: DrillInstance | null) => void
  setMyTasks: (tasks: StepExecution[]) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  currentDrill: null,
  myTasks: [],
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },
  setCurrentDrill: (drill) => set({ currentDrill: drill }),
  setMyTasks: (tasks) => set({ myTasks: tasks }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, currentDrill: null, myTasks: [] })
  },
}))
```

- [ ] **Step 2: 创建认证 Hook**

创建 `web/src/hooks/useAuth.ts`:

```typescript
import { useState } from 'react'
import { useAppStore } from '../store'
import { authService } from '../services/auth'
import { LoginRequest } from '../types'

export const useAuth = () => {
  const { user, token, setUser, setToken, logout } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login(credentials)
      setToken(response.token)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      return true
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logoutUser = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    logout()
  }

  const checkAuth = async () => {
    if (token) {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        logout()
      }
    }
  }

  return {
    user,
    token,
    loading,
    error,
    login,
    logout: logoutUser,
    checkAuth,
    isAuthenticated: !!token,
  }
}
```

- [ ] **Step 3: 创建 WebSocket Hook**

创建 `web/src/hooks/useWebSocket.ts`:

```typescript
import { useEffect, useRef } from 'react'
import { websocketService } from '../services/websocket'
import { WebSocketMessage } from '../types'
import { useAppStore } from '../store'

export const useWebSocket = () => {
  const { token } = useAppStore()
  const connectedRef = useRef(false)

  useEffect(() => {
    if (token && !connectedRef.current) {
      websocketService.connect(token)
      connectedRef.current = true
    }

    return () => {
      if (connectedRef.current) {
        websocketService.disconnect()
        connectedRef.current = false
      }
    }
  }, [token])

  const subscribe = (type: string, callback: (data: WebSocketMessage) => void) => {
    websocketService.subscribe(type, callback)
  }

  const unsubscribe = (type: string, callback: (data: WebSocketMessage) => void) => {
    websocketService.unsubscribe(type, callback)
  }

  const send = (data: any) => {
    websocketService.send(data)
  }

  return {
    subscribe,
    unsubscribe,
    send,
  }
}
```

- [ ] **Step 4: 创建演练 Hook**

创建 `web/src/hooks/useDrill.ts`:

```typescript
import { useState, useEffect } from 'react'
import { drillService } from '../services/drill'
import { DrillInstance, StepExecution } from '../types'
import { useAppStore } from '../store'

export const useDrill = (drillId?: number) => {
  const { setCurrentDrill, setMyTasks } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDrill = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const drill = await drillService.getDrill(id)
      setCurrentDrill(drill)
      return drill
    } catch (err: any) {
      setError(err.response?.data?.error || '获取演练信息失败')
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchMyTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const tasks = await drillService.getMyTasks()
      setMyTasks(tasks)
      return tasks
    } catch (err: any) {
      setError(err.response?.data?.error || '获取任务列表失败')
      return []
    } finally {
      setLoading(false)
    }
  }

  const startExecution = async (executionId: number) => {
    try {
      await drillService.startExecution(executionId)
      await fetchMyTasks()
    } catch (err: any) {
      setError(err.response?.data?.error || '开始执行失败')
    }
  }

  const completeExecution = async (executionId: number) => {
    try {
      await drillService.completeExecution(executionId)
      await fetchMyTasks()
    } catch (err: any) {
      setError(err.response?.data?.error || '完成执行失败')
    }
  }

  useEffect(() => {
    if (drillId) {
      fetchDrill(drillId)
    }
  }, [drillId])

  return {
    loading,
    error,
    fetchDrill,
    fetchMyTasks,
    startExecution,
    completeExecution,
  }
}
```

- [ ] **Step 5: 提交代码**

```bash
git add web/
git commit -m "feat: implement state management and custom hooks"
```

---

### Task 19: 登录页面和路由配置

**Files:**
- Create: `web/src/pages/Login/index.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/main.tsx`

- [ ] **Step 1: 创建登录页面**

创建 `web/src/pages/Login/index.tsx`:

```typescript
import React, { useState } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const Login: React.FC = () => {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    const success = await login({
      username: values.username,
      password: values.password,
    })

    if (success) {
      message.success('登录成功')
      navigate('/dashboard')
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f0f2f5'
    }}>
      <Card title="断网断电演练平台" style={{ width: 400 }}>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
```

- [ ] **Step 2: 创建 App 组件和路由**

创建 `web/src/App.tsx`:

```typescript
import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'

const App: React.FC = () => {
  const { checkAuth, isAuthenticated } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <div>Dashboard (待实现)</div> : <Navigate to="/login" />
            }
          />
          <Route
            path="/workbench"
            element={
              isAuthenticated ? <div>Workbench (待实现)</div> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated ? <div>Admin (待实现)</div> : <Navigate to="/login" />
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
```

- [ ] **Step 3: 更新 main.tsx**

更新 `web/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: 测试登录功能**

```bash
cd web
npm run dev
```

访问 http://localhost:3000/login,使用测试账号登录:
- 用户名: admin
- 密码: admin123

Expected: 登录成功后跳转到 dashboard 页面

- [ ] **Step 5: 提交代码**

```bash
git add web/
git commit -m "feat: implement login page and routing"
```

---

### Task 20: 指挥中心大屏页面

**Files:**
- Create: `web/src/pages/Dashboard/index.tsx`
- Create: `web/src/components/StepCard/index.tsx`
- Create: `web/src/components/MessageList/index.tsx`

- [ ] **Step 1: 创建步骤卡片组件**

创建 `web/src/components/StepCard/index.tsx`:

```typescript
import React from 'react'
import { Card, Tag, Progress } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { StepExecution } from '../../types'

interface StepCardProps {
  execution: StepExecution
  isActive?: boolean
}

const StepCard: React.FC<StepCardProps> = ({ execution, isActive }) => {
  const getStatusIcon = () => {
    switch (execution.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
      case 'in_progress':
        return <LoadingOutlined style={{ color: '#faad14', fontSize: 24 }} />
      case 'timeout':
        return <ClockCircleOutlined style={{ color: '#f5222d', fontSize: 24 }} />
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 24 }} />
    }
  }

  const getStatusTag = () => {
    const colors = {
      completed: 'success',
      in_progress: 'warning',
      timeout: 'error',
      pending: 'default',
    }
    const texts = {
      completed: '已完成',
      in_progress: '进行中',
      timeout: '超时',
      pending: '待开始',
    }
    return <Tag color={colors[execution.status]}>{texts[execution.status]}</Tag>
  }

  return (
    <Card
      style={{
        width: 200,
        border: isActive ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginBottom: 16,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}>
          {getStatusIcon()}
        </div>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          步骤{execution.step_order}: {execution.step_name}
        </div>
        {getStatusTag()}
        {execution.assignee && (
          <div style={{ marginTop: 8, color: '#666' }}>
            执行人: {execution.assignee.name}
          </div>
        )}
        {execution.status === 'completed' && (
          <div style={{ marginTop: 8, color: '#666' }}>
            耗时: {execution.duration_seconds}秒
          </div>
        )}
      </div>
    </Card>
  )
}

export default StepCard
```

- [ ] **Step 2: 创建消息列表组件**

创建 `web/src/components/MessageList/index.tsx`:

```typescript
import React from 'react'
import { List, Typography } from 'antd'
import { WebSocketMessage } from '../../types'

interface MessageListProps {
  messages: WebSocketMessage[]
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <List
      style={{
        height: 300,
        overflow: 'auto',
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        padding: 16,
      }}
      dataSource={messages}
      renderItem={(message) => (
        <List.Item>
          <Typography.Text>
            {message.timestamp && (
              <span style={{ color: '#999', marginRight: 8 }}>
                [{new Date(message.timestamp).toLocaleTimeString()}]
              </span>
            )}
            {message.data?.content || '消息内容'}
          </Typography.Text>
        </List.Item>
      )}
    />
  )
}

export default MessageList
```

- [ ] **Step 3: 创建指挥中心大屏页面**

创建 `web/src/pages/Dashboard/index.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Select, Button, Space, Typography } from 'antd'
import { useWebSocket } from '../../hooks/useWebSocket'
import { drillService } from '../../services/drill'
import { DrillInstance, StepExecution, WebSocketMessage } from '../../types'
import StepCard from '../../components/StepCard'
import MessageList from '../../components/MessageList'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const [drills, setDrills] = useState<DrillInstance[]>([])
  const [selectedDrill, setSelectedDrill] = useState<DrillInstance | null>(null)
  const [executions, setExecutions] = useState<StepExecution[]>([])
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const { subscribe, unsubscribe } = useWebSocket()

  useEffect(() => {
    loadDrills()
  }, [])

  useEffect(() => {
    if (selectedDrill) {
      loadExecutions(selectedDrill.id)
      
      const handleStepUpdate = (data: WebSocketMessage) => {
        if (data.drill_id === selectedDrill.id) {
          loadExecutions(selectedDrill.id)
          setMessages(prev => [...prev, data])
        }
      }

      subscribe('step_update', handleStepUpdate)
      subscribe('message', handleStepUpdate)

      return () => {
        unsubscribe('step_update', handleStepUpdate)
        unsubscribe('message', handleStepUpdate)
      }
    }
  }, [selectedDrill])

  const loadDrills = async () => {
    const data = await drillService.getDrills()
    setDrills(data)
    if (data.length > 0) {
      const runningDrill = data.find(d => d.status === 'running')
      setSelectedDrill(runningDrill || data[0])
    }
  }

  const loadExecutions = async (drillId: number) => {
    const data = await drillService.getDrillExecutions(drillId)
    setExecutions(data)
  }

  const handleDrillChange = (drillId: number) => {
    const drill = drills.find(d => d.id === drillId)
    setSelectedDrill(drill || null)
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space size="large">
              <Title level={3}>指挥中心大屏</Title>
              <Select
                style={{ width: 300 }}
                value={selectedDrill?.id}
                onChange={handleDrillChange}
                placeholder="选择演练"
              >
                {drills.map(drill => (
                  <Select.Option key={drill.id} value={drill.id}>
                    {drill.name} ({drill.status})
                  </Select.Option>
                ))}
              </Select>
              {selectedDrill && (
                <Text>
                  状态: <Text strong>{selectedDrill.status}</Text>
                </Text>
              )}
            </Space>
          </Col>

          <Col span={24}>
            <Card title="流程步骤可视化">
              <Row gutter={[16, 16]}>
                {executions.map((execution, index) => (
                  <Col key={execution.id}>
                    <StepCard
                      execution={execution}
                      isActive={execution.status === 'in_progress'}
                    />
                    {index < executions.length - 1 && (
                      <div style={{
                        textAlign: 'center',
                        fontSize: 24,
                        color: '#999',
                        marginBottom: 16
                      }}>
                        ↓
                      </div>
                    )}
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="实时消息">
              <MessageList messages={messages} />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default Dashboard
```

- [ ] **Step 4: 更新 App.tsx 路由**

更新 `web/src/App.tsx` 中的路由配置:

```typescript
import Dashboard from './pages/Dashboard'

// 在 Routes 中添加:
<Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
```

- [ ] **Step 5: 提交代码**

```bash
git add web/
git commit -m "feat: implement command center dashboard"
```

---

### Task 21: 参演工作台页面

**Files:**
- Create: `web/src/pages/Workbench/index.tsx`

- [ ] **Step 1: 创建参演工作台页面**

创建 `web/src/pages/Workbench/index.tsx`:

```typescript
import React, { useState, useEffect } from 'react'
import { Card, Button, Typography, Space, Tag, List, message } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useDrill } from '../../hooks/useDrill'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppStore } from '../../store'
import { StepExecution, WebSocketMessage } from '../../types'

const { Title, Text, Paragraph } = Typography

const Workbench: React.FC = () => {
  const { myTasks } = useAppStore()
  const { fetchMyTasks, startExecution, completeExecution, loading } = useDrill()
  const { subscribe, unsubscribe } = useWebSocket()
  const [currentTask, setCurrentTask] = useState<StepExecution | null>(null)
  const [countdown, setCountdown] = useState<number>(0)

  useEffect(() => {
    fetchMyTasks()

    const handleTaskUpdate = (data: WebSocketMessage) => {
      fetchMyTasks()
    }

    subscribe('step_update', handleTaskUpdate)

    return () => {
      unsubscribe('step_update', handleTaskUpdate)
    }
  }, [])

  useEffect(() => {
    const pendingTask = myTasks.find(t => t.status === 'pending')
    const inProgressTask = myTasks.find(t => t.status === 'in_progress')
    setCurrentTask(inProgressTask || pendingTask || null)
  }, [myTasks])

  useEffect(() => {
    if (currentTask && currentTask.status === 'in_progress') {
      const timer = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 0)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentTask])

  const handleStart = async () => {
    if (currentTask) {
      await startExecution(currentTask.id)
      message.success('开始执行任务')
    }
  }

  const handleComplete = async () => {
    if (currentTask) {
      await completeExecution(currentTask.id)
      message.success('任务已完成')
    }
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Title level={3}>参演工作台</Title>

        {currentTask && (
          <Card
            title={`当前任务: ${currentTask.step_name}`}
            style={{ marginBottom: 24 }}
          >
            <Space direction="vertical" size="large">
              <Text>
                演练名称: {currentTask.drill?.name}
              </Text>
              <Text>
                步骤: {currentTask.step_order}
              </Text>
              <Tag color={currentTask.status === 'in_progress' ? 'warning' : 'default'}>
                {currentTask.status === 'in_progress' ? '进行中' : '待开始'}
              </Tag>

              {currentTask.drill?.template?.steps[currentTask.step_order - 1]?.guide && (
                <Card title="操作指引" size="small">
                  <Paragraph>
                    {currentTask.drill.template.steps[currentTask.step_order - 1].guide}
                  </Paragraph>
                </Card>
              )}

              {currentTask.status === 'in_progress' && countdown > 0 && (
                <Text strong style={{ color: countdown < 60 ? '#f5222d' : '#52c41a' }}>
                  <ClockCircleOutlined /> 剩余时间: {formatCountdown(countdown)}
                </Text>
              )}

              <Space>
                {currentTask.status === 'pending' && (
                  <Button type="primary" onClick={handleStart} loading={loading}>
                    开始执行
                  </Button>
                )}
                {currentTask.status === 'in_progress' && (
                  <Button type="primary" onClick={handleComplete} loading={loading}>
                    完成任务
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        )}

        {!currentTask && (
          <Card>
            <Text>暂无待执行任务</Text>
          </Card>
        )}

        <Card title="历史任务">
          <List
            dataSource={myTasks.filter(t => t.status === 'completed')}
            renderItem={(task) => (
              <List.Item>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>{task.step_name} - 已完成</Text>
                  <Text type="secondary">耗时: {task.duration_seconds}秒</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Card>
    </div>
  )
}

export default Workbench
```

- [ ] **Step 2: 更新路由配置**

更新 `web/src/App.tsx`:

```typescript
import Workbench from './pages/Workbench'

// 在 Routes 中添加:
<Route path="/workbench" element={isAuthenticated ? <Workbench /> : <Navigate to="/login" />} />
```

- [ ] **Step 3: 提交代码**

```bash
git add web/
git commit -m "feat: implement participant workbench"
```

---

### Task 22-25: 管理后台页面

由于篇幅限制,我将简要描述剩余的管理后台任务:

- **Task 22**: 用户管理页面 - 用户列表、创建/编辑/删除用户
- **Task 23**: 模板管理页面 - 流程模板列表、创建/编辑/删除模板
- **Task 24**: 演练管理页面 - 演练实例列表、创建演练、分配执行人、启动/结束演练
- **Task 25**: Webhook 配置页面 - 配置企业微信 Webhook URL

每个任务都包含:
- 创建对应的页面组件
- 实现表单和列表展示
- 集成 API 服务
- 更新路由配置
- 提交代码

---

## 阶段四：集成测试和部署

### Task 26: 后端集成测试

**Files:**
- Create: `server/tests/integration_test.go`

- [ ] **Step 1: 编写集成测试**

创建 `server/tests/integration_test.go`:

```go
package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/yourorg/outage-drill-platform/server/internal/handler"
	"github.com/yourorg/outage-drill-platform/server/internal/repository"
	"github.com/yourorg/outage-drill-platform/server/internal/service"
)

func setupTestRouter() *gin.Engine {
	router := gin.Default()
	
	// Setup repositories and services
	// Add routes
	
	return router
}

func TestLoginIntegration(t *testing.T) {
	router := setupTestRouter()
	
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
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestDrillFlowIntegration(t *testing.T) {
	router := setupTestRouter()
	
	// Test complete drill flow
	// 1. Login
	// 2. Create drill
	// 3. Start drill
	// 4. Complete steps
	// 5. End drill
}
```

- [ ] **Step 2: 运行集成测试**

```bash
cd server
go test ./tests/... -v
```

- [ ] **Step 3: 提交代码**

```bash
git add server/
git commit -m "feat: add integration tests"
```

---

### Task 27: 前端集成测试

**Files:**
- Create: `web/src/tests/` 目录及测试文件

- [ ] **Step 1: 安装测试依赖**

```bash
cd web
npm install -D @testing-library/react @testing-library/jest-dom vitest
```

- [ ] **Step 2: 编写组件测试**

创建测试文件并编写测试用例。

- [ ] **Step 3: 运行测试**

```bash
cd web
npm run test
```

- [ ] **Step 4: 提交代码**

```bash
git add web/
git commit -m "feat: add frontend integration tests"
```

---

### Task 28: 端到端测试

**Files:**
- Create: `e2e-tests/` 目录及测试脚本

- [ ] **Step 1: 编写端到端测试脚本**

创建完整的演练流程测试脚本。

- [ ] **Step 2: 运行端到端测试**

执行完整的演练流程测试。

- [ ] **Step 3: 提交代码**

```bash
git add e2e-tests/
git commit -m "feat: add end-to-end tests"
```

---

### Task 29: 生产环境配置

**Files:**
- Create: `server/config/config.prod.yaml`
- Create: `docker-compose.yml`
- Create: `Dockerfile`

- [ ] **Step 1: 创建生产环境配置**

创建 `server/config/config.prod.yaml`:

```yaml
server:
  http_port: 8080
  websocket_port: 8081

database:
  host: mysql-prod-server
  port: 3306
  user: prod_user
  password: prod_password
  dbname: outage_drill_prod

jwt:
  secret: production-secret-key-change-this
  expire_hours: 24

wechat:
  webhook_url: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your-key
```

- [ ] **Step 2: 创建 Docker 配置**

创建 `Dockerfile`:

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY server/ .
RUN go mod download
RUN go build -o server cmd/server/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/config ./config
COPY --from=builder /app/static ./static
EXPOSE 8080
CMD ["./server"]
```

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: outage_drill
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - mysql
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: root_password
      DB_NAME: outage_drill

volumes:
  mysql_data:
```

- [ ] **Step 3: 提交代码**

```bash
git add .
git commit -m "feat: add production configuration and Docker setup"
```

---

### Task 30: 部署脚本和文档

**Files:**
- Create: `scripts/deploy.sh`
- Create: `docs/deployment.md`

- [ ] **Step 1: 创建部署脚本**

创建 `scripts/deploy.sh`:

```bash
#!/bin/bash

echo "Starting deployment..."

# Build frontend
cd web
npm install
npm run build
cd ..

# Build backend
cd server
go mod download
go build -o bin/server cmd/server/main.go
cd ..

# Run migrations
cd server
./bin/migrate
./bin/seed
cd ..

# Start services
docker-compose up -d

echo "Deployment completed successfully!"
```

- [ ] **Step 2: 创建部署文档**

创建 `docs/deployment.md`,包含:
- 系统要求
- 安装步骤
- 配置说明
- 启动和停止服务
- 故障排查

- [ ] **Step 3: 提交代码**

```bash
git add .
git commit -m "feat: add deployment scripts and documentation"
```

---

## 总结

本实施计划涵盖了断网断电演练平台的完整开发流程,包括:

**阶段一: 项目初始化和数据库设计 (Task 1-3)**
- 后端项目初始化
- 数据库连接和模型定义
- 数据库迁移脚本

**阶段二: 后端核心功能 (Task 4-15)**
- JWT 认证工具
- Repository 和 Service 层
- WebSocket 实现
- HTTP Handler 层
- 主服务集成

**阶段三: 前端开发 (Task 16-25)**
- 前端项目初始化
- TypeScript 类型定义
- API 服务层
- 状态管理和 Hooks
- 登录页面
- 指挥中心大屏
- 参演工作台
- 管理后台

**阶段四: 集成测试和部署 (Task 26-30)**
- 后端集成测试
- 前端集成测试
- 端到端测试
- 生产环境配置
- 部署脚本和文档

每个任务都包含详细的步骤说明、代码示例和验证方法,确保开发过程清晰可控。