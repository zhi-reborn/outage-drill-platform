# 模板数据不显示问题排查指南

## 问题现象
登录后在管理后台的模板管理页面看不到标准模板数据。

---

## ✅ 已确认正常的部分

### 1. 数据库有数据
```bash
mysql> SELECT * FROM drill_templates;
# 结果: 有1个标准模板,包含5个步骤
```

### 2. 后端API正常
```bash
curl -X GET http://localhost:8080/api/templates -H "Authorization: Bearer <token>"
# 结果: 正确返回模板数据
```

### 3. 后端服务运行
```
[GIN-debug] Listening and serving HTTP on :8080
# 所有API路由已注册
```

---

## 🔍 问题可能原因

### 原因1: 前端Token未保存
**症状**: localStorage中没有token
**解决**: 重新登录

### 原因2: 浏览器缓存问题
**症状**: 页面显示旧数据或空白
**解决**: 强制刷新(Ctrl+Shift+R)

### 原因3: API调用失败
**症状**: 控制台有错误信息
**解决**: 检查网络请求

---

## 🛠️ 诊断步骤

### 步骤1: 使用诊断页面
1. 刷新浏览器(Ctrl+Shift+R)
2. 点击导航菜单的 **"系统诊断"**
3. 查看诊断结果:
   - 用户状态
   - Token状态
   - API连接测试
   - 模板数据

### 步骤2: 检查浏览器控制台
1. 按 F12 打开开发者工具
2. 切换到 Console 标签
3. 查看是否有错误信息
4. 切换到 Network 标签
5. 查看API请求是否成功

### 步骤3: 检查LocalStorage
1. F12 → Application 标签
2. Local Storage → http://localhost:3000
3. 查看是否有 `token` 键
4. 查看token值是否有效

---

## 💡 解决方案

### 方案1: 重新登录
```bash
1. 点击右上角用户头像
2. 点击"退出登录"
3. 重新登录(admin / admin123)
4. 进入管理后台 → 模板管理
```

### 方案2: 清除缓存
```bash
1. 按 Ctrl+Shift+Delete
2. 选择"清除缓存"
3. 强制刷新(Ctrl+Shift+R)
4. 重新登录
```

### 方案3: 手动测试API
```bash
# 在浏览器控制台执行:
fetch('/api/templates', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('模板数据:', data))
```

---

## 📊 诊断页面功能

访问 http://localhost:3000/diagnostic 可以看到:

### 1. 用户状态检查
- 当前登录用户
- 用户角色
- 认证状态

### 2. Token检查
- Token是否存在
- Token长度
- Token预览

### 3. API连接测试
- 测试按钮
- 连接状态
- 错误信息

### 4. 数据显示
- 模板列表
- JSON格式数据

---

## 🎯 快速解决流程

```
看不到模板数据
    ↓
访问诊断页面(/diagnostic)
    ↓
检查各项状态
    ↓
发现问题
    ↓
应用对应解决方案
    ↓
刷新页面
    ↓
查看模板管理页面
```

---

## 📝 常见错误及解决

### 错误1: "未登录"
**解决**: 重新登录

### 错误2: "Token不存在"
**解决**: 
1. 退出登录
2. 重新登录
3. 检查localStorage

### 错误3: "API调用失败"
**解决**:
1. 检查后端是否运行
2. 检查网络连接
3. 查看控制台错误详情

### 错误4: "401 Unauthorized"
**解决**:
1. Token过期,重新登录
2. 清除localStorage
3. 重新登录

---

## 🔧 开发者调试

### 查看API请求
```javascript
// 在浏览器控制台
console.log('Token:', localStorage.getItem('token'))

// 手动调用API
drillService.getTemplates()
  .then(data => console.log('成功:', data))
  .catch(err => console.error('失败:', err))
```

### 查看React状态
```javascript
// 在浏览器控制台
// 查看store状态
window.__ZUSTAND_STORE__ = useAppStore
```

---

## ✅ 验证成功标志

当问题解决后,您应该看到:
1. ✅ 诊断页面显示"API连接成功"
2. ✅ 模板管理页面显示表格
3. ✅ 表格中有1个模板:"标准灾备演练流程"
4. ✅ 步骤数显示为5
5. ✅ 可以点击"编辑"查看详情

---

## 🆘 如果仍然无法解决

1. 查看浏览器控制台的完整错误信息
2. 检查Network标签的API请求详情
3. 确认后端服务正常运行
4. 尝试重启前端服务:
   ```bash
   cd web
   npm run dev
   ```

---

**创建时间**: 2026-05-24
**状态**: ✅ 诊断工具已创建

**重要**: 请先访问诊断页面(/diagnostic)检查问题!