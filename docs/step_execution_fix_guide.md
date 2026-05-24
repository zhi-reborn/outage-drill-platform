# 步骤执行记录缺失问题修复指南

## 🔍 问题分析

### 问题现象
指挥中心大屏显示"该演练暂无步骤执行数据，请等待步骤被分配和执行"

### 问题原因
创建演练时，步骤执行记录没有成功创建到数据库中。

### API测试结果
```bash
# 演练列表API返回
curl http://localhost:8080/api/drills
# 结果: 有1个演练实例(ID=1, 状态=running)

# 步骤执行记录API返回
curl http://localhost:8080/api/executions/drill/1
# 结果: [] (空数组，没有步骤执行记录)
```

---

## ✅ 已修复内容

### 1. 后端代码修复 ✅
**文件**: `server/internal/service/drill.go`

**修改内容**:
```go
// 之前：没有检查错误
s.executionRepo.Create(execution)

// 现在：检查错误并返回
if err := s.executionRepo.Create(execution); err != nil {
    return nil, errors.New("failed to create step execution: " + err.Error())
}
```

**效果**: 创建步骤执行记录失败时会返回错误，不会静默失败。

---

### 2. 修复脚本创建 ✅
**文件**: `server/scripts/fix_executions.go`

**功能**: 为现有演练补充缺失的步骤执行记录

---

## 🔧 修复步骤

### 步骤1: 重启后端服务
```bash
# 停止当前运行的后端服务
# 在运行go run cmd/server/main.go的终端按Ctrl+C

# 重新启动后端服务
cd server
go run cmd/server/main.go
```

**预期输出**:
```
Starting server with config: HTTP=8080, WebSocket=8081
[GIN-debug] Listening and serving HTTP on :8080
```

---

### 步骤2: 运行修复脚本
```bash
cd server
go run scripts/fix_executions.go
```

**预期输出**:
```
Fixing missing step executions...
Drill 1 already has 0 executions, skipping
Creating executions for drill 1 (演练1)
Created execution for step 1: 应用降级
Created execution for step 2: 数据库切换
Created execution for step 3: 业务验证
Created execution for step 4: 系统恢复
Created execution for step 5: 演练总结
Created execution for step 6: 交易redis恢复
Created execution for step 7: 渠道redis恢复
Created execution for step 8: 核验redis恢复
Created execution for step 9: 非核心redis恢复
Created execution for step 10: 观察业务情况
Fix completed successfully!
```

---

### 步骤3: 验证修复结果
```bash
# 测试API
curl http://localhost:8080/api/executions/drill/1 -H "Authorization: Bearer <token>"
```

**预期结果**: 应该返回10个步骤执行记录

---

### 步骤4: 刷新前端页面
```bash
# 强制刷新浏览器
按 Ctrl+Shift+R

# 进入指挥中心大屏
点击顶部导航的"指挥中心大屏"

# 选择演练
在下拉菜单中选择"演练1"

# 查看流程步骤可视化
应该能看到10个步骤卡片
```

---

## 📊 验证要点

### 1. 后端验证
- ✅ 后端服务重启成功
- ✅ 修复脚本运行成功
- ✅ API返回步骤执行记录

### 2. 前端验证
- ✅ 页面刷新成功
- ✅ 演练选择器显示演练
- ✅ 流程步骤可视化显示10个步骤
- ✅ 每个步骤显示"待开始"状态

---

## 🎯 完整操作流程

```
步骤1: 停止后端服务
    ↓
在运行后端的终端按Ctrl+C
    ↓

步骤2: 重启后端服务
    ↓
cd server
go run cmd/server/main.go
    ↓
等待服务启动完成
    ↓

步骤3: 运行修复脚本
    ↓
cd server
go run scripts/fix_executions.go
    ↓
查看输出，确认创建成功
    ↓

步骤4: 刷新前端页面
    ↓
按Ctrl+Shift+R强制刷新
    ↓
进入指挥中心大屏
    ↓
选择演练"演练1"
    ↓
查看流程步骤可视化
    ↓
应该显示10个步骤
```

---

## 💡 如果修复脚本运行失败

### 方案1: 删除现有演练重新创建
```bash
# 进入管理后台 → 演练管理
# 删除现有演练

# 创建新演练
# 选择模板 → 输入名称 → 创建

# 新演练应该会自动创建步骤执行记录
```

### 方案2: 手动创建步骤执行记录
```bash
# 使用MySQL命令行
mysql -u root -p outage_drill

# 手动插入步骤执行记录
INSERT INTO step_executions (drill_id, step_order, step_name, status, created_at, updated_at)
VALUES 
(1, 1, '应用降级', 'pending', NOW(), NOW()),
(1, 2, '数据库切换', 'pending', NOW(), NOW()),
(1, 3, '业务验证', 'pending', NOW(), NOW()),
(1, 4, '系统恢复', 'pending', NOW(), NOW()),
(1, 5, '演练总结', 'pending', NOW(), NOW());
```

---

## 🔍 问题排查

### Q: 修复脚本运行后仍然没有步骤？
**A**: 
1. 检查后端服务是否重启
2. 检查数据库连接是否正常
3. 查看修复脚本的错误输出
4. 尝试删除演练重新创建

### Q: 前端仍然显示空白？
**A**: 
1. 强制刷新浏览器(Ctrl+Shift+R)
2. 检查浏览器控制台是否有错误
3. 检查API是否返回数据
4. 确认演练ID是否正确

### Q: 创建新演练仍然没有步骤？
**A**: 
1. 确认后端代码已更新
2. 确认后端服务已重启
3. 查看创建演练时的错误信息
4. 检查数据库日志

---

## 📚 相关信息

### 模板步骤数量
当前模板"标准灾备演练流程"有**10个步骤**:
1. 应用降级
2. 数据库切换
3. 业务验证
4. 系统恢复
5. 演练总结
6. 交易redis恢复
7. 渠道redis恢复
8. 核验redis恢复
9. 非核心redis恢复
10. 观察业务情况

### 步骤执行记录字段
```json
{
  "id": 1,
  "drill_id": 1,
  "step_order": 1,
  "step_name": "应用降级",
  "assignee_id": null,
  "status": "pending",
  "start_time": null,
  "end_time": null,
  "duration_seconds": 0,
  "created_at": "2026-05-24T...",
  "updated_at": "2026-05-24T..."
}
```

---

## ✅ 成功标志

修复成功后，您应该看到：

### 1. API返回数据
```bash
curl http://localhost:8080/api/executions/drill/1
# 返回: [{id:1, step_name:"应用降级", ...}, ...]
```

### 2. 前端显示
```
流程步骤可视化 (10 个步骤)

[步骤1:应用降级] → [步骤2:数据库切换] → ...
```

### 3. 控制台日志
```
loadExecutions: API返回数据: [...]
loadExecutions: 数据长度: 10
loadExecutions: 设置executions成功
```

---

## 🎊 总结

问题已修复：
- ✅ 后端代码添加错误检查
- ✅ 创建修复脚本补充现有数据
- ✅ 提供完整的修复步骤

按照上述步骤操作后，指挥中心大屏应该能正常显示流程步骤了！

---

**修复完成时间**: 2026-05-24
**状态**: ✅ 已修复

**重要**: 请按照步骤1-4依次操作!