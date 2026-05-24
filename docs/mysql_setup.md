# MySQL 启动和配置指南

## 问题诊断

您遇到的错误:
```
dial tcp [::1]:3306: connect: connection refused
```

这表示MySQL服务没有运行。以下是解决方案。

---

## 解决方案

### 方案 1: 使用 Homebrew 启动 MySQL (macOS)

```bash
# 检查MySQL状态
brew services list

# 启动MySQL服务
brew services start mysql

# 如果遇到权限问题,手动启动
mysql.server start

# 或者直接运行MySQL
mysqld_safe &
```

### 方案 2: 手动启动 MySQL

```bash
# 查找MySQL安装位置
which mysql
which mysqld

# macOS Homebrew安装的MySQL
/usr/local/opt/mysql/bin/mysqld_safe &

# 或使用mysql.server
/usr/local/opt/mysql/bin/mysql.server start

# Linux系统
sudo systemctl start mysql
# 或
sudo service mysql start
```

### 方案 3: 检查MySQL配置

```bash
# 查找MySQL配置文件
mysql --help | grep "Default options"

# 检查MySQL是否监听3306端口
netstat -an | grep 3306
# 或
lsof -i :3306
```

---

## 验证MySQL是否运行

```bash
# 测试连接
mysql -u root -p

# 如果能连接,说明MySQL已运行
# 在MySQL命令行中执行:
SHOW VARIABLES LIKE 'port';
# 应显示: port | 3306
```

---

## 创建数据库

一旦MySQL运行,创建项目数据库:

```bash
# 登录MySQL
mysql -u root -p

# 在MySQL命令行中执行:
CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户(可选)
CREATE USER 'drill_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON outage_drill.* TO 'drill_user'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

---

## 更新项目配置

编辑 `server/config/config.yaml`:

```yaml
database:
  host: localhost
  port: 3306
  user: root          # 或 drill_user
  password: your_password  # 替换为实际密码
  dbname: outage_drill
```

---

## 常见问题

### 问题 1: MySQL未安装

**解决方案**:
```bash
# macOS
brew install mysql

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install mysql-server

# Linux (CentOS/RHEL)
sudo yum install mysql-server
```

### 问题 2: 权限问题

**解决方案**:
```bash
# macOS: 给予MySQL目录权限
sudo chown -R $(whoami) /usr/local/var/mysql

# Linux: 检查MySQL服务权限
sudo systemctl status mysql
```

### 问题 3: 端口被占用

**解决方案**:
```bash
# 查找占用3306端口的进程
lsof -i :3306

# 终止进程
kill -9 <PID>

# 或更改MySQL端口(编辑my.cnf)
```

### 问题 4: MySQL配置文件错误

**解决方案**:
```bash
# 查找配置文件位置
mysql --help | grep "my.cnf"

# 检查配置
cat /etc/my.cnf
# 或
cat ~/.my.cnf
```

---

## 快速启动脚本

创建一个启动MySQL的脚本:

```bash
#!/bin/bash
# 文件: scripts/start_mysql.sh

echo "启动MySQL..."

# macOS Homebrew
if command -v brew &> /dev/null; then
    brew services start mysql || mysql.server start
fi

# Linux
if command -v systemctl &> /dev/null; then
    sudo systemctl start mysql
fi

# 等待MySQL启动
sleep 3

# 验证连接
if mysql -u root -p -e "SELECT 1;" &> /dev/null; then
    echo "✅ MySQL已启动"
else
    echo "❌ MySQL启动失败"
    echo "请手动启动MySQL服务"
fi
```

---

## 使用Docker运行MySQL(推荐)

如果本地MySQL启动困难,可以使用Docker:

```bash
# 启动MySQL容器
docker run -d \
  --name mysql-drill \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=outage_drill \
  -p 3306:3306 \
  mysql:8.0

# 查看容器状态
docker ps

# 连接到容器中的MySQL
docker exec -it mysql-drill mysql -u root -p

# 更新配置文件
# database:
#   host: localhost
#   port: 3306
#   user: root
#   password: root_password
#   dbname: outage_drill
```

---

## 下一步

1. **启动MySQL服务** (选择上述方案之一)
2. **创建数据库** (执行CREATE DATABASE命令)
3. **更新配置文件** (编辑config.yaml)
4. **运行迁移脚本**:
   ```bash
   cd server
   go run scripts/migrate.go
   go run scripts/seed.go
   ```
5. **启动应用**:
   ```bash
   go run cmd/server/main.go
   ```

---

## 验证步骤

```bash
# 1. 检查MySQL运行
ps aux | grep mysql
# 或
brew services list | grep mysql

# 2. 测试连接
mysql -u root -p -e "SELECT VERSION();"

# 3. 检查数据库
mysql -u root -p -e "SHOW DATABASES LIKE 'outage_drill';"

# 4. 检查表
mysql -u root -p outage_drill -e "SHOW TABLES;"
```

---

## 获取帮助

如果仍有问题:
1. 查看MySQL错误日志: `/usr/local/var/mysql/*.err`
2. 检查系统日志: `tail -f /var/log/syslog`
3. 使用Docker方案(最简单)
4. 查看QUICKSTART.md获取更多帮助