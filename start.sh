#!/bin/bash

echo "🚀 断网断电演练平台 - 一键启动脚本"
echo ""

# 检查依赖
echo "📋 检查系统依赖..."

check_command() {
    if command -v $1 &> /dev/null; then
        echo "✅ $1 已安装: $(command -v $1)"
        return 0
    else
        echo "❌ $1 未安装"
        return 1
    fi
}

DEPENDENCIES_OK=true

check_command "go" || DEPENDENCIES_OK=false
check_command "node" || DEPENDENCIES_OK=false
check_command "npm" || DEPENDENCIES_OK=false
check_command "mysql" || DEPENDENCIES_OK=false

if [ "$DEPENDENCIES_OK" = false ]; then
    echo ""
    echo "❌ 缺少必需的依赖,请先安装:"
    echo "   - Go 1.21+"
    echo "   - Node.js 18+"
    echo "   - MySQL 8.0+"
    echo ""
    echo "请查看 QUICKSTART.md 了解安装步骤"
    exit 1
fi

echo ""
echo "✅ 所有依赖已安装"
echo ""

# 检查数据库
echo "📊 检查数据库连接..."
if mysql -u root -p -e "USE outage_drill;" 2>/dev/null; then
    echo "✅ 数据库已存在"
else
    echo "⚠️  数据库不存在,需要创建"
    echo ""
    echo "请执行以下命令创建数据库:"
    echo "mysql -u root -p -e \"CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
    echo ""
    echo "然后编辑 server/config/config.yaml 设置数据库密码"
    echo ""
    read -p "数据库已创建并配置完成? (y/n): " db_ready
    if [ "$db_ready" != "y" ]; then
        echo "请先创建和配置数据库"
        exit 1
    fi
fi

echo ""

# 安装依赖
echo "📦 安装项目依赖..."

if [ ! -d "server/node_modules" ]; then
    echo "安装后端依赖..."
    cd server && go mod tidy && cd ..
fi

if [ ! -d "web/node_modules" ]; then
    echo "安装前端依赖..."
    cd web && npm install && cd ..
fi

echo "✅ 依赖安装完成"
echo ""

# 初始化数据库
echo "🔧 初始化数据库..."

read -p "是否需要初始化数据库(运行迁移和种子数据)? (y/n): " init_db

if [ "$init_db" = "y" ]; then
    echo "运行数据库迁移..."
    cd server && go run scripts/migrate.go && cd ..
    
    echo "填充初始数据..."
    cd server && go run scripts/seed.go && cd ..
    
    echo "✅ 数据库初始化完成"
fi

echo ""

# 启动服务
echo "🌟 启动服务..."
echo ""

echo "选择启动模式:"
echo "  1. 开发模式(推荐) - 前端热更新"
echo "  2. 生产模式 - 使用构建后的文件"
echo ""
read -p "请选择 (1/2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "启动后端服务..."
    cd server && go run cmd/server/main.go &
    BACKEND_PID=$!
    
    sleep 2
    
    echo "启动前端服务..."
    cd web && npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "✅ 服务启动成功!"
    echo ""
    echo "📍 访问地址:"
    echo "   前端: http://localhost:3000"
    echo "   后端: http://localhost:8080"
    echo ""
    echo "🔑 测试账号:"
    echo "   管理员: admin / admin123"
    echo "   指挥员: commander / commander123"
    echo "   参演人员: participant1 / participant123"
    echo ""
    echo "💡 提示:"
    echo "   - 按 Ctrl+C 停止服务"
    echo "   - 查看日志: 后端在终端输出,前端在浏览器控制台"
    echo ""
    
    # 等待用户中断
    trap "echo ''; echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT TERM
    
    wait
    
elif [ "$mode" = "2" ]; then
    echo ""
    echo "构建前端..."
    cd web && npm run build && cd ..
    
    echo "构建后端..."
    cd server && go build -o bin/server cmd/server/main.go && cd ..
    
    echo "启动服务..."
    cd server && ./bin/server &
    SERVER_PID=$!
    
    echo ""
    echo "✅ 服务启动成功!"
    echo ""
    echo "📍 访问地址: http://localhost:8080"
    echo ""
    echo "💡 提示:"
    echo "   - 按 Ctrl+C 停止服务"
    echo ""
    
    trap "echo ''; echo '停止服务...'; kill $SERVER_PID; exit 0" INT TERM
    
    wait
    
else
    echo "无效的选择"
    exit 1
fi