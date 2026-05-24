# 问题修复总结

## 遇到的问题

### 问题1: MySQL连接失败
```
dial tcp [::1]:3306: connect: connection refused
```

**原因**: MySQL服务未启动

**解决方案**:
1. 使用自动化脚本: `./scripts/setup_mysql.sh`
2. 手动启动MySQL: `brew services start mysql`
3. 使用Docker: `docker run -d --name mysql-drill ...`

详细文档: [docs/mysql_setup.md](docs/mysql_setup.md)

---

### 问题2: WebSocket Handler代码错误
```
websocket redeclared in this block
undefined: websocket.Hub
assignment mismatch: 1 variable but websocket.NewClient returns 3 values
```

**原因**: 包导入冲突和参数错误

**修复内容**:
- 文件: `server/internal/handler/websocket.go`
- 使用包别名避免冲突: `gorillaWebSocket`
- 修正参数顺序和类型

**修复后的代码**:
```go
import (
    gorillaWebSocket "github.com/gorilla/websocket"
    "github.com/yourorg/outage-drill-platform/server/internal/websocket"
)

type WebSocketHandler struct {
    hub      *websocket.Hub
    upgrader gorillaWebSocket.Upgrader
}

client := websocket.NewClient(h.hub, conn, userID, username, role)
```

---

## 创建的辅助文档和脚本

### 1. MySQL配置指南
- **文件**: `docs/mysql_setup.md`
- **内容**: MySQL启动、配置、常见问题解决方案

### 2. MySQL自动化脚本
- **文件**: `scripts/setup_mysql.sh`
- **功能**: 
  - 检查MySQL安装和运行状态
  - 自动启动MySQL服务
  - 测试连接
  - 创建数据库
  - 运行迁移

### 3. 更新的快速启动指南
- **文件**: `QUICKSTART.md`
- **更新**: 添加MySQL问题快速解决方案

---

## 下一步操作

### 1. 启动MySQL
```bash
# 使用自动化脚本(推荐)
./scripts/setup_mysql.sh

# 或手动启动
brew services start mysql
```

### 2. 创建数据库
```bash
mysql -u root -p -e "CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. 更新配置
编辑 `server/config/config.yaml`:
```yaml
database:
  password: your_actual_password  # 替换为实际密码
```

### 4. 运行迁移
```bash
cd server
go run scripts/migrate.go
go run scripts/seed.go
```

### 5. 启动服务
```bash
# 后端
cd server && go run cmd/server/main.go

# 前端
cd web && npm run dev
```

---

## 验证修复

### 验证MySQL
```bash
# 检查MySQL状态
brew services list | grep mysql

# 测试连接
mysql -u root -p -e "SELECT 1;"

# 检查数据库
mysql -u root -p -e "SHOW DATABASES LIKE 'outage_drill';"
```

### 验证代码修复
```bash
# 编译后端
cd server
go build cmd/server/main.go

# 如果编译成功,说明WebSocket代码已修复
```

---

## 常见问题

### Q: MySQL启动失败怎么办?
**A**: 使用Docker方案最简单:
```bash
docker run -d --name mysql-drill \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=outage_drill \
  -p 3306:3306 mysql:8.0
```

### Q: 如何查看MySQL日志?
**A**: 
```bash
# macOS Homebrew
tail -f /usr/local/var/mysql/*.err

# Linux
tail -f /var/log/mysql/error.log
```

### Q: WebSocket还有其他错误?
**A**: 检查以下文件:
- `server/internal/websocket/hub.go`
- `server/internal/websocket/client.go`
- `server/internal/handler/websocket.go`

---

## 获取帮助

1. 查看 [QUICKSTART.md](QUICKSTART.md)
2. 查看 [docs/mysql_setup.md](docs/mysql_setup.md)
3. 查看 [README.md](README.md)
4. 运行 `./scripts/setup_mysql.sh` 自动化配置

---

**修复完成时间**: 2026-05-23
**状态**: ✅ 已修复