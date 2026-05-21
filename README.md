# 断网断电演练平台

一个完整的断网断电演练管理平台,用于管理灾备演练流程,支持实时状态同步和企业微信消息推送。

## 🎯 项目简介

当开启演练后,能在指挥中心的监控大屏上看到各个流程节点的状态,参演人员通过工作台执行任务,过程中将同步消息推送到企业微信群。

## ✨ 核心功能

- **指挥中心大屏**: 实时展示演练进度和流程状态
- **参演工作台**: 参演人员查看和执行任务
- **流程管理**: 创建演练、定义流程步骤、分配执行人
- **消息推送**: 企业微信群消息通知
- **用户管理**: 用户认证和权限管理
- **实时通信**: WebSocket 实时状态同步

## 🏗️ 技术架构

- **前端**: React 18 + TypeScript + Ant Design 5 + Vite
- **后端**: Go 1.21+ + Gin + GORM + WebSocket
- **数据库**: MySQL 8.0+
- **部署**: Docker + Docker Compose + Nginx

## 🚀 快速开始

### 详细启动步骤
请查看 **[QUICKSTART.md](QUICKSTART.md)** 获取完整的安装和启动指南。

### 最简启动流程

```bash
# 1. 安装依赖
cd server && go mod tidy
cd web && npm install

# 2. 配置数据库
mysql -u root -p -e "CREATE DATABASE outage_drill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 编辑 server/config/config.yaml 设置数据库密码

# 3. 初始化数据库
cd server
go run scripts/migrate.go
go run scripts/seed.go

# 4. 启动服务
# 后端
cd server && go run cmd/server/main.go

# 前端
cd web && npm run dev

# 5. 访问应用
# 打开浏览器: http://localhost:3000
```

### Docker 一键部署

```bash
docker-compose up -d
# 访问: http://localhost:8080
```

## 📖 文档

- **[快速启动指南](QUICKSTART.md)** - 详细的安装和启动步骤
- **[部署文档](docs/deployment.md)** - 生产环境部署指南
- **[设计文档](docs/superpowers/specs/2026-05-21-outage-drill-platform-design.md)** - 系统架构和设计
- **[实施计划](docs/superpowers/plans/2026-05-21-outage-drill-platform.md)** - 开发计划和任务

## 🔑 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 指挥员 | commander | commander123 |
| 参演人员 | participant1 | participant123 |
| 参演人员 | participant2 | participant123 |

## 📁 项目结构

```
outage-drill-platform/
├── server/          # Go 后端
│   ├── cmd/         # 主服务入口
│   ├── internal/    # 内部代码(handler, service, repository, model)
│   ├── pkg/         # 公共包(auth, wechat, db, config)
│   └── tests/       # 测试
├── web/             # React 前端
│   ├── src/
│   │   ├── pages/   # 页面组件
│   │   ├── services/# API 服务
│   │   ├── hooks/   # 自定义 Hooks
│   │   └── store/   # 状态管理
│   └── tests/       # 测试
├── e2e-tests/       # 端到端测试
├── docs/            # 文档
├── Dockerfile       # Docker 配置
└── docker-compose.yml # Docker Compose
```

## 🧪 运行测试

```bash
# 后端测试
cd server && go test ./... -v

# 前端测试
cd web && npm run test

# 端到端测试
cd e2e-tests && ./run_all_tests.sh
```

## 🛠️ 开发指南

### 后端开发
```bash
cd server
go run cmd/server/main.go  # 启动开发服务器
go test ./... -v           # 运行测试
```

### 前端开发
```bash
cd web
npm run dev     # 启动开发服务器(热更新)
npm run build   # 生产构建
npm run test    # 运行测试
```

## 📊 API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户管理
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 模板管理
- `GET /api/templates` - 获取模板列表
- `POST /api/templates` - 创建模板
- `PUT /api/templates/:id` - 更新模板
- `DELETE /api/templates/:id` - 删除模板

### 演练管理
- `GET /api/drills` - 获取演练列表
- `POST /api/drills` - 创建演练
- `POST /api/drills/:id/start` - 启动演练
- `POST /api/drills/:id/pause` - 暂停演练
- `POST /api/drills/:id/end` - 结束演练

### 步骤执行
- `GET /api/executions/my-tasks` - 获取我的任务
- `POST /api/executions/:id/start` - 开始执行
- `POST /api/executions/:id/complete` - 完成执行

### WebSocket
- `WS /api/ws` - WebSocket 连接

## 🔧 配置说明

### 后端配置 (server/config/config.yaml)
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
  secret: your-secret-key
  expire_hours: 24

wechat:
  webhook_url: ""
```

### 前端配置 (web/vite.config.ts)
- 开发服务器端口: 3000
- API 代理: http://localhost:8080
- WebSocket 代理: ws://localhost:8080

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t outage-drill-platform .

# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📝 更新日志

### v1.0.0 (2026-05-21)
- ✅ 完整的后端 API 实现
- ✅ React 前端界面
- ✅ WebSocket 实时通信
- ✅ 企业微信消息推送
- ✅ Docker 部署支持
- ✅ 完整的测试覆盖

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持

如有问题或建议,请:
1. 查看 [QUICKSTART.md](QUICKSTART.md)
2. 查看 [docs/deployment.md](docs/deployment.md)
3. 提交 Issue

---

**Made with ❤️ by Your Team**