# 断网断电演练平台部署文档

## 目录

1. [系统要求](#系统要求)
2. [安装步骤](#安装步骤)
3. [配置说明](#配置说明)
4. [启动和停止服务](#启动和停止服务)
5. [生产环境部署](#生产环境部署)
6. [故障排查](#故障排查)
7. [维护和更新](#维护和更新)

---

## 系统要求

### 硬件要求

- **CPU**: 2核及以上
- **内存**: 4GB及以上
- **磁盘**: 20GB及以上

### 软件要求

- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+), macOS, Windows 10+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (用于前端构建)
- **Go**: 1.21+ (用于后端构建)
- **MySQL**: 8.0+

---

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourorg/outage-drill-platform.git
cd outage-drill-platform
```

### 2. 安装依赖

#### 安装 Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# CentOS/RHEL
sudo yum install docker docker-compose

# macOS
brew install docker docker-compose
```

#### 安装 Node.js

```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm

# macOS
brew install node

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

#### 安装 Go

```bash
# Ubuntu/Debian
sudo apt-get install golang-go

# macOS
brew install go

# 或从官网下载
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

### 3. 配置环境

```bash
# 复制配置文件模板
cp server/config/config.yaml server/config/config.prod.yaml

# 编辑生产环境配置
vim server/config/config.prod.yaml
```

### 4. 运行部署脚本

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh production
```

---

## 配置说明

### 后端配置文件 (server/config/config.yaml)

```yaml
server:
  http_port: 8080          # HTTP 服务端口
  websocket_port: 8081     # WebSocket 服务端口

database:
  host: localhost          # 数据库主机
  port: 3306               # 数据库端口
  user: root               # 数据库用户
  password: your_password  # 数据库密码
  dbname: outage_drill     # 数据库名称

jwt:
  secret: your-secret-key  # JWT 密钥（生产环境必须修改）
  expire_hours: 24         # Token 有效期（小时）

wechat:
  webhook_url: ""          # 企业微信 Webhook URL
```

### 生产环境配置要点

1. **JWT Secret**: 必须使用强密码，建议至少32位随机字符串
2. **数据库密码**: 使用强密码，避免使用默认值
3. **企业微信 Webhook**: 配置正确的 Webhook URL
4. **端口**: 根据实际情况调整端口配置

### Docker Compose 配置

`docker-compose.yml` 文件定义了以下服务：

- **mysql**: MySQL 数据库服务
- **app**: 应用服务
- **nginx**: 反向代理服务（可选）

### Nginx 配置

`nginx.conf` 文件配置了：

- HTTP 和 HTTPS 支持
- WebSocket 代理
- 静态资源缓存
- Gzip 压缩

---

## 启动和停止服务

### 启动服务

```bash
# 使用 Docker Compose 启动
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart app
```

---

## 生产环境部署

### 1. SSL 配置

#### 生成 SSL 证书

```bash
# 创建 SSL 目录
mkdir -p ssl

# 使用 Let's Encrypt (推荐)
sudo apt-get install certbot
certbot certonly --standalone -d your-domain.com

# 或生成自签名证书（仅用于测试）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem
```

#### 配置 Nginx

将证书文件放置到 `ssl/` 目录，并修改 `nginx.conf` 中的证书路径。

### 2. 数据库备份

```bash
# 创建备份脚本
cat > scripts/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec outage-drill-mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} outage_drill > ${BACKUP_DIR}/outage_drill_${DATE}.sql
EOF

chmod +x scripts/backup_db.sh

# 设置定时备份
crontab -e
# 添加: 0 2 * * * /path/to/scripts/backup_db.sh
```

### 3. 监控配置

#### 使用 Prometheus + Grafana

```yaml
# 在 docker-compose.yml 中添加
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  depends_on:
    - prometheus
```

### 4. 日志管理

```bash
# 配置日志轮转
cat > /etc/logrotate.d/outage-drill << 'EOF'
/var/log/outage-drill/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
EOF
```

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 查看服务日志
docker-compose logs app

# 检查端口占用
netstat -tulpn | grep 8080

# 检查 Docker 网络
docker network ls
docker network inspect outage-drill-network
```

#### 2. 数据库连接失败

```bash
# 检查 MySQL 服务状态
docker-compose ps mysql

# 测试数据库连接
docker exec -it outage-drill-mysql mysql -u root -p

# 检查数据库配置
cat server/config/config.prod.yaml
```

#### 3. WebSocket 连接失败

```bash
# 检查 WebSocket 端口
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8080/api/ws

# 检查 Nginx WebSocket 配置
cat nginx.conf | grep -A 10 "location /ws"
```

#### 4. 前端无法访问

```bash
# 检查静态文件
ls -la server/static/

# 检查 Nginx 配置
docker exec outage-drill-nginx nginx -t

# 重新构建前端
cd web && npm run build
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs app
docker-compose logs mysql
docker-compose logs nginx

# 实时查看日志
docker-compose logs -f app
```

---

## 维护和更新

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新部署
./scripts/deploy.sh production
```

### 数据库迁移

```bash
# 运行迁移脚本
cd server
go run scripts/migrate.go

# 运行数据填充
go run scripts/seed.go
```

### 清理和重置

```bash
# 清理 Docker 资源
docker-compose down -v
docker system prune -a

# 重新部署
./scripts/deploy.sh production
```

### 性能优化

#### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_drill_status ON drill_instances(status);
CREATE INDEX idx_execution_assignee ON step_executions(assignee_id);
CREATE INDEX idx_execution_drill ON step_executions(drill_id);

-- 配置参数
SET GLOBAL innodb_buffer_pool_size = 1073741824;
SET GLOBAL max_connections = 200;
```

#### 2. 应用优化

```yaml
# 在 docker-compose.yml 中调整资源限制
app:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

---

## 安全建议

### 1. 网络安全

- 使用 HTTPS
- 配置防火墙规则
- 限制数据库访问

### 2. 应用安全

- 定期更新依赖
- 使用强密码
- 启用访问日志

### 3. 数据安全

- 定期备份数据
- 使用加密存储
- 配置访问控制

---

## 联系支持

如有问题，请联系：

- **技术支持**: support@yourorg.com
- **文档更新**: docs@yourorg.com
- **问题反馈**: https://github.com/yourorg/outage-drill-platform/issues