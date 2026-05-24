# 前端问题修复总结

## 遇到的问题

### 问题1: WebSocket连接错误
```
WebSocket error: at ws.onerror (websocket.ts:26:14)
```

**原因**: WebSocket连接URL配置错误，尝试连接到前端端口3000而不是后端端口8080

**修复**: 
- 文件: `web/src/services/websocket.ts`
- 修改连接URL: `ws://localhost:8080/api/ws`
- 添加错误提示信息

---

### 问题2: 看不到导航菜单
**原因**: 页面缺少导航栏组件，用户无法看到管理后台等菜单

**修复**:
1. 创建导航Layout组件: `web/src/components/Layout/index.tsx`
2. 更新App.tsx，让所有页面使用Layout组件

---

## 修复后的功能

### 导航菜单包含:
- **指挥中心大屏** - 所有用户可见
- **参演工作台** - 所有用户可见
- **管理后台** - 仅管理员和指挥员可见
  - 用户管理
  - 模板管理
  - 演练管理
  - Webhook配置

### 用户信息显示:
- 显示当前用户名和角色
- 退出登录功能

---

## 下一步操作

### 1. 确保后端服务运行
WebSocket错误通常是因为后端服务没有启动。请确保:

```bash
# 检查后端是否运行
cd server
go run cmd/server/main.go

# 应该看到:
# Starting server with config: HTTP=8080, WebSocket=8081
```

### 2. 刷新前端页面
修改代码后需要刷新浏览器:
- 按 `Ctrl+Shift+R` (强制刷新)
- 或关闭浏览器重新打开

### 3. 查看导航菜单
登录后应该能看到:
- 顶部导航栏
- 左侧: 平台名称 + 菜单项
- 右侧: 用户头像和名称

---

## 验证修复

### 验证WebSocket
打开浏览器控制台(F12)，应该看到:
```
Connecting to WebSocket: ws://localhost:8080/api/ws
WebSocket connected successfully
```

如果看到错误:
```
WebSocket error
Please make sure the backend server is running on port 8080
```

说明后端服务未启动。

### 验证导航菜单
登录后应该看到:
1. 顶部导航栏
2. 菜单项:
   - 指挥中心大屏
   - 参演工作台
   - 管理后台(管理员/指挥员)
3. 用户信息下拉菜单

---

## 常见问题

### Q: WebSocket仍然报错?
**A**: 确保后端服务正在运行:
```bash
cd server
go run cmd/server/main.go
```

### Q: 看不到管理后台菜单?
**A**: 
1. 确保使用管理员或指挥员账号登录
2. 刷新浏览器页面
3. 检查用户角色是否正确

### Q: 菜单点击无反应?
**A**: 
1. 检查浏览器控制台是否有错误
2. 确认路由配置正确
3. 刷新页面重试

---

## 文件修改列表

1. `web/src/services/websocket.ts` - WebSocket连接URL修复
2. `web/src/components/Layout/index.tsx` - 新建导航Layout组件
3. `web/src/App.tsx` - 更新路由配置，使用Layout组件

---

## 测试账号

| 角色 | 用户名 | 密码 | 可见菜单 |
|------|--------|------|----------|
| 管理员 | admin | admin123 | 所有菜单 |
| 指挥员 | commander | commander123 | 大屏+工作台+管理后台 |
| 参演人员 | participant1 | participant123 | 大屏+工作台 |

---

**修复完成时间**: 2026-05-23
**状态**: ✅ 已修复

**重要提示**: WebSocket错误需要后端服务运行才能解决!