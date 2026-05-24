# 流程管理系统架构升级设计方案

## 📋 需求分析

### 当前系统结构
```
演练模板 (DrillTemplate)
    ↓
步骤定义 (StepDefinition) - 平铺结构
    ↓
演练实例 (DrillInstance)
    ↓
步骤执行 (StepExecution)
```

### 新系统结构需求
```
演练模板 (DrillTemplate)
    ↓
阶段 (Phase) - 第一层级
    ↓
环节 (Stage) - 第二层级
    ↓
任务 (Task) - 第三层级
    ↓
操作步骤 (Operation) - 第四层级
```

---

## 🎯 核心需求

### 1. 层级结构
- ✅ **阶段**: 一个演练包含多个阶段
- ✅ **环节**: 一个阶段包含多个环节（子阶段）
- ✅ **任务**: 一个环节包含多个任务
- ✅ **操作步骤**: 一个任务包含多个操作步骤

### 2. 执行模式
- ✅ **串行执行**: 按顺序逐个执行
- ✅ **并行执行**: 多个同时执行
- ✅ **层级设置**: 阶段、环节、任务、操作步骤都可以设置执行模式

### 3. 前序关系
- ✅ **前序任务**: 设置前置任务依赖
- ✅ **自动激活**: 前序完成后自动激活后续任务
- ✅ **依赖管理**: 支持复杂的依赖关系

### 4. 时间管理
- ✅ **预计时间**: 预计开始时间、预计完成时间
- ✅ **实际时间**: 实际开始时间、实际结束时间
- ✅ **执行时长**: 实际执行时长计算

### 5. 责任体系
- ✅ **责任部门**: 任务所属部门
- ✅ **责任人**: 任务负责人
- ✅ **执行人**: 实际执行人员
- ✅ **复核人**: 结果复核人员

---

## 📊 数据模型设计

### 1. 阶段模型 (Phase)

```go
type Phase struct {
    ID              uint           `gorm:"primaryKey"`
    TemplateID      uint           `gorm:"not null;index"`
    Name            string         `gorm:"size:100;not null"`
    Description     string         `gorm:"type:text"`
    Order           int            `gorm:"not null"`              // 阶段顺序
    ExecutionMode   string         `gorm:"size:20;not null"`      // serial/parallel
    Status          string         `gorm:"size:20;not null"`      // pending/running/completed
    
    // 时间管理
    EstimatedStartTime *time.Time
    EstimatedEndTime   *time.Time
    ActualStartTime    *time.Time
    ActualEndTime      *time.Time
    DurationSeconds    int
    
    CreatedAt       time.Time
    UpdatedAt       time.Time
    
    Template        *DrillTemplate  `gorm:"foreignKey:TemplateID"`
    Stages          []Stage         `gorm:"foreignKey:PhaseID"`
}
```

### 2. 环节模型 (Stage)

```go
type Stage struct {
    ID              uint           `gorm:"primaryKey"`
    PhaseID         uint           `gorm:"not null;index"`
    Name            string         `gorm:"size:100;not null"`
    Description     string         `gorm:"type:text"`
    Order           int            `gorm:"not null"`              // 环节顺序
    ExecutionMode   string         `gorm:"size:20;not null"`      // serial/parallel
    Status          string         `gorm:"size:20;not null"`
    
    // 时间管理
    EstimatedStartTime *time.Time
    EstimatedEndTime   *time.Time
    ActualStartTime    *time.Time
    ActualEndTime      *time.Time
    DurationSeconds    int
    
    CreatedAt       time.Time
    UpdatedAt       time.Time
    
    Phase           *Phase         `gorm:"foreignKey:PhaseID"`
    Tasks           []Task         `gorm:"foreignKey:StageID"`
}
```

### 3. 任务模型 (Task)

```go
type Task struct {
    ID              uint           `gorm:"primaryKey"`
    StageID         uint           `gorm:"not null;index"`
    Name            string         `gorm:"size:100;not null"`
    Description     string         `gorm:"type:text"`
    Order           int            `gorm:"not null"`
    ExecutionMode   string         `gorm:"size:20;not null"`      // serial/parallel
    Status          string         `gorm:"size:20;not null"`
    
    // 责任体系
    Department      string         `gorm:"size:100"`              // 责任部门
    ResponsiblePerson *uint        `gorm:"index"`                 // 责任人ID
    ExecutorID      *uint          `gorm:"index"`                 // 执行人ID
    ReviewerID      *uint          `gorm:"index"`                 // 复核人ID
    
    // 前序关系
    PredecessorIDs  string         `gorm:"type:text"`             // 前序任务ID列表(JSON数组)
    
    // 时间管理
    EstimatedStartTime *time.Time
    EstimatedEndTime   *time.Time
    EstimatedDuration  int          // 预计耗时(分钟)
    ActualStartTime    *time.Time
    ActualEndTime      *time.Time
    DurationSeconds    int
    
    CreatedAt       time.Time
    UpdatedAt       time.Time
    
    Stage           *Stage         `gorm:"foreignKey:StageID"`
    Operations      []Operation    `gorm:"foreignKey:TaskID"`
    ResponsibleUser *User          `gorm:"foreignKey:ResponsiblePerson"`
    Executor        *User          `gorm:"foreignKey:ExecutorID"`
    Reviewer        *User          `gorm:"foreignKey:ReviewerID"`
}
```

### 4. 操作步骤模型 (Operation)

```go
type Operation struct {
    ID              uint           `gorm:"primaryKey"`
    TaskID          uint           `gorm:"not null;index"`
    Name            string         `gorm:"size:100;not null"`
    Description     string         `gorm:"type:text"`
    Order           int            `gorm:"not null"`
    ExecutionMode   string         `gorm:"size:20;not null"`      // serial/parallel
    Status          string         `gorm:"size:20;not null"`
    
    // 执行人
    ExecutorID      *uint          `gorm:"index"`
    
    // 前序关系
    PredecessorIDs  string         `gorm:"type:text"`             // 前序操作ID列表
    
    // 操作指引
    Guide           string         `gorm:"type:text"`
    TimeoutMinutes  int            `gorm:"not null"`
    
    // 时间管理
    EstimatedStartTime *time.Time
    EstimatedEndTime   *time.Time
    ActualStartTime    *time.Time
    ActualEndTime      *time.Time
    DurationSeconds    int
    
    CreatedAt       time.Time
    UpdatedAt       time.Time
    
    Task            *Task          `gorm:"foreignKey:TaskID"`
    Executor        *User          `gorm:"foreignKey:ExecutorID"`
}
```

---

## 🔧 执行逻辑设计

### 1. 串行执行逻辑
```
阶段1(串行)
    ↓
环节1(串行) → 环节2(串行) → 环节3(串行)
    ↓
任务1(串行) → 任务2(串行) → 任务3(串行)
    ↓
操作1(串行) → 操作2(串行) → 操作3(串行)
```

**规则**:
- 只有前一个完成后，下一个才能开始
- 自动激活下一个任务/操作

### 2. 并行执行逻辑
```
阶段1(并行)
    ↓
环节1(并行) | 环节2(并行) | 环节3(并行)
    ↓
任务1(并行) | 任务2(并行) | 任务3(并行)
    ↓
操作1(并行) | 操作2(并行) | 操作3(并行)
```

**规则**:
- 所有任务/操作同时可以执行
- 不需要等待前序完成

### 3. 前序依赖逻辑
```
任务A → 任务B → 任务C
任务A → 任务D
任务B → 任务E
```

**规则**:
- 任务B依赖任务A完成
- 任务D依赖任务A完成
- 任务E依赖任务B完成
- 所有前序完成后，自动激活后续任务

---

## 📱 前端界面设计

### 1. 模板编辑界面
```
演练模板编辑
├─ 阶段列表
│  ├─ 阶段1: 应用降级阶段
│  │  ├─ 执行模式: [串行/并行]
│  │  ├─ 环节列表
│  │  │  ├─ 环节1: 数据库降级
│  │  │  │  ├─ 执行模式: [串行/并行]
│  │  │  │  ├─ 任务列表
│  │  │  │  │  ├─ 任务1: MySQL降级
│  │  │  │  │  │  ├─ 执行模式: [串行/并行]
│  │  │  │  │  │  ├─ 责任部门: 数据库组
│  │  │  │  │  │  ├─ 责任人: 张三
│  │  │  │  │  │  ├─ 预计耗时: 10分钟
│  │  │  │  │  │  ├─ 操作步骤列表
│  │  │  │  │  │  │  ├─ 操作1: 停止写入
│  │  │  │  │  │  │  ├─ 操作2: 切换主从
│  │  │  │  │  │  │  ├─ 前序关系设置
```

### 2. 演练执行界面
```
指挥中心大屏
├─ 阶段进度可视化
│  ├─ 阶段1: [进行中] 50%
│  │  ├─ 环节1: [已完成]
│  │  ├─ 环节2: [进行中]
│  │  │  ├─ 任务1: [已完成]
│  │  │  ├─ 任务2: [进行中]
│  │  │  │  ├─ 操作1: [已完成]
│  │  │  │  ├─ 操作2: [进行中]
│  │  │  │  ├─ 操作3: [待开始]
│  │  ├─ 环节3: [待开始]
```

---

## 🚀 实施计划

### 阶段1: 数据模型重构 (1-2天)
1. 创建新的数据模型文件
2. 编写数据库迁移脚本
3. 测试数据模型关系

### 阶段2: 后端服务开发 (3-4天)
1. 实现层级CRUD操作
2. 实现执行逻辑引擎
3. 实现自动激活机制
4. 实现时间计算逻辑

### 阶段3: 前端界面开发 (3-4天)
1. 实现模板编辑界面
2. 实现层级可视化
3. 实现执行控制界面
4. 实现进度监控界面

### 阶段4: 测试和优化 (1-2天)
1. 功能测试
2. 性能优化
3. 用户体验优化

---

## 💡 技术要点

### 1. 自动激活机制
```go
// 当任务完成时，检查并激活后续任务
func (s *TaskService) CompleteTask(taskID uint) error {
    task, _ := s.taskRepo.FindByID(taskID)
    task.Status = "completed"
    s.taskRepo.Update(task)
    
    // 查找依赖此任务的后继任务
    successors := s.findSuccessorTasks(taskID)
    
    // 检查每个后继任务的前序是否全部完成
    for _, successor := range successors {
        if s.checkAllPredecessorsCompleted(successor.ID) {
            s.activateTask(successor.ID)
        }
    }
    
    return nil
}
```

### 2. 执行模式判断
```go
// 根据执行模式决定激活策略
func (s *StageService) activateNextTask(stageID uint) {
    stage, _ := s.stageRepo.FindByID(stageID)
    
    if stage.ExecutionMode == "serial" {
        // 串行：只激活下一个任务
        nextTask := s.findNextPendingTask(stageID)
        s.activateTask(nextTask.ID)
    } else {
        // 并行：激活所有待执行任务
        pendingTasks := s.findAllPendingTasks(stageID)
        for _, task := range pendingTasks {
            s.activateTask(task.ID)
        }
    }
}
```

---

## 📊 数据迁移策略

### 1. 保留现有数据
- ✅ 保留现有的演练模板
- ✅ 保留现有的演练实例
- ✅ 保留现有的步骤执行记录

### 2. 数据转换
```sql
-- 将现有步骤转换为新的层级结构
-- 步骤1-2 → 阶段1-环节1-任务1
-- 步骤3-5 → 阶段1-环节2-任务1
-- 步骤6-10 → 阶段2-环节1-任务1
```

---

## 🎯 预期效果

### 1. 更清晰的流程结构
- ✅ 层级分明，易于理解
- ✅ 责任明确，便于管理
- ✅ 进度可视，实时监控

### 2. 更灵活的执行控制
- ✅ 支持串行和并行
- ✅ 支持复杂依赖关系
- ✅ 自动激活后续任务

### 3. 更完整的时间管理
- ✅ 预计时间规划
- ✅ 实际时间记录
- ✅ 执行时长分析

---

## 📚 下一步行动

1. **确认设计方案** - 与用户确认架构设计
2. **开始数据模型开发** - 创建新的模型文件
3. **编写迁移脚本** - 数据库结构升级
4. **逐步实现功能** - 按阶段实施

---

**设计完成时间**: 2026-05-24
**状态**: ✅ 设计完成，等待确认

**重要**: 这是一个重大的架构升级，需要确认后再开始实施!