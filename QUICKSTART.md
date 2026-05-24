# 断网断电演练平台 - 快速启动指南

本指南将帮助您快速启动和运行断网断电演练平台。

## ⚡ 快速解决MySQL连接问题

如果您遇到 `dial tcp [::1]:3306: connect: connection refused` 错误:

### 快速解决方案

```bash
# 方案1: 使用自动化脚本(推荐)
./scripts/setup_mysql.sh

# 方案2: 手动启动MySQL
# macOS
brew services start mysql || mysql.server start

# Linux
sudo systemctl start mysql

# 方案3: 使用Docker(最简单)
docker run -d --name mysql-drill \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=outage_drill \
  -p 3306:3306 mysql:8.0
```

详细说明请查看: [docs/mysql_setup.md](docs/mysql_setup.md)

---

## 📋 前置要求

### 必需软件
- **Go 1.21+** - 后端开发语言
- **Node.js 18+** - 前端开发环境
- **MySQL 8.0+** - 数据库
- **Git** - 版本控制

### 可选软件
- **Docker & Docker Compose** - 容器化部署
- **Make** - 构建工具(可选)

---

## 🚀 快速启动步骤

### 步骤 1: 安装依赖软件

#### macOS (使用 Homebrew)
```bash
# 安装 Go
brew install go

# 安装 Node.js
brew install node

# 安装 MySQL
brew install mysql
brew services start mysql
```

#### Linux (Ubuntu/Debian)
```bash
# 安装 Go
sudo apt update
sudo apt install golang-go

# 安装 Node.js
sudo apt install nodejs npm

# 安装 MySQL
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 验证安装
```bash
go version      # 应显示: go version go1.21.x
node --version  # 应显示: v18.x.x 或更高
npm --version   # 应显示: 9.x.x 或更高
mysql --version # 应显示: mysql Ver 8.0.x
```

---

### 步骤 2: 配置数据库

#### 创建数据库
```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 命令行中执行:
CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户(可选,推荐)
CREATE USER 'drill_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON outage_drill.* TO 'drill_user'@'localhost';
FLUSH PRIVILEGES;

# 退出 MySQL
EXIT;
```

#### 更新配置文件
编辑 `server/config/config.yaml`:
```yaml
database:
  host: localhost
  port: 3306
  user: drill_user        # 或使用 root
  password: your_password  # 替换为实际密码
  dbname: outage_drill
```

---

### 步骤 3: 安装项目依赖

#### 后端依赖
```bash
cd server
go mod tidy
```

#### 前端依赖
```bash
cd web
npm install
```

---

### 步骤 4: 初始化数据库

#### 运行数据库迁移
```bash
cd server
go run scripts/migrate.go
```

预期输出:
```
Running migrations...
Migrations completed successfully
```

#### 填充初始数据
```bash
go run scripts/seed.go
```

预期输出:
```
Seeding database...
Database seeded successfully
```

#### 验证数据
```bash
mysql -u drill_user -p outage_drill -e "SHOW TABLES; SELECT * FROM users; SELECT * FROM drill_templates;"
```

预期结果:
- 5 张表(users, drill_templates, drill_instances, step_executions, message_logs)
- 4 个测试用户
- 1 个演练模板

---

### 步骤 5: 启动后端服务

#### 开发模式
```bash
cd server
go run cmd/server/main.go
```

预期输出:
```
Starting server with config: HTTP=8080, WebSocket=8081
[GIN-debug] Listening and serving HTTP on :8080
```

#### 生产模式(编译后运行)
```bash
cd server
go build -o bin/server cmd/server/main.go
./bin/server
```

后端服务将在以下端口运行:
- **HTTP API**: http://localhost:8080
- **WebSocket**: ws://localhost:8080/api/ws

---

### 步骤 6: 启动前端服务

#### 开发模式(推荐)
```bash
cd web
npm run dev
```

预期输出:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

访问: http://localhost:3000

#### 生产模式(构建后)
```bash
cd web
npm run build
```

构建产物将输出到 `server/static/` 目录,可通过后端服务访问。

---

### 步骤 7: 访问应用

打开浏览器访问: **http://localhost:3000**

#### 测试账号
| 角色 | 用户名 | 密码 | 功能权限 |
|------|--------|------|----------|
| 管理员 | admin | admin123 | 所有功能 |
| 指挥员 | commander | commander123 | 创建/管理演练 |
| 参演人员 | participant1 | participant123 | 执行任务 |
| 参演人员 | participant2 | participant123 | 执行任务 |

#### 功能页面
- **登录页面**: http://localhost:3000/login
- **指挥中心大屏**: http://localhost:3000/dashboard
- **参演工作台**: http://localhost:3000/workbench
- **管理后台**: http://localhost:3000/admin

---

## 🐳 Docker 部署(可选)

### 使用 Docker Compose 一键部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

服务将在以下端口运行:
- **应用**: http://localhost:8080
- **MySQL**: localhost:3306

### Docker 服务说明
- **mysql**: MySQL 8.0 数据库
- **app**: Go 后端服务 + React 前端
- **nginx**: Nginx 反向代理(可选)

---

## 🧪 运行测试

### 后端测试
```bash
cd server

# 运行所有测试
go test ./... -v

# 运行特定测试
go test ./pkg/auth/... -v
go test ./internal/repository/... -v
go test ./internal/service/... -v
go test ./tests/... -v
```

### 前端测试
```bash
cd web

# 运行测试
npm run test

# 运行测试(带覆盖率)
npm run test:coverage
```

### 端到端测试
```bash
cd e2e-tests

# 运行所有测试
./run_all_tests.sh

# 运行特定测试
./drill_flow_test.sh
./api_test.sh
./websocket_test.sh
```

---

## 🔧 常见问题排查

### 问题 1: Go 命令找不到
**解决方案**:
```bash
# macOS
brew install go

# Linux
sudo apt install golang-go

# 或手动安装
# 下载: https://go.dev/dl/
# 配置 PATH: export PATH=$PATH:/usr/local/go/bin
```

### 问题 2: MySQL 连接失败
**解决方案**:
```bash
# 检查 MySQL 是否运行
# macOS
brew services list
brew services start mysql

# Linux
sudo systemctl status mysql
sudo systemctl start mysql

# 检查连接
mysql -u root -p -e "SELECT 1;"
```

### 问题 3: 前端依赖安装失败
**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题 4: 后端编译错误
**解决方案**:
```bash
# 更新依赖
cd server
go mod tidy
go mod download

# 检查 Go 版本
go version  # 需要 1.21+
```

### 问题 5: 端口被占用
**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :8080  # 后端端口
lsof -i :3000  # 前端端口

# 终止进程
kill -9 <PID>

# 或更改端口
# 后端: 编辑 server/config/config.yaml
# 前端: 编辑 web/vite.config.ts
```

---

## 📚 详细文档

- **部署文档**: [docs/deployment.md](docs/deployment.md)
- **设计文档**: [docs/superpowers/specs/2026-05-21-outage-drill-platform-design.md](docs/superpowers/specs/2026-05-21-outage-drill-platform-design.md)
- **实施计划**: [docs/superpowers/plans/2026-05-21-outage-drill-platform.md](docs/superpowers/plans/2026-05-21-outage-drill-platform.md)

---

## 🎯 下一步

1. **配置企业微信 Webhook**: 在管理后台配置 Webhook URL
2. **创建演练模板**: 定义演练流程和步骤
3. **创建演练实例**: 启动演练并分配执行人
4. **执行演练**: 参演人员在工作台执行任务
5. **监控进度**: 在指挥中心大屏实时查看进度

---

## 💡 提示

- 开发时建议使用 `npm run dev` 启动前端,支持热更新
- 生产环境建议使用 Docker 部署,更稳定可靠
- 定期备份数据库: `mysqldump -u root -p outage_drill > backup.sql`
- 查看日志排查问题: 后端日志在终端输出,前端日志在浏览器控制台

---

## 🆘 获取帮助

如有问题,请查看:
1. 本快速启动指南
2. 详细部署文档
3. 项目 README
4. 测试文件中的示例代码

祝您使用愉快! 🎊