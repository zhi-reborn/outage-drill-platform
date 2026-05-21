# 断网断电演练平台设计文档

## 1. 项目概述

### 1.1 项目背景
构建一个断网断电演练平台，用于管理灾备演练流程。当开启演练后，能在指挥中心的监控大屏上看到各个流程节点的状态，参演人员通过工作台执行任务，过程中将同步消息推送到企业微信群。

### 1.2 核心功能
- 指挥中心大屏：实时展示演练进度和流程状态
- 参演工作台：参演人员查看和执行任务
- 流程管理：创建演练、定义流程步骤、分配执行人
- 消息推送：企业微信群消息通知
- 用户管理：用户认证和权限管理

### 1.3 技术栈
- 前端：React + Ant Design
- 后端：Go (单体服务，同时提供 HTTP API 和 WebSocket)
- 数据库：MySQL
- 消息推送：企业微信机器人 Webhook

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  指挥中心大屏  │  │  参演工作台   │  │  管理后台     │  │
│  │  (React)     │  │  (React)     │  │  (React)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Go Server (单体架构)                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  HTTP API (端口 8080)                            │   │
│  │  - 用户认证和授权                                 │   │
│  │  - 流程模板管理                                   │   │
│  │  - 演练实例管理                                   │   │
│  │  - 步骤执行和状态更新                             │   │
│  │  - 企业微信消息推送                               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  WebSocket (端口 8081)                           │   │
│  │  - 大屏实时数据推送                               │   │
│  │  - 工作台状态同步                                 │   │
│  │  - 演练进度实时更新                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                    ┌────────────────────────┐
                    │      MySQL 数据库       │
                    │  - 用户表               │
                    │  - 流程模板表           │
                    │  - 演练实例表           │
                    │  - 步骤执行记录表       │
                    └────────────────────────┘
                          │
                          ▼
                    ┌────────────────────────┐
                    │   企业微信 Webhook      │
                    │   - 群消息推送          │
                    └────────────────────────┘
```

### 2.2 单体服务架构

**Go Server (单个进程，监听两个端口)**
- HTTP API (端口 8080)：RESTful API 接口、用户认证、流程管理、步骤执行、消息推送
- WebSocket (端口 8081)：实时状态推送、大屏数据同步

**架构优势：**
- 部署简单：只需一个服务
- 开发效率高：HTTP API 和 WebSocket 共享内存和数据库连接
- 适合内部演练系统的规模

## 3. 数据模型

### 3.1 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password_hash | VARCHAR(255) | 密码哈希 |
| name | VARCHAR(100) | 姓名 |
| role | VARCHAR(20) | 角色（admin/commander/participant） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3.2 流程模板表 (drill_templates)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| name | VARCHAR(100) | 模板名称 |
| description | TEXT | 模板描述 |
| steps | JSON | 步骤定义 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**steps 字段格式：**
```json
[
  {
    "order": 1,
    "name": "应用降级",
    "description": "停止非核心服务",
    "timeout_minutes": 10,
    "guide": "①登录控制台 → ②执行降级脚本 → ③确认降级成功"
  }
]
```

### 3.3 演练实例表 (drill_instances)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| template_id | BIGINT | 关联模板 |
| name | VARCHAR(100) | 演练名称 |
| status | VARCHAR(20) | 状态（pending/running/paused/completed/cancelled） |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| created_by | BIGINT | 创建人 ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3.4 步骤执行记录表 (step_executions)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| drill_id | BIGINT | 关联演练实例 |
| step_order | INT | 步骤顺序 |
| step_name | VARCHAR(100) | 步骤名称 |
| assignee_id | BIGINT | 执行人 ID |
| status | VARCHAR(20) | 状态（pending/in_progress/completed/timeout） |
| start_time | TIMESTAMP | 开始时间 |
| end_time | TIMESTAMP | 结束时间 |
| duration_seconds | INT | 耗时（秒） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3.5 消息记录表 (message_logs)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| drill_id | BIGINT | 关联演练实例 |
| content | TEXT | 消息内容 |
| sent_at | TIMESTAMP | 发送时间 |
| webhook_url | VARCHAR(255) | Webhook 地址 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 4. 核心功能模块

### 4.1 用户管理模块

**功能：**
- 用户注册/登录
- 角色管理（管理员、指挥员、参演人员）
- 用户信息维护

**API 接口：**
```
POST   /api/auth/login          - 用户登录
POST   /api/auth/logout         - 用户登出
GET    /api/users               - 获取用户列表（管理员）
POST   /api/users               - 创建用户（管理员）
PUT    /api/users/:id           - 更新用户信息（管理员）
DELETE /api/users/:id           - 删除用户（管理员）
```

### 4.2 流程模板管理模块

**功能：**
- 创建/编辑/删除流程模板
- 定义步骤顺序、名称、超时时间、操作指引
- 为每个步骤分配默认执行人角色

**API 接口：**
```
GET    /api/templates           - 获取模板列表
GET    /api/templates/:id       - 获取模板详情
POST   /api/templates           - 创建模板（管理员）
PUT    /api/templates/:id       - 更新模板（管理员）
DELETE /api/templates/:id       - 删除模板（管理员）
```

### 4.3 演练实例管理模块

**功能：**
- 基于模板创建演练实例
- 启动/暂停/结束演练
- 为步骤分配具体执行人
- 查看演练进度和历史记录

**API 接口：**
```
GET    /api/drills              - 获取演练列表
GET    /api/drills/:id          - 获取演练详情
POST   /api/drills              - 创建演练（管理员/指挥员）
PUT    /api/drills/:id          - 更新演练信息
POST   /api/drills/:id/start    - 启动演练（管理员/指挥员）
POST   /api/drills/:id/pause    - 暂停演练（管理员/指挥员）
POST   /api/drills/:id/end      - 结束演练（管理员/指挥员）
```

### 4.4 步骤执行模块

**功能：**
- 参演人员查看当前待执行步骤
- 显示操作指引和倒计时
- 标记步骤完成
- 超时提醒

**API 接口：**
```
GET    /api/executions/my-tasks        - 获取我的待办任务
GET    /api/executions/:id             - 获取步骤执行详情
POST   /api/executions/:id/complete    - 完成步骤
POST   /api/executions/:id/start       - 开始执行步骤
```

### 4.5 消息推送模块

**功能：**
- 步骤状态变更时推送消息到企业微信群
- 超时预警推送
- 演练开始/结束通知

**API 接口：**
```
POST   /api/webhooks/send         - 手动发送消息（管理员）
GET    /api/webhooks/logs         - 获取消息发送记录
POST   /api/webhooks/config       - 配置 Webhook URL（管理员）
```

## 5. 前端页面设计

### 5.1 登录页面
- 用户名/密码登录表单
- 登录成功后根据角色跳转到对应页面

### 5.2 指挥中心大屏页面

**布局：**
```
┌─────────────────────────────────────────────────────────┐
│  演练名称：2024年第一次灾备演练    状态：进行中    14:05:32  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              流程步骤可视化                       │   │
│  │                                                   │   │
│  │  步骤1          步骤2           步骤3             │   │
│  │  ✅ 应用降级  →  🟡 数据库切换  →  ⚪ 业务验证    │   │
│  │  李明 14:03完成    王芳 进行中 3分钟    待开始     │   │
│  │        ↓                                          │   │
│  │  步骤4          步骤5                             │   │
│  │  ⚪ 系统恢复  →  ⚪ 演练总结                       │   │
│  │  待开始             待开始                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              实时消息滚动                         │   │
│  │  14:03:15 李明 完成步骤1，耗时 3分12秒            │   │
│  │  14:05:00 系统提醒：步骤2 即将超时（剩余2分钟）   │   │
│  │  14:05:30 王芳 开始执行步骤2                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**功能：**
- 实时显示演练进度
- 步骤编号清晰展示（步骤1、步骤2...）
- 步骤间用箭头连接，清晰展示流程顺序
- 步骤状态可视化（绿色完成、黄色进行中、灰色待开始、红色超时）
- 实时消息滚动
- 倒计时显示

### 5.3 参演工作台页面

**布局：**
```
┌─────────────────────────────────────────────────────────┐
│  参演工作台                    用户：王芳  角色：DBA      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  当前任务：执行主从切换                           │   │
│  │  演练名称：2024年第一次灾备演练                   │   │
│  │  步骤：2/5                                       │   │
│  │                                                   │   │
│  │  操作指引：                                       │   │
│  │  ① 登录RDS控制台                                 │   │
│  │  ② 点击切换                                       │   │
│  │  ③ 确认切换成功                                  │   │
│  │  ④ 返回本页面点击【完成】                         │   │
│  │                                                   │   │
│  │  倒计时：剩余 2分30秒                             │   │
│  │                                                   │   │
│  │  [开始执行]  [完成]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  历史任务                                         │   │
│  │  ✅ 应用降级 - 已完成 - 耗时 3分12秒              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**功能：**
- 显示当前待执行任务
- 操作指引展示
- 倒计时提醒
- 开始/完成操作按钮
- 历史任务查看

### 5.4 管理后台页面

**子页面：**
- 用户管理：用户列表、创建/编辑/删除用户
- 模板管理：流程模板列表、创建/编辑/删除模板
- 演练管理：演练实例列表、创建演练、分配执行人、启动/结束演练
- 消息配置：配置企业微信 Webhook URL
- 历史记录：查看历史演练记录和统计

## 6. 实时通信与消息推送

### 6.1 WebSocket 实时通信设计

**连接管理：**
- 客户端连接到 WebSocket Server (ws://host:8081/ws)
- 连接时携带 JWT Token 进行身份验证
- 服务端维护连接池，支持按用户ID和演练ID分组

**消息类型：**
```json
// 步骤状态更新
{
  "type": "step_update",
  "drill_id": 1,
  "step_order": 2,
  "status": "in_progress",
  "assignee": "王芳",
  "timestamp": "2024-01-15T14:05:30Z"
}

// 演练状态更新
{
  "type": "drill_update",
  "drill_id": 1,
  "status": "completed",
  "timestamp": "2024-01-15T14:30:00Z"
}

// 实时消息
{
  "type": "message",
  "drill_id": 1,
  "content": "李明 完成步骤1，耗时 3分12秒",
  "timestamp": "2024-01-15T14:03:15Z"
}

// 超时预警
{
  "type": "timeout_warning",
  "drill_id": 1,
  "step_order": 2,
  "remaining_seconds": 120,
  "timestamp": "2024-01-15T14:05:00Z"
}
```

**推送策略：**
- 大屏页面：订阅演练ID，接收该演练的所有更新
- 工作台页面：订阅用户ID，接收该用户的任务更新

### 6.2 企业微信消息推送设计

**Webhook 配置：**
- 管理员在后台配置企业微信群机器人 Webhook URL
- 支持配置多个 Webhook（不同演练推送到不同群）

**推送时机：**
- 演练开始：通知所有参演人员
- 步骤激活：通知该步骤执行人
- 步骤完成：通知所有参演人员
- 步骤超时预警：通知执行人和指挥员
- 演练结束：通知所有参演人员

**消息格式：**
```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "## 演练进度更新\n\n**演练名称**：2024年第一次灾备演练\n\n**步骤2** 已激活\n\n执行人：王芳\n\n请及时登录参演工作台执行任务。"
  }
}
```

### 6.3 HTTP API 与 WebSocket 协同

**流程（单体架构，同一进程内）：**
1. 用户通过 HTTP API 完成步骤（POST /api/executions/:id/complete）
2. HTTP Handler 更新数据库
3. HTTP Handler 发送消息到企业微信
4. HTTP Handler 直接调用 WebSocket Hub 推送更新（共享内存，无需消息队列）
5. WebSocket Hub 推送更新到所有订阅该演练的客户端

## 7. 错误处理与测试策略

### 7.1 错误处理设计

**后端错误处理：**
- 统一错误响应格式
```json
{
  "code": "STEP_NOT_FOUND",
  "message": "步骤不存在",
  "details": "步骤ID 123 不存在"
}
```

**错误类型：**
- 业务错误：步骤未激活、无权限操作、演练已结束等
- 系统错误：数据库连接失败、WebSocket 连接断开等
- 外部服务错误：企业微信 Webhook 调用失败

**前端错误处理：**
- API 请求失败：显示错误提示，支持重试
- WebSocket 断开：自动重连机制（最多重连 5 次，间隔 3 秒）
- 网络异常：显示离线提示，缓存用户操作，网络恢复后同步

**企业微信推送失败处理：**
- 记录失败日志到 message_logs 表
- 支持手动重试发送
- 不影响主流程执行

### 7.2 测试策略

**单元测试：**
- 后端：Go 单元测试，覆盖核心业务逻辑
  - 流程状态流转逻辑
  - 步骤超时计算
  - 权限验证
- 前端：Jest + React Testing Library
  - 组件渲染测试
  - 用户交互测试

**集成测试：**
- API 接口测试：使用 Postman 或 Go 测试
  - 用户登录/登出
  - 演练创建/启动/结束
  - 步骤执行流程
- WebSocket 连接测试：模拟客户端连接和消息推送

**端到端测试：**
- 完整演练流程测试
  1. 管理员创建演练
  2. 启动演练
  3. 参演人员执行步骤
  4. 大屏实时更新
  5. 企业微信消息推送
  6. 演练结束

**性能测试：**
- WebSocket 并发连接测试（目标：支持 100 个并发连接）
- API 接口压力测试（目标：100 QPS）

## 8. 项目结构

### 8.1 后端项目结构

```
server/
├── cmd/
│   └── server/            # 主服务入口
│       └── main.go
├── internal/
│   ├── handler/           # HTTP handlers
│   ├── service/           # Business logic
│   ├── repository/        # Data access
│   ├── model/             # Data models
│   ├── middleware/        # Middleware (auth, cors, etc.)
│   └── websocket/         # WebSocket logic
│       ├── hub.go         # WebSocket connection hub
│       └── client.go      # WebSocket client connection
├── pkg/
│   ├── auth/              # Authentication utilities
│   ├── wechat/            # WeChat webhook client
│   └── utils/             # Common utilities
├── static/                # 前端构建后的静态文件（生产环境）
├── config/
│   └── config.yaml        # Configuration file
└── go.mod
```

### 8.2 前端项目结构

```
web/
├── public/
├── src/
│   ├── components/        # Reusable components
│   ├── pages/
│   │   ├── Login/         # Login page
│   │   ├── Dashboard/     # Command center dashboard
│   │   ├── Workbench/     # Participant workbench
│   │   └── Admin/         # Admin pages
│   ├── services/          # API services
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Utilities
│   ├── store/             # State management
│   └── App.tsx
├── vite.config.ts         # Vite 配置（构建输出到 server/static/）
├── package.json
└── tsconfig.json
```

**前端构建配置：**
- vite.config.ts 配置 `build.outDir: '../server/static'`
- 构建后静态文件自动输出到 Go Server 的 static 目录

## 9. 部署方案（前后端一体）

### 9.1 开发环境
- 前端：npm run dev (localhost:3000) - Vite 开发服务器，支持热更新
- Go Server：go run cmd/server/main.go (HTTP: localhost:8080, WebSocket: localhost:8081)
- 前端通过 CORS 跨域访问后端 API
- MySQL：本地 Docker 容器

### 9.2 生产环境
- 前端构建：npm run build，生成静态文件到 server/static/ 目录
- Go Server：单个服务，同时提供：
  - HTTP API (端口 8080)
  - WebSocket (端口 8081)
  - 静态文件服务 (端口 8080，访问 / 返回前端页面)
- 部署方式：Systemd 服务或 Docker 容器
- MySQL：独立 MySQL 服务器或云数据库

### 9.3 配置管理
- 环境变量：数据库连接、端口、JWT 密钥等
- 配置文件：config.yaml
- 企业微信 Webhook URL：存储在数据库中，支持动态配置

### 9.4 静态文件服务配置
Go Server 使用 `embed` 包将前端静态文件嵌入到二进制文件中：
- 访问 `/` 返回 index.html
- 访问 `/assets/*` 返回 JS/CSS 等资源文件
- API 接口路径 `/api/*` 和 WebSocket 路径 `/ws` 不受影响