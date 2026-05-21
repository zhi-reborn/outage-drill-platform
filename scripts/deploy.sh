#!/bin/bash

set -e

DEPLOY_ENV=${1:-"production"}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "========================================="
echo "断网断电演练平台部署脚本"
echo "部署环境: $DEPLOY_ENV"
echo "========================================="
echo ""

echo "步骤 1: 检查依赖"
echo "-----------------------------------------"

if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装"
  echo "请先安装 Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose 未安装"
  echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js 未安装"
  echo "请先安装 Node.js: https://nodejs.org/"
  exit 1
fi

if ! command -v go &> /dev/null; then
  echo "❌ Go 未安装"
  echo "请先安装 Go: https://golang.org/doc/install"
  exit 1
fi

echo "✅ 所有依赖已安装"

echo ""
echo "步骤 2: 构建前端"
echo "-----------------------------------------"

cd "${PROJECT_ROOT}/web"

echo "安装前端依赖..."
npm install

echo "构建前端应用..."
npm run build

echo "✅ 前端构建完成"

echo ""
echo "步骤 3: 构建后端"
echo "-----------------------------------------"

cd "${PROJECT_ROOT}/server"

echo "下载 Go 依赖..."
go mod download

echo "构建后端应用..."
go build -o bin/server cmd/server/main.go

echo "✅ 后端构建完成"

echo ""
echo "步骤 4: 数据库迁移"
echo "-----------------------------------------"

cd "${PROJECT_ROOT}/server"

if [ "$DEPLOY_ENV" = "production" ]; then
  CONFIG_FILE="config/config.prod.yaml"
else
  CONFIG_FILE="config/config.yaml"
fi

echo "运行数据库迁移..."
go run scripts/migrate.go

echo "运行数据填充..."
go run scripts/seed.go

echo "✅ 数据库迁移完成"

echo ""
echo "步骤 5: 配置检查"
echo "-----------------------------------------"

if [ "$DEPLOY_ENV" = "production" ]; then
  if [ ! -f "${PROJECT_ROOT}/server/config/config.prod.yaml" ]; then
    echo "❌ 生产环境配置文件不存在"
    exit 1
  fi
  
  echo "检查生产环境配置..."
  
  JWT_SECRET=$(grep "secret:" "${PROJECT_ROOT}/server/config/config.prod.yaml" | awk '{print $2}')
  if [ "$JWT_SECRET" = "production-secret-key-change-this-in-production" ]; then
    echo "⚠️  警告: JWT Secret 使用默认值，请在生产环境中修改"
  fi
  
  DB_PASSWORD=$(grep "password:" "${PROJECT_ROOT}/server/config/config.prod.yaml" | awk '{print $2}')
  if [ "$DB_PASSWORD" = "prod_password_change_this" ]; then
    echo "⚠️  警告: 数据库密码使用默认值，请在生产环境中修改"
  fi
fi

echo "✅ 配置检查完成"

echo ""
echo "步骤 6: 启动服务"
echo "-----------------------------------------"

cd "${PROJECT_ROOT}"

echo "停止现有服务..."
docker-compose down || true

echo "启动 Docker 服务..."
docker-compose up -d --build

echo "等待服务启动..."
sleep 10

echo "检查服务状态..."
docker-compose ps

echo ""
echo "步骤 7: 健康检查"
echo "-----------------------------------------"

MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:8080/api/auth/login > /dev/null 2>&1; then
    echo "✅ 服务健康检查通过"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "等待服务启动... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ 服务健康检查失败"
  echo ""
  echo "查看日志:"
  docker-compose logs app
  exit 1
fi

echo ""
echo "========================================="
echo "✅ 部署完成"
echo "========================================="
echo ""
echo "访问地址:"
echo "- HTTP: http://localhost"
echo "- HTTPS: https://localhost (需要配置 SSL)"
echo ""
echo "默认账号:"
echo "- 管理员: admin / admin123"
echo "- 指挥员: commander / commander123"
echo "- 参演人员: participant1 / participant123"
echo ""
echo "查看日志:"
echo "docker-compose logs -f"
echo ""
echo "停止服务:"
echo "docker-compose down"
echo ""