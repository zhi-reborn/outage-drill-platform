import React, { useState, useEffect } from 'react'
import { Spin, Alert, Button, Tag, Progress, Drawer, Descriptions, Empty, Popover } from 'antd'
import { 
  ReloadOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  ApartmentOutlined,
  RightOutlined,
  DownOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { Typography } from 'antd'
import { workflowService } from '../../services/workflow'
import { DrillTemplate } from '../../types'

const { Text, Title } = Typography

interface WorkflowHierarchyDisplayProps {
  templateId: number
  drillId?: number
  onRefresh?: () => void
}

interface NodeDetail {
  type: 'phase' | 'stage' | 'task' | 'operation'
  name: string
  status: string
  mode?: string
  department?: string
  plannedDuration?: number
  actualDuration?: number
  description?: string
  assignee?: string
  operations?: any[]
  tasks?: any[]
  stages?: any[]
}

const WorkflowHierarchyDisplay: React.FC<WorkflowHierarchyDisplayProps> = ({ 
  templateId, 
  drillId,
  onRefresh 
}) => {
  const [template, setTemplate] = useState<DrillTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set())

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const isPhaseExpanded = (phaseId: number) => expandedPhases.has(phaseId)

  useEffect(() => {
    loadHierarchy()
  }, [templateId])

  const loadHierarchy = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await workflowService.getTemplateFullHierarchy(templateId)
      setTemplate(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load hierarchy')
    }
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#6B7280',
      in_progress: '#00D9FF',
      running: '#00D9FF',
      paused: '#F59E0B',
      completed: '#10B981',
      timeout: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '待开始',
      in_progress: '进行中',
      running: '进行中',
      paused: '已暂停',
      completed: '已完成',
      timeout: '已超时'
    }
    return texts[status] || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined />
      case 'in_progress':
      case 'running':
        return <PlayCircleOutlined />
      case 'paused':
        return <PauseCircleOutlined />
      default:
        return <ClockCircleOutlined />
    }
  }

  const calculateProgress = (status: string, tasks?: any[]) => {
    if (status === 'completed') return 100
    if (status === 'pending') return 0
    if (tasks && tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'completed').length
      return Math.round((completed / tasks.length) * 100)
    }
    return 50
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`
  }

  const handleNodeClick = (node: NodeDetail) => {
    setSelectedNode(node)
    setDrawerVisible(true)
  }

  const closeDrawer = () => {
    setDrawerVisible(false)
    setSelectedNode(null)
  }

  if (loading) {
    return (
      <div className="hierarchy-loading">
        <Spin size="large" />
        <Text className="loading-text">正在加载层级视图...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadHierarchy}>
            重试
          </Button>
        }
      />
    )
  }

  if (!template) {
    return <Empty description="暂无层级数据" />
  }

  const phases = template.phases || []
  const firstIncompleteIdx = phases.findIndex((p: any) => p.status !== 'completed')
  const sortedPhases = firstIncompleteIdx === -1
    ? phases
    : [...phases.slice(firstIncompleteIdx), ...phases.slice(0, firstIncompleteIdx)]
  const completedPhases = phases.filter((p: any) => p.status === 'completed').length
  const totalStages = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).length, 0
  )
  const completedStages = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).filter(s => s.status === 'completed').length, 0
  )
  const totalTasks = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).reduce((stageAcc, stage) => 
      stageAcc + (stage.tasks || []).length, 0
    ), 0
  )
  const completedTasks = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).reduce((stageAcc, stage) => 
      stageAcc + (stage.tasks || []).filter(t => t.status === 'completed').length, 0
    ), 0
  )
  const totalSteps = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).reduce((stageAcc, stage) => 
      stageAcc + (stage.tasks || []).reduce((taskAcc, task) => 
        taskAcc + (task.operations || []).length, 0
      ), 0
    ), 0
  )
  const completedSteps = phases.reduce((acc, phase) => 
    acc + (phase.stages || []).reduce((stageAcc, stage) => 
      stageAcc + (stage.tasks || []).reduce((taskAcc, task) => 
        taskAcc + (task.operations || []).filter(o => o.status === 'completed').length, 0
      ), 0
    ), 0
  )
  const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const allExpanded = phases.length > 0 && phases.every(p => expandedPhases.has(p.id))

  return (
    <div className="hierarchy-container">
      <div className="hierarchy-header">
        <div className="header-left">
          <div className="template-icon">
            <ApartmentOutlined />
          </div>
          <div className="header-info">
            <Title level={3} className="template-name">{template.name}</Title>
            <div className="header-stats">
              <span className="stat-item">
                <span className="stat-label">阶段</span>
                <span className="stat-value">{completedPhases}/{phases.length}</span>
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                <span className="stat-label">环节</span>
                <span className="stat-value">{completedStages}/{totalStages}</span>
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                <span className="stat-label">任务</span>
                <span className="stat-value">{completedTasks}/{totalTasks}</span>
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                <span className="stat-label">步骤</span>
                <span className="stat-value">{completedSteps}/{totalSteps}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button
            className="header-expand-toggle"
            onClick={() => {
              if (allExpanded) {
                setExpandedPhases(new Set())
              } else {
                setExpandedPhases(new Set(phases.map(p => p.id)))
              }
            }}
            title={allExpanded ? '全部收起' : '全部展开'}
          >
            <DownOutlined style={{ transform: allExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
            <span>{allExpanded ? '收起' : '展开'}</span>
          </button>
          <div className="progress-ring">
            <Progress 
              type="circle" 
              percent={overallProgress} 
              size={56}
              strokeColor="#00D9FF"
              trailColor="#2D3748"
              format={(p) => <span className="progress-num">{p}%</span>}
            />
          </div>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadHierarchy}
            className="refresh-btn"
          >
            刷新
          </Button>
        </div>
      </div>

      <div className="flow-overview">
        {sortedPhases.map((phase, phaseIdx) => {
          const allTasks = (phase.stages || []).flatMap((s: any) => s.tasks || [])
          const allOperations = allTasks.flatMap((t: any) => (t.operations || []).map((op: any) => ({
            ...op,
            _taskName: t.name,
            _executor: op.executor || t.executor || t.responsible_person,
            _department: t.department
          })))
          const completedOps = allOperations.filter((op: any) => op.status === 'completed').length
          const inProgressOps = allOperations.filter((op: any) => op.status === 'in_progress').length
          const pendingOps = allOperations.filter((op: any) => op.status === 'pending').length
          const completedOpList = allOperations.filter((op: any) => op.status === 'completed')
          const inProgressOpList = allOperations.filter((op: any) => op.status === 'in_progress')
          const pendingOpList = allOperations.filter((op: any) => op.status === 'pending')
          const totalOps = allOperations.length
          const totalTasks = allTasks.length
          const completedTasks = allTasks.filter((t: any) => t.status === 'completed').length
          const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          
          const currentStage = (phase.stages || []).find((s: any) => s.status === 'in_progress')
          const blockedTasks = allTasks.filter((t: any) => t.status === 'in_progress' && t.planned_duration && t.actual_duration && t.actual_duration > t.planned_duration)
          
          const renderOpList = (ops: any[], statusColor: string) => (
            <div className="chip-popover-list">
              {ops.length === 0 ? (
                <div className="chip-popover-empty">暂无步骤</div>
              ) : (
                ops.map((op, idx) => {
                  const executorName = op._executor?.name
                  return (
                    <div key={idx} className="chip-popover-item">
                      <span className="chip-popover-dot" style={{ background: statusColor }} />
                      <div className="chip-popover-info">
                        <span className="chip-popover-name">{op.name}</span>
                        <span className="chip-popover-task">{op._taskName}</span>
                        <span className="chip-popover-executor">
                          <TeamOutlined style={{ fontSize: 10, marginRight: 3 }} />
                          {executorName || '未分配'}
                        </span>
                      </div>
                      {op._department && <span className="chip-popover-dept">{op._department}</span>}
                    </div>
                  )
                })
              )}
            </div>
          )

          return (
            <div key={`phase-${phase.id}`} className="phase-block">
              <div className="phase-header" onClick={() => handleNodeClick({
                type: 'phase',
                name: phase.name,
                status: phase.status,
                mode: phase.execution_mode,
                plannedDuration: phase.planned_duration,
                stages: phase.stages
              })}>
                <div className="phase-header-left">
                  <div className="node-number">{phaseIdx + 1}</div>
                  <div className="node-content">
                    <div className="node-name">{phase.name}</div>
                    <div className="node-meta">
                      <span className="meta-tag mode">{phase.execution_mode === 'parallel' ? '并行' : '串行'}</span>
                      <Tag 
                        color={getStatusColor(phase.status)} 
                        className="node-status-tag"
                        icon={getStatusIcon(phase.status)}
                      >
                        {getStatusText(phase.status)}
                      </Tag>
                    </div>
                  </div>
                </div>
                <div className="phase-stats" onClick={(e) => e.stopPropagation()}>
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={renderOpList(completedOpList, '#10B981')}
                    title={<span className="chip-popover-title">已完成步骤 ({completedOps})</span>}
                    overlayClassName="chip-popover"
                  >
                    <div className="stat-chip completed clickable">
                      <span className="chip-num">{completedOps}</span>
                      <span className="chip-label">已完成</span>
                    </div>
                  </Popover>
                  <Popover
                    trigger="click"
                    placement="bottom"
                    content={renderOpList(inProgressOpList, '#00D9FF')}
                    title={<span className="chip-popover-title">进行中步骤 ({inProgressOps})</span>}
                    overlayClassName="chip-popover"
                  >
                    <div className="stat-chip in-progress clickable">
                      <span className="chip-num">{inProgressOps}</span>
                      <span className="chip-label">进行中</span>
                    </div>
                  </Popover>
                  <Popover
                    trigger="click"
                    placement="bottomRight"
                    content={renderOpList(pendingOpList, '#6B7280')}
                    title={<span className="chip-popover-title">待开始步骤 ({pendingOps})</span>}
                    overlayClassName="chip-popover"
                  >
                    <div className="stat-chip pending clickable">
                      <span className="chip-num">{pendingOps}</span>
                      <span className="chip-label">待开始</span>
                    </div>
                  </Popover>
                </div>
                <div className="phase-header-right">
                  <div className="phase-progress-ring">
                    <Progress 
                      type="circle" 
                      percent={progressPercent} 
                      size={40}
                      strokeColor={getStatusColor(phase.status)}
                      trailColor="#2D3748"
                      format={(p) => <span className="phase-progress-text">{p}%</span>}
                    />
                  </div>
                  <button
                    className={`phase-expand-btn ${isPhaseExpanded(phase.id) ? 'expanded' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePhase(phase.id)
                    }}
                    title={isPhaseExpanded(phase.id) ? '收起详情' : '展开详情'}
                  >
                    <DownOutlined />
                  </button>
                </div>
              </div>

              {isPhaseExpanded(phase.id) && (
                <>
                  {currentStage && (
                    <div className="phase-alert">
                      <span className="alert-icon">▶</span>
                      <span className="alert-text">当前环节: <strong>{currentStage.name}</strong></span>
                      {blockedTasks.length > 0 && (
                        <span className="alert-warning">⚠ {blockedTasks.length}个任务超时</span>
                      )}
                    </div>
                  )}

                  <div className="stages-flow">
                    {(phase.stages || []).map((stage, stageIdx) => {
                  const stageTasks = stage.tasks || []
                  const stageCompleted = stageTasks.filter((t: any) => t.status === 'completed').length
                  const stageTotal = stageTasks.length
                  const stageProgress = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0
                  
                  return (
                    <div key={`stage-${stage.id}`} className="stage-group">
                      {stageIdx > 0 && <div className="flow-arrow"><RightOutlined /></div>}
                      <div 
                        className="stage-node" 
                        onClick={() => handleNodeClick({
                          type: 'stage',
                          name: stage.name,
                          status: stage.status,
                          mode: stage.execution_mode,
                          tasks: stage.tasks
                        })}
                      >
                        <div className="stage-header-row">
                          <div className="stage-dot" style={{ background: getStatusColor(stage.status) }} />
                          <span className="stage-label">{stage.name}</span>
                          <span className="stage-status-badge" style={{ background: getStatusColor(stage.status) }}>
                            {stage.status === 'completed' ? '✓' : stage.status === 'in_progress' ? '▶' : '○'}
                          </span>
                        </div>
                        <div className="stage-summary">
                          <span className="summary-item">
                            <span className="summary-dot completed" />
                            <span>{stageCompleted}</span>
                          </span>
                          <span className="summary-divider">/</span>
                          <span className="summary-item">
                            <span>{stageTotal}</span>
                          </span>
                        </div>
                        {stageTotal > 0 && (
                          <div className="stage-progress-bar">
                            <div 
                              className="stage-progress-fill" 
                              style={{ 
                                width: `${stageProgress}%`,
                                background: getStatusColor(stage.status)
                              }} 
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="tasks-row">
                        {stageTasks.map((task, taskIdx) => {
                          const isTimeout = task.planned_duration && task.actual_duration && task.actual_duration > task.planned_duration
                          return (
                            <div 
                              key={`task-${task.id}`} 
                              className={`task-node ${isTimeout ? 'task-timeout' : ''}`}
                              onClick={() => handleNodeClick({
                                type: 'task',
                                name: task.name,
                                status: task.status,
                                mode: task.execution_mode,
                                department: task.department,
                                plannedDuration: task.planned_duration,
                                actualDuration: task.actual_duration,
                                description: task.description,
                                assignee: task.executor,
                                operations: task.operations
                              })}
                            >
                              <div className="task-dot" style={{ background: isTimeout ? '#EF4444' : getStatusColor(task.status) }} />
                              <span className="task-label">{task.name}</span>
                              {task.department && <span className="task-dept">{task.department}</span>}
                              {isTimeout && <span className="task-timeout-icon">⚠</span>}
                              {(task.operations || []).length > 0 && (
                                <span className="task-op-count">{(task.operations || []).length}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
                </>
              )}

              {phaseIdx < phases.length - 1 && <div className="phase-connector" />}
            </div>
          )
        })}
      </div>

      <Drawer
        title={selectedNode ? (
          <div className="drawer-title">
            <span className="drawer-type">{selectedNode.type === 'phase' ? '阶段' : selectedNode.type === 'stage' ? '环节' : selectedNode.type === 'task' ? '任务' : '操作'}</span>
            <span className="drawer-name">{selectedNode.name}</span>
          </div>
        ) : ''}
        open={drawerVisible}
        onClose={closeDrawer}
        width={400}
        className="node-detail-drawer"
      >
        {selectedNode && (
          <div className="detail-content">
            <div className="detail-status-row">
              <span className="detail-label">状态</span>
              <Tag 
                color={getStatusColor(selectedNode.status)}
                icon={getStatusIcon(selectedNode.status)}
                style={{ fontSize: '14px', padding: '4px 12px' }}
              >
                {getStatusText(selectedNode.status)}
              </Tag>
            </div>

            <Descriptions column={1} bordered size="small" className="detail-desc">
              {selectedNode.mode && (
                <Descriptions.Item label="执行模式">
                  {selectedNode.mode === 'parallel' ? '并行执行' : '串行执行'}
                </Descriptions.Item>
              )}
              {selectedNode.department && (
                <Descriptions.Item label="责任部门">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TeamOutlined style={{ color: '#9333EA' }} />
                    {selectedNode.department}
                  </span>
                </Descriptions.Item>
              )}
              {selectedNode.assignee && (
                <Descriptions.Item label="执行人">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TeamOutlined style={{ color: '#00D9FF' }} />
                    {typeof selectedNode.assignee === 'object' ? selectedNode.assignee.name || '未命名' : selectedNode.assignee}
                  </span>
                </Descriptions.Item>
              )}
              {selectedNode.plannedDuration !== undefined && (
                <Descriptions.Item label="计划时长">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClockCircleOutlined style={{ color: '#F59E0B' }} />
                    {formatDuration(selectedNode.plannedDuration)}
                  </span>
                </Descriptions.Item>
              )}
              {selectedNode.actualDuration !== undefined && selectedNode.actualDuration > 0 && (
                <Descriptions.Item label="实际耗时">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClockCircleOutlined style={{ color: '#10B981' }} />
                    {formatDuration(selectedNode.actualDuration)}
                  </span>
                </Descriptions.Item>
              )}
              {selectedNode.description && (
                <Descriptions.Item label="描述">
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <FileTextOutlined style={{ color: '#00D9FF', marginTop: '3px' }} />
                    {selectedNode.description}
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedNode.type === 'phase' && selectedNode.stages && (
              <div className="detail-children">
                <div className="detail-section-title">环节列表</div>
                {selectedNode.stages.map((stage: any, idx: number) => (
                  <div key={idx} className="detail-child-item" onClick={() => handleNodeClick({
                    type: 'stage',
                    name: stage.name,
                    status: stage.status,
                    mode: stage.execution_mode,
                    tasks: stage.tasks
                  })}>
                    <div className="child-dot" style={{ background: getStatusColor(stage.status) }} />
                    <span className="child-name">{stage.name}</span>
                    <Tag color={getStatusColor(stage.status)} className="child-tag">
                      {getStatusText(stage.status)}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {selectedNode.type === 'stage' && selectedNode.tasks && (
              <div className="detail-children">
                <div className="detail-section-title">任务列表</div>
                {selectedNode.tasks.map((task: any, idx: number) => (
                  <div key={idx} className="detail-child-item" onClick={() => handleNodeClick({
                    type: 'task',
                    name: task.name,
                    status: task.status,
                    mode: task.execution_mode,
                    department: task.department,
                    plannedDuration: task.planned_duration,
                    actualDuration: task.actual_duration,
                    description: task.description,
                    assignee: task.executor,
                    operations: task.operations
                  })}>
                    <div className="child-dot" style={{ background: getStatusColor(task.status) }} />
                    <span className="child-name">{task.name}</span>
                    <Tag color={getStatusColor(task.status)} className="child-tag">
                      {getStatusText(task.status)}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {selectedNode.type === 'task' && selectedNode.operations && selectedNode.operations.length > 0 && (
              <div className="detail-children">
                <div className="detail-section-title">操作步骤 ({selectedNode.operations.length})</div>
                {selectedNode.operations.map((op: any, idx: number) => (
                  <div key={idx} className="detail-operation-item" onClick={() => handleNodeClick({
                    type: 'operation',
                    name: op.name,
                    status: op.status,
                    description: op.description,
                    plannedDuration: op.planned_duration
                  })}>
                    <div className="op-dot" style={{ background: getStatusColor(op.status) }} />
                    <span className="op-name">{op.name}</span>
                    <span className="op-duration">{formatDuration(op.planned_duration)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <style>
        {`
          @import url('https://fonts.font.im/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono:wght@400;500;600;700&display=swap');

          .hierarchy-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            gap: 16px;
          }
          .loading-text {
            color: #9CA3AF !important;
            font-family: 'Share Tech Mono', monospace;
          }

          .hierarchy-container {
            background: transparent;
            display: flex;
            flex-direction: column;
            height: calc(100vh - 340px);
            min-height: 300px;
            overflow: hidden;
          }
          .hierarchy-container .ant-typography {
            color: #E5E7EB !important;
          }

          .hierarchy-header {
            display: flex;
            align-items: center;
            padding: 14px 24px;
            background: linear-gradient(135deg, #1A1F3A 0%, #151A30 100%);
            border: 1px solid #2D3748;
            border-radius: 12px;
            margin-bottom: 12px;
            position: relative;
            flex-shrink: 0;
            overflow: hidden;
            gap: 20px;
          }
          .hierarchy-header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00D9FF, #9333EA, transparent);
            border-radius: 12px 12px 0 0;
          }
          .hierarchy-header::after {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: radial-gradient(ellipse at top left, rgba(0, 217, 255, 0.04), transparent 60%);
            pointer-events: none;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
            position: relative;
            z-index: 1;
            flex: 1;
            min-width: 0;
          }
          .template-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #00D9FF 0%, #9333EA 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: #0A0E27;
            flex-shrink: 0;
            box-shadow: 0 4px 16px rgba(0, 217, 255, 0.25);
          }
          .header-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            min-width: 0;
            text-align: left;
            align-items: flex-start;
          }
          .template-name {
            color: #00D9FF !important;
            font-family: 'Orbitron', sans-serif;
            font-size: 15px !important;
            font-weight: 700;
            margin: 0 !important;
            line-height: 1.3 !important;
            text-shadow: 0 0 12px rgba(0, 217, 255, 0.4);
            letter-spacing: 0.3px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
          }
          .header-stats {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            background: rgba(0, 217, 255, 0.06);
            border: 1px solid rgba(0, 217, 255, 0.12);
            border-radius: 6px;
            transition: all 0.2s ease;
          }
          .stat-item:hover {
            background: rgba(0, 217, 255, 0.12);
            border-color: rgba(0, 217, 255, 0.25);
            transform: translateY(-1px);
          }
          .stat-label {
            color: #9CA3AF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .stat-value {
            color: #00D9FF;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 700;
            min-width: 18px;
            text-align: center;
          }
          .stat-divider {
            display: none;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            z-index: 1;
            flex-shrink: 0;
          }
          .progress-ring {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .progress-num {
            color: #00D9FF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            font-weight: 600;
          }
          .refresh-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 217, 255, 0.05);
            border: 1px solid rgba(0, 217, 255, 0.3);
            color: #00D9FF;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 13px;
            border-radius: 6px;
            padding: 0 14px;
            height: 32px;
            transition: all 0.2s ease;
            cursor: pointer;
          }
          .refresh-btn:hover {
            background: rgba(0, 217, 255, 0.12);
            border-color: #00D9FF;
            box-shadow: 0 0 12px rgba(0, 217, 255, 0.3);
            transform: translateY(-1px);
          }
          .refresh-btn:active {
            transform: translateY(0);
          }
          .header-expand-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(0, 217, 255, 0.05);
            border: 1px solid rgba(0, 217, 255, 0.25);
            color: #00D9FF;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            font-size: 13px;
            border-radius: 6px;
            padding: 0 14px;
            height: 32px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .header-expand-toggle:hover {
            background: rgba(0, 217, 255, 0.12);
            border-color: #00D9FF;
            transform: translateY(-1px);
          }
          .header-expand-toggle:active {
            transform: translateY(0);
          }
          .header-expand-toggle span {
            line-height: 1;
          }

          .flow-overview {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          }

          .phase-block {
            background: #1A1F3A;
            border: 1px solid #2D3748;
            border-radius: 12px;
            padding: 10px 16px;
            position: relative;
            flex-shrink: 0;
          }

          .phase-header {
            display: flex;
            align-items: center;
            gap: 16px;
            cursor: pointer;
            padding: 8px 0;
            flex-shrink: 0;
          }
          .phase-header:hover .node-name {
            color: #00D9FF;
          }
          .phase-header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
          }
          .phase-header-right {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .phase-expand-btn {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 217, 255, 0.08);
            border: 1px solid rgba(0, 217, 255, 0.25);
            border-radius: 6px;
            color: #00D9FF;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.25s ease;
            flex-shrink: 0;
          }
          .phase-expand-btn:hover {
            background: rgba(0, 217, 255, 0.18);
            border-color: #00D9FF;
          }
          .phase-expand-btn.expanded {
            transform: rotate(180deg);
            background: rgba(0, 217, 255, 0.15);
          }
          .phase-stats {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
          .phase-progress-text {
            color: #E5E7EB;
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
          }
          .stat-chip {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 3px 8px;
            border-radius: 6px;
            min-width: 40px;
          }
          .stat-chip.completed {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
          }
          .stat-chip.in-progress {
            background: rgba(0, 217, 255, 0.15);
            border: 1px solid rgba(0, 217, 255, 0.3);
          }
          .stat-chip.pending {
            background: rgba(107, 114, 128, 0.15);
            border: 1px solid rgba(107, 114, 128, 0.3);
          }
          .chip-num {
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 700;
            line-height: 1;
          }
          .stat-chip.completed .chip-num { color: #10B981; }
          .stat-chip.in-progress .chip-num { color: #00D9FF; }
          .stat-chip.pending .chip-num { color: #6B7280; }
          .chip-label {
            font-family: 'Share Tech Mono', monospace;
            font-size: 9px;
            color: #9CA3AF;
            line-height: 1.2;
          }
          .stat-chip.clickable {
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .stat-chip.clickable:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }
          .stat-chip.clickable.completed:hover {
            border-color: #10B981;
            background: rgba(16, 185, 129, 0.25);
          }
          .stat-chip.clickable.in-progress:hover {
            border-color: #00D9FF;
            background: rgba(0, 217, 255, 0.25);
          }
          .stat-chip.clickable.pending:hover {
            border-color: #6B7280;
            background: rgba(107, 114, 128, 0.25);
          }
        `}
      </style>
      <style>
        {`
          .chip-popover .ant-popover-inner {
            background: #1F2937;
            border: 1px solid #374151;
            border-radius: 8px;
          }
          .chip-popover .ant-popover-arrow::before {
            background: #1F2937;
          }
          .chip-popover-title {
            color: #E5E7EB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 600;
          }
          .chip-popover-list {
            min-width: 180px;
            max-height: 240px;
            overflow-y: auto;
          }
          .chip-popover-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 6px 0;
            border-bottom: 1px solid #374151;
          }
          .chip-popover-item:last-child {
            border-bottom: none;
          }
          .chip-popover-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
            margin-top: 5px;
          }
          .chip-popover-name {
            color: #E5E7EB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 13px;
            flex: 1;
          }
          .chip-popover-info {
            display: flex;
            flex-direction: column;
            flex: 1;
            gap: 2px;
          }
          .chip-popover-executor {
            color: #9CA3AF;
            font-family: 'Rajdhani', sans-serif;
            font-size: 11px;
            display: flex;
            align-items: center;
          }
          .chip-popover-task {
            color: #6B7280;
            font-family: 'Rajdhani', sans-serif;
            font-size: 11px;
            padding-left: 13px;
          }
          .chip-popover-dept {
            color: #9CA3AF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            background: rgba(156, 163, 175, 0.15);
            padding: 1px 5px;
            border-radius: 3px;
          }
          .chip-popover-empty {
            color: #6B7280;
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            text-align: center;
            padding: 8px 0;
          }

          .phase-alert {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 10px;
            background: rgba(0, 217, 255, 0.08);
            border: 1px solid rgba(0, 217, 255, 0.2);
            border-radius: 6px;
            margin: 6px 0;
            flex-shrink: 0;
          }
          .alert-icon {
            color: #00D9FF;
            font-size: 10px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .alert-text {
            color: #D1D5DB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
          }
          .alert-text strong {
            color: #00D9FF;
          }
          .alert-warning {
            color: #F59E0B;
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            margin-left: auto;
          }

          .phase-node {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 4px 0;
            flex-shrink: 0;
          }
          .phase-node:hover {
            opacity: 0.9;
          }
          .node-number {
            width: 28px;
            height: 28px;
            background: rgba(0, 217, 255, 0.1);
            border: 2px solid #00D9FF;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00D9FF;
            font-family: 'Orbitron', sans-serif;
            font-size: 13px;
            font-weight: 700;
            flex-shrink: 0;
          }
          .node-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .node-name {
            color: #E5E7EB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }
          .node-meta {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .meta-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 9px;
            padding: 0 5px;
            border-radius: 3px;
            line-height: 16px;
          }
          .meta-tag.mode {
            background: rgba(147, 51, 234, 0.2);
            color: #C084FC;
            border: 1px solid rgba(147, 51, 234, 0.3);
          }
          .node-status-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
            line-height: 18px;
            padding: 0 6px;
          }
          .node-progress {
            width: 70px;
            flex-shrink: 0;
          }

          .stages-flow {
            display: flex;
            align-items: flex-start;
            gap: 4px;
            padding: 6px 0 2px 38px;
            flex-wrap: wrap;
            overflow-x: auto;
          }

          .stage-group {
            display: flex;
            align-items: flex-start;
            gap: 4px;
          }

          .flow-arrow {
            color: #4B5563;
            font-size: 10px;
            display: flex;
            align-items: center;
            padding-top: 6px;
          }

          .stage-node {
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding: 6px 10px;
            background: rgba(26, 31, 58, 0.8);
            border: 1px solid #2D3748;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 90px;
          }
          .stage-node:hover {
            border-color: #00D9FF;
            background: rgba(0, 217, 255, 0.05);
          }
          .stage-header-row {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .stage-summary {
            display: flex;
            align-items: center;
            gap: 4px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            color: #9CA3AF;
          }
          .summary-item {
            display: flex;
            align-items: center;
            gap: 2px;
          }
          .summary-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
          }
          .summary-dot.completed {
            background: #10B981;
          }
          .summary-divider {
            color: #4B5563;
          }
          .stage-progress-bar {
            height: 3px;
            background: #2D3748;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 2px;
          }
          .stage-progress-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s ease;
          }
          .stage-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .stage-label {
            color: #D1D5DB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            font-weight: 500;
          }
          .stage-status-badge {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #fff;
            flex-shrink: 0;
          }

          .tasks-row {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-top: 2px;
          }

          .task-node {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 1px 6px;
            background: rgba(26, 31, 58, 0.5);
            border: 1px solid transparent;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }
          .task-node:hover {
            border-color: #00D9FF;
            background: rgba(0, 217, 255, 0.05);
          }
          .task-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .task-label {
            color: #9CA3AF;
            font-family: 'Rajdhani', sans-serif;
            font-size: 11px;
          }
          .task-dept {
            color: #6B7280;
            font-family: 'Share Tech Mono', monospace;
            font-size: 9px;
            padding: 0 4px;
            background: rgba(107, 114, 128, 0.15);
            border-radius: 3px;
          }
          .task-timeout-icon {
            color: #EF4444;
            font-size: 10px;
            animation: blink 1s infinite;
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .task-node.task-timeout {
            border-color: rgba(239, 68, 68, 0.3);
            background: rgba(239, 68, 68, 0.08);
          }
          .task-op-count {
            background: rgba(147, 51, 234, 0.3);
            color: #C084FC;
            font-family: 'Share Tech Mono', monospace;
            font-size: 8px;
            padding: 0 3px;
            border-radius: 3px;
            line-height: 14px;
          }

          .phase-connector {
            height: 6px;
            border-left: 2px dashed #2D3748;
            margin-left: 20px;
          }

          .node-detail-drawer .ant-drawer-header {
            background: #1A1F3A;
            border-bottom: 1px solid #2D3748;
          }
          .node-detail-drawer .ant-drawer-body {
            background: #0A0E27;
            padding: 20px;
          }
          .node-detail-drawer .ant-descriptions-item-label {
            background: rgba(0, 217, 255, 0.05) !important;
            color: #9CA3AF !important;
          }
          .node-detail-drawer .ant-descriptions-item-content {
            background: #1A1F3A !important;
            color: #E5E7EB !important;
          }

          .drawer-title {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .drawer-type {
            background: rgba(0, 217, 255, 0.1);
            color: #00D9FF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 4px;
          }
          .drawer-name {
            color: #E5E7EB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 18px;
            font-weight: 600;
          }

          .detail-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .detail-status-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #1A1F3A;
            border-radius: 12px;
            border: 1px solid #2D3748;
          }
          .detail-label {
            color: #9CA3AF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 13px;
          }
          .detail-desc {
            margin-top: 4px;
          }

          .detail-children {
            margin-top: 4px;
          }
          .detail-section-title {
            color: #00D9FF;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #2D3748;
          }
          .detail-child-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #1A1F3A;
            border: 1px solid #2D3748;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .detail-child-item:hover {
            border-color: #00D9FF;
          }
          .child-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .child-name {
            color: #E5E7EB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            flex: 1;
          }
          .child-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
          }

          .detail-operation-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: rgba(26, 31, 58, 0.7);
            border: 1px solid #2D3748;
            border-radius: 6px;
            margin-bottom: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .detail-operation-item:hover {
            border-color: #9333EA;
          }
          .op-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .op-name {
            color: #D1D5DB;
            font-family: 'Rajdhani', sans-serif;
            font-size: 13px;
            flex: 1;
          }
          .op-duration {
            color: #9CA3AF;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
          }
        `}
      </style>
    </div>
  )
}

export default WorkflowHierarchyDisplay
