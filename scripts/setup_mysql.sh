#!/bin/bash

echo "🔧 MySQL 启动和配置助手"
echo ""

# 检查MySQL是否已安装
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL未安装"
    echo ""
    echo "安装方法:"
    echo "  macOS: brew install mysql"
    echo "  Linux: sudo apt install mysql-server"
    echo ""
    exit 1
fi

echo "✅ MySQL已安装: $(mysql --version)"
echo ""

# 检查MySQL是否运行
echo "📊 检查MySQL服务状态..."

if brew services list 2>/dev/null | grep -q "mysql.*started"; then
    echo "✅ MySQL服务已启动 (Homebrew)"
elif systemctl is-active --quiet mysql 2>/dev/null; then
    echo "✅ MySQL服务已启动 (systemctl)"
elif pgrep -x mysqld > /dev/null; then
    echo "✅ MySQL进程已运行"
else
    echo "⚠️  MySQL未运行,尝试启动..."
    
    # 尝试多种启动方式
    STARTED=false
    
    # 方式1: Homebrew
    if command -v brew &> /dev/null; then
        echo "尝试使用Homebrew启动..."
        if brew services start mysql 2>/dev/null; then
            STARTED=true
            echo "✅ 使用Homebrew启动成功"
        fi
    fi
    
    # 方式2: mysql.server
    if [ "$STARTED" = false ] && command -v mysql.server &> /dev/null; then
        echo "尝试使用mysql.server启动..."
        if mysql.server start 2>/dev/null; then
            STARTED=true
            echo "✅ 使用mysql.server启动成功"
        fi
    fi
    
    # 方式3: systemctl
    if [ "$STARTED" = false ] && command -v systemctl &> /dev/null; then
        echo "尝试使用systemctl启动..."
        if sudo systemctl start mysql 2>/dev/null; then
            STARTED=true
            echo "✅ 使用systemctl启动成功"
        fi
    fi
    
    # 方式4: mysqld_safe
    if [ "$STARTED" = false ] && command -v mysqld_safe &> /dev/null; then
        echo "尝试使用mysqld_safe启动..."
        mysqld_safe &
        sleep 3
        if pgrep -x mysqld > /dev/null; then
            STARTED=true
            echo "✅ 使用mysqld_safe启动成功"
        fi
    fi
    
    if [ "$STARTED" = false ]; then
        echo ""
        echo "❌ 无法自动启动MySQL"
        echo ""
        echo "请手动启动MySQL:"
        echo "  macOS: brew services start mysql"
        echo "  或: mysql.server start"
        echo "  Linux: sudo systemctl start mysql"
        echo ""
        echo "或使用Docker:"
        echo "  docker run -d --name mysql-drill -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=outage_drill -p 3306:3306 mysql:8.0"
        echo ""
        exit 1
    fi
fi

echo ""

# 等待MySQL完全启动
echo "⏳ 等待MySQL完全启动..."
sleep 3

# 测试连接
echo "🔌 测试MySQL连接..."

# 尝试无密码连接
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ MySQL连接成功(无密码)"
    MYSQL_USER="root"
    MYSQL_PASS=""
elif mysql -u root -p -e "SELECT 1;" &> /dev/null; then
    echo "⚠️  MySQL需要密码"
    echo ""
    read -s -p "请输入MySQL root密码: " MYSQL_PASS
    echo ""
    
    if mysql -u root -p"$MYSQL_PASS" -e "SELECT 1;" &> /dev/null; then
        echo "✅ MySQL连接成功"
    else
        echo "❌ 密码错误或连接失败"
        exit 1
    fi
else
    echo "❌ MySQL连接失败"
    echo ""
    echo "可能的原因:"
    echo "  1. MySQL未完全启动"
    echo "  2. 需要密码但未提供"
    echo "  3. MySQL配置问题"
    echo ""
    exit 1
fi

echo ""

# 检查数据库
echo "📦 检查数据库..."

if mysql -u "$MYSQL_USER" ${MYSQL_PASS:-p"$MYSQL_PASS"} -e "USE outage_drill;" &> /dev/null; then
    echo "✅ 数据库 'outage_drill' 已存在"
else
    echo "⚠️  数据库不存在,需要创建"
    echo ""
    
    read -p "是否创建数据库? (y/n): " create_db
    
    if [ "$create_db" = "y" ]; then
        echo "创建数据库..."
        mysql -u "$MYSQL_USER" ${MYSQL_PASS:-p"$MYSQL_PASS"} -e "CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        
        if mysql -u "$MYSQL_USER" ${MYSQL_PASS:-p"$MYSQL_PASS"} -e "USE outage_drill;" &> /dev/null; then
            echo "✅ 数据库创建成功"
        else
            echo "❌ 数据库创建失败"
            exit 1
        fi
    else
        echo "请手动创建数据库:"
        echo "mysql -u root -p -e \"CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
        exit 1
    fi
fi

echo ""

# 检查表
echo "📋 检查数据库表..."

TABLE_COUNT=$(mysql -u "$MYSQL_USER" ${MYSQL_PASS:-p"$MYSQL_PASS"} outage_drill -e "SHOW TABLES;" 2>/dev/null | wc -l)

if [ "$TABLE_COUNT" -gt 1 ]; then
    echo "✅ 数据库表已存在 ($((TABLE_COUNT-1)) 张表)"
else
    echo "⚠️  数据库表不存在,需要运行迁移"
    echo ""
    
    read -p "是否运行数据库迁移? (y/n): " run_migrate
    
    if [ "$run_migrate" = "y" ]; then
        echo "运行迁移..."
        cd server && go run scripts/migrate.go && cd ..
        
        echo "填充初始数据..."
        cd server && go run scripts/seed.go && cd ..
        
        echo "✅ 数据库初始化完成"
    else
        echo "请手动运行迁移:"
        echo "cd server && go run scripts/migrate.go && go run scripts/seed.go"
    fi
fi

echo ""
echo "✅ MySQL配置完成!"
echo ""
echo "下一步:"
echo "  1. 更新 server/config/config.yaml 设置数据库密码"
echo "  2. 运行: cd server && go run cmd/server/main.go"
echo "  3. 运行: cd web && npm run dev"
echo ""