# 演练删除功能设计文档

## 需求概述

在演练管理页面增加删除演练功能，允许管理员删除不需要的演练实例。

## 功能约束

### 状态限制
- **允许删除**：`pending`（待开始）、`completed`（已完成）
- **禁止删除**：`running`（进行中）、`paused`（已暂停）

### 数据处理
- **级联删除**：删除演练时，同时删除所有关联的步骤执行记录（step_executions）
- **不可恢复**：数据删除后无法恢复

## 技术设计

### 后端实现

#### 1. Service层
文件：`server/internal/service/drill.go`

新增方法：
```go
func (s *DrillService) DeleteDrill(id uint) error {
    // 1. 获取演练实例
    drill, err := s.drillRepo.FindByID(id)
    if err != nil {
        return err
    }
    
    // 2. 检查状态是否允许删除
    if drill.Status != "pending" && drill.Status != "completed" {
        return errors.New("只能删除待开始或已完成的演练")
    }
    
    // 3. 级联删除步骤执行记录
    err = s.executionRepo.DeleteByDrillID(id)
    if err != nil {
        return err
    }
    
    // 4. 删除演练实例
    return s.drillRepo.Delete(id)
}
```

#### 2. Repository层
文件：`server/internal/repository/execution.go`

新增方法：
```go
func (r *ExecutionRepository) DeleteByDrillID(drillID uint) error {
    return r.db.Where("drill_id = ?", drillID).Delete(&model.StepExecution{}).Error
}
```

#### 3. Handler层
文件：`server/internal/handler/drill.go`

新增方法：
```go
func (h *DrillHandler) DeleteDrill(c *gin.Context) {
    id, err := strconv.ParseUint(c.Param("id"), 10, 32)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid drill id"})
        return
    }
    
    if err := h.drillSvc.DeleteDrill(uint(id)); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "drill deleted"})
}
```

#### 4. 路由注册
文件：`server/cmd/server/main.go`

新增路由：
```go
drills.DELETE("/:id", middleware.RequireRole("admin", "commander"), drillHandler.DeleteDrill)
```

### 前端实现

#### 1. Service层
文件：`web/src/services/drill.ts`

新增方法：
```typescript
deleteDrill: async (id: number): Promise<void> => {
    await api.delete(`/drills/${id}`)
}
```

#### 2. UI组件
文件：`web/src/pages/Admin/DrillManagement/index.tsx`

在操作列添加删除按钮：
- 使用 `Popconfirm` 二次确认
- 只在 `pending` 和 `completed` 状态显示
- 删除成功后刷新列表

## 实现步骤

1. 后端：Repository层添加 DeleteByDrillID 方法
2. 后端：Service层添加 DeleteDrill 方法（含状态检查）
3. 后端：Handler层添加 DeleteDrill 接口
4. 后端：注册 DELETE 路由
5. 前端：Service层添加 deleteDrill 方法
6. 前端：DrillManagement 页面添加删除按钮
7. 测试验证

## 安全考虑

- 只有 admin 和 commander 角色可以删除演练
- 状态检查防止误删正在执行的演练
- Popconfirm 二次确认防止误操作