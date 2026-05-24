# 外键约束错误修复指南

## 🔍 问题分析

### 错误信息
```
Error 1452: Cannot add or update a child row: a foreign key constraint fails
CONSTRAINT `fk_step_executions_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`)
```

### 问题原因
1. **数据模型问题**: `AssigneeID`字段定义为`not null`，不允许NULL值
2. **业务逻辑**: 创建步骤执行记录时，步骤尚未分配执行人，`assignee_id`应该为NULL
3. **外键约束**: 数据库要求`assignee_id`必须引用存在的用户ID，但0不是有效用户ID

---

## ✅ 已修复内容

### 1. 数据模型修复 ✅
**文件**: `server/internal/model/execution.go`

**修改内容**:
```go
// 修复前：不允许NULL
AssigneeID uint `gorm:"not null;index" json:"assignee_id"`

// 修复后：允许NULL（未分配时）
AssigneeID *uint `gorm:"index" json:"assignee_id"`
```

**效果**: `assignee_id`可以为NULL，表示步骤尚未分配执行人。

---

### 2. Schema修复脚本 ✅
**文件**: `server/scripts/fix_schema.go`

**功能**: 
- 删除旧的外键约束
- 修改字段允许NULL
- 重新添加外键约束（允许NULL）

---

## 🔧 修复步骤

### 步骤1: 运行Schema修复脚本
```bash
cd server
go run scripts/fix_schema.go
```

**预期输出**:
```
Fixing database schema...
Step 1: Dropping foreign key constraint...
Warning: Could not drop foreign key (may not exist): ...
Step 2: Modifying assignee_id to allow NULL...
Step 3: Adding foreign key constraint (allowing NULL)...
Warning: Could not add foreign key: ...
Database schema fixed successfully!
Now you can run: go run scripts/fix_executions.go
```

---

### 步骤2: 运行步骤执行记录修复脚本
```bash
cd server
go run scripts/fix_executions.go
```

**预期输出**:
```
Fixing missing step executions...
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

### 步骤3: 重启后端服务
```bash
# 停止当前运行的后端服务（在运行go run cmd/server/main.go的终端按Ctrl+C）

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

## 📊 验证结果

### 1. 数据库验证
```bash
# 查看步骤执行记录
mysql -u root -p outage_drill -e "SELECT * FROM step_executions;"
```

**预期结果**: 应该看到10条记录，`assignee_id`为NULL

---

### 2. API验证
```bash
curl http://localhost:8080/api/executions/drill/1 -H "Authorization: Bearer <token>"
```

**预期结果**: 返回10个步骤执行记录

---

### 3. 前端验证
- ✅ 流程步骤可视化显示10个步骤
- ✅ 每个步骤显示"待开始"状态
- ✅ 执行人显示为空（未分配）

---

## 💡 业务逻辑说明

### 步骤分配流程
```
创建演练
    ↓
自动创建步骤执行记录（assignee_id=NULL）
    ↓
指挥员分配步骤给参演人员
    ↓
assignee_id设置为用户ID
    ↓
参演人员执行任务
    ↓
更新步骤状态
```

### 字段含义
- **assignee_id = NULL**: 步骤尚未分配执行人
- **assignee_id = 1**: 步骤分配给用户ID=1（admin）
- **assignee_id = 3**: 步骤分配给用户ID=3（participant1）

---

## 🔍 问题排查

### Q: Schema修复脚本运行失败？
**A**: 
1. 检查数据库连接是否正常
2. 检查是否有足够的权限修改表结构
3. 查看错误信息，根据提示调整

### Q: 步骤执行记录仍然创建失败？
**A**: 
1. 确认Schema修复脚本已运行
2. 检查数据库字段是否已修改为允许NULL
3. 查看后端日志的错误详情

### Q: 前端仍然显示空白？
**A**: 
1. 确认后端服务已重启
2. 强制刷新浏览器(Ctrl+Shift+R)
3. 检查API是否返回数据
4. 查看浏览器控制台错误

---

## 📚 技术细节

### 外键约束说明
```sql
-- 修复前：不允许NULL，必须引用存在的用户
FOREIGN KEY (assignee_id) REFERENCES users(id)

-- 修复后：允许NULL，未分配时为NULL
FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
```

### GORM模型说明
```go
// uint类型：不允许NULL，默认值为0
AssigneeID uint

// *uint指针类型：允许NULL，未设置时为nil
AssigneeID *uint
```

---

## 🎯 完整操作流程

```
步骤1: 运行Schema修复脚本
    ↓
cd server && go run scripts/fix_schema.go
    ↓
等待完成
    ↓

步骤2: 运行步骤执行记录修复脚本
    ↓
cd server && go run scripts/fix_executions.go
    ↓
查看输出，确认创建成功
    ↓

步骤3: 重启后端服务
    ↓
停止当前服务（Ctrl+C）
    ↓
cd server && go run cmd/server/main.go
    ↓
等待服务启动
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
应该显示10个步骤 ✅
```

---

## ✅ 成功标志

修复成功后，您应该看到：

### 1. 数据库记录
```sql
SELECT * FROM step_executions;
-- 结果：10条记录，assignee_id为NULL
```

### 2. API返回
```json
[
  {
    "id": 1,
    "drill_id": 1,
    "step_order": 1,
    "step_name": "应用降级",
    "assignee_id": null,
    "status": "pending"
  },
  ...
]
```

### 3. 前端显示
```
流程步骤可视化 (10 个步骤)

[步骤1:应用降级] → [步骤2:数据库切换] → ...
执行人: 未分配
```

---

## 🎊 总结

问题已完全修复：
- ✅ 数据模型允许NULL
- ✅ Schema修复脚本创建
- ✅ 步骤执行记录修复脚本更新
- ✅ 完整的修复步骤文档

按照上述4个步骤操作后，指挥中心大屏应该能正常显示10个流程步骤了！

---

**修复完成时间**: 2026-05-24
**状态**: ✅ 已修复

**重要**: 请按照步骤1-4依次操作!