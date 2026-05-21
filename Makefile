.PHONY: help install init dev build test clean docker deploy

help:
	@echo "断网断电演练平台 - Makefile 命令帮助"
	@echo ""
	@echo "使用方法: make [命令]"
	@echo ""
	@echo "可用命令:"
	@echo "  help      - 显示此帮助信息"
	@echo "  install   - 安装所有依赖(后端+前端)"
	@echo "  init      - 初始化数据库(迁移+种子数据)"
	@echo "  dev       - 启动开发服务器(后端+前端)"
	@echo "  build     - 构建生产版本(后端+前端)"
	@echo "  test      - 运行所有测试"
	@echo "  clean     - 清理构建产物"
	@echo "  docker    - Docker 部署"
	@echo "  deploy    - 生产部署"
	@echo ""

install:
	@echo "安装后端依赖..."
	cd server && go mod tidy
	@echo "安装前端依赖..."
	cd web && npm install
	@echo "✅ 依赖安装完成"

init:
	@echo "创建数据库..."
	@echo "请手动执行: mysql -u root -p -e \"CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
	@echo ""
	@echo "运行数据库迁移..."
	cd server && go run scripts/migrate.go
	@echo "填充初始数据..."
	cd server && go run scripts/seed.go
	@echo "✅ 数据库初始化完成"

dev-backend:
	@echo "启动后端开发服务器..."
	cd server && go run cmd/server/main.go

dev-frontend:
	@echo "启动前端开发服务器..."
	cd web && npm run dev

dev:
	@echo "启动开发服务器..."
	@echo "后端: http://localhost:8080"
	@echo "前端: http://localhost:3000"
	@echo ""
	@make dev-backend & make dev-frontend

build-backend:
	@echo "构建后端..."
	cd server && go build -o bin/server cmd/server/main.go
	@echo "✅ 后端构建完成: server/bin/server"

build-frontend:
	@echo "构建前端..."
	cd web && npm run build
	@echo "✅ 前端构建完成: server/static/"

build:
	@make build-backend
	@make build-frontend
	@echo "✅ 所有构建完成"

test-backend:
	@echo "运行后端测试..."
	cd server && go test ./... -v

test-frontend:
	@echo "运行前端测试..."
	cd web && npm run test

test-e2e:
	@echo "运行端到端测试..."
	cd e2e-tests && ./run_all_tests.sh

test:
	@make test-backend
	@make test-frontend
	@echo "✅ 所有测试完成"

clean:
	@echo "清理构建产物..."
	rm -rf server/bin/
	rm -rf server/static/
	rm -rf web/node_modules/
	rm -rf web/dist/
	@echo "✅ 清理完成"

docker-build:
	@echo "构建 Docker 镜像..."
	docker build -t outage-drill-platform .
	@echo "✅ Docker 镜像构建完成"

docker-up:
	@echo "启动 Docker 服务..."
	docker-compose up -d
	@echo "✅ Docker 服务已启动"
	@echo "访问: http://localhost:8080"

docker-down:
	@echo "停止 Docker 服务..."
	docker-compose down
	@echo "✅ Docker 服务已停止"

docker-logs:
	@echo "查看 Docker 日志..."
	docker-compose logs -f

docker:
	@make docker-build
	@make docker-up
	@echo "✅ Docker 部署完成"

deploy:
	@echo "执行生产部署..."
	./scripts/deploy.sh
	@echo "✅ 生产部署完成"

db-backup:
	@echo "备份数据库..."
	mkdir -p backups
	mysqldump -u root -p outage_drill > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ 数据库备份完成"

db-restore:
	@echo "恢复数据库..."
	@echo "请指定备份文件: make db-restore FILE=backups/backup_xxx.sql"
	mysql -u root -p outage_drill < $(FILE)
	@echo "✅ 数据库恢复完成"

logs-backend:
	@echo "查看后端日志..."
	@echo "后端日志在终端输出,请查看运行 go run cmd/server/main.go 的终端"

logs-frontend:
	@echo "查看前端日志..."
	@echo "前端日志在浏览器控制台,请打开浏览器开发者工具"

check:
	@echo "检查系统环境..."
	@echo "Go 版本:"
	@go version || echo "❌ Go 未安装"
	@echo "Node.js 版本:"
	@node --version || echo "❌ Node.js 未安装"
	@echo "npm 版本:"
	@npm --version || echo "❌ npm 未安装"
	@echo "MySQL 版本:"
	@mysql --version || echo "❌ MySQL 未安装"
	@echo "Docker 版本:"
	@docker --version || echo "❌ Docker 未安装"
	@echo ""
	@echo "✅ 环境检查完成"

.DEFAULT_GOAL := help