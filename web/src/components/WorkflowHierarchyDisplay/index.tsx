import React, { useState, useEffect } from 'react'
import { Typography, Tag, Progress, Space, Button, Empty, Spin } from 'antd'
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import { workflowService } from '../../services/workflow'
import type { Phase, Stage, Task, Operation, DrillTemplateWithPhases } from '../../types'

const { Text, Title } = Typography

interface WorkflowHierarchyDisplayProps {
  templateId: number
  drillId?: number
  onRefresh?: () => void
}

const WorkflowHierarchyDisplay: React.FC<WorkflowHierarchyDisplayProps> = ({ 
  templateId,
  drillId,
  onRefresh
}) => {
  const [template, setTemplate] = useState<DrillTemplateWithPhases | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadHierarchy()
  }, [templateId])

  const loadHierarchy = async () => {
    setLoading(true)
    try {
      const data = await workflowService.getTemplateFullHierarchy(templateId)
      setTemplate(data)
    } catch (error) {
      console.error('加载层级结构失败:', error)
    }
    setLoading(false)
  }

  const handleRefresh = () => {
    loadHierarchy()
    if (onRefresh) {
      onRefresh()
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#6B7280',
      in_progress: '#00D9FF',
      paused: '#F59E0B',
      completed: '#10B981',
      failed: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '待开始',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  const getExecutionModeText = (mode: string) => {
    return mode === 'serial' ? '串行' : '并行'
  }

  const calculateProgress = (status: string) => {
    if (status === 'completed') return 100
    if (status === 'in_progress') return 50
    if (status === 'paused') return 25
    return 0
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0秒'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`
    }
    return `${secs}秒`
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-grid">
          <div className="grid-line"></div>
          <div className="grid-line"></div>
        </div>
        <div className="loading-content">
          <div className="loading-icon">
            <BranchesOutlined />
          </div>
          <Text className="loading-text">正在加载流程结构...</Text>
        </div>
      </div>
    )
  }

  if (!template || !template.phases || template.phases.length === 0) {
    return (
      <div className="empty-container">
        <div className="empty-icon">
          <BranchesOutlined />
        </div>
        <Title level={3}>暂无流程结构</Title>
        <Text className="empty-desc">请先在模板管理中配置层级结构</Text>
        <Button 
          className="action-button"
          onClick={() => window.location.href = '/admin/templates'}
          icon={<BranchesOutlined />}
        >
          配置流程结构
        </Button>
      </div>
    )
  }

  return (
    <div className="workflow-container">
      <div className="workflow-header">
        <div className="header-left">
          <div className="template-icon">
            <ThunderboltOutlined />
          </div>
          <div className="template-info">
            <Title level={2} className="template-name">{template.name}</Title>
            <div className="template-meta">
              <div className="meta-item">
                <ApiOutlined className="meta-icon" />
                <Text className="meta-text">流程可视化</Text>
              </div>
              <div className="meta-item">
                <BranchesOutlined className="meta-icon" />
                <Text className="meta-text">{template.phases.length} 个阶段</Text>
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            className="refresh-button"
          >
            刷新数据
          </Button>
        </div>
      </div>

      <div className="workflow-content">
        {template.phases.map((phase, phaseIndex) => (
          <div key={`phase-${phase.id}`} className="phase-section">
            <div className="phase-header">
              <div className="phase-number">
                <Text className="number-text">{phase.order}</Text>
              </div>
              <div className="phase-info">
                <div className="phase-title-row">
                  <Title level={3} className="phase-name">{phase.name}</Title>
                  <div className="phase-status">
                    <div 
                      className="status-indicator"
                      style={{ background: getStatusColor(phase.status) }}
                    />
                    <Tag color={getStatusColor(phase.status)} className="status-tag">
                      {getStatusText(phase.status)}
                    </Tag>
                  </div>
                </div>
                <div className="phase-meta">
                  <Tag color={phase.execution_mode === 'serial' ? 'cyan' : 'purple'} className="mode-tag">
                    {getExecutionModeText(phase.execution_mode)}
                  </Tag>
                  {phase.duration_seconds > 0 && (
                    <div className="duration-info">
                      <ClockCircleOutlined className="duration-icon" />
                      <Text className="duration-text">{formatDuration(phase.duration_seconds)}</Text>
                    </div>
                  )}
                  <div className="progress-info">
                    <Progress 
                      percent={calculateProgress(phase.status)} 
                      strokeColor={getStatusColor(phase.status)}
                      trailColor="#2D3748"
                      showInfo={false}
                      className="progress-bar"
                    />
                    <Text className="progress-text">{calculateProgress(phase.status)}%</Text>
                  </div>
                </div>
              </div>
            </div>

            {phase.stages && phase.stages.length > 0 && (
              <div className="stages-container">
                <div className="connection-line"></div>
                {phase.stages.map((stage, stageIndex) => (
                  <div key={`stage-${stage.id}`} className="stage-section">
                    <div className="stage-header">
                      <div className="stage-number">
                        <Text className="number-text">{stage.order}</Text>
                      </div>
                      <div className="stage-info">
                        <div className="stage-title-row">
                          <Title level={4} className="stage-name">{stage.name}</Title>
                          <div className="stage-status">
                            <div 
                              className="status-indicator-small"
                              style={{ background: getStatusColor(stage.status) }}
                            />
                            <Tag color={getStatusColor(stage.status)} className="status-tag-small">
                              {getStatusText(stage.status)}
                            </Tag>
                          </div>
                        </div>
                        <div className="stage-meta">
                          <Tag color={stage.execution_mode === 'serial' ? 'cyan' : 'purple'} className="mode-tag-small">
                            {getExecutionModeText(stage.execution_mode)}
                          </Tag>
                          <div className="progress-info-small">
                            <Progress 
                              percent={calculateProgress(stage.status)} 
                              strokeColor={getStatusColor(stage.status)}
                              trailColor="#2D3748"
                              showInfo={false}
                              className="progress-bar-small"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {stage.tasks && stage.tasks.length > 0 && (
                      <div className="tasks-grid">
                        {stage.tasks.map((task, taskIndex) => (
                          <div key={`task-${task.id}`} className="task-card">
                            <div className="task-header">
                              <div className="task-number">
                                <Text className="number-text-small">{task.order}</Text>
                              </div>
                              <div className="task-status-icon">
                                {task.status === 'completed' && <CheckCircleOutlined style={{ color: getStatusColor(task.status) }} />}
                                {task.status === 'in_progress' && <PlayCircleOutlined style={{ color: getStatusColor(task.status) }} />}
                                {task.status === 'paused' && <PauseCircleOutlined style={{ color: getStatusColor(task.status) }} />}
                                {task.status === 'pending' && <ClockCircleOutlined style={{ color: getStatusColor(task.status) }} />}
                              </div>
                            </div>
                            
                            <div className="task-content">
                              <Title level={5} className="task-name">{task.name}</Title>
                              <div className="task-tags">
                                <Tag color={task.execution_mode === 'serial' ? 'cyan' : 'purple'} className="task-mode-tag">
                                  {getExecutionModeText(task.execution_mode)}
                                </Tag>
                                <Tag color={getStatusColor(task.status)} className="task-status-tag">
                                  {getStatusText(task.status)}
                                </Tag>
                              </div>
                              
                              {task.department && (
                                <div className="task-department">
                                  <TeamOutlined className="department-icon" />
                                  <Text className="department-text">{task.department}</Text>
                                </div>
                              )}
                              
                              <div className="task-time">
                                {task.estimated_duration > 0 && (
                                  <div className="time-item">
                                    <ClockCircleOutlined className="time-icon" />
                                    <Text className="time-text">预计: {task.estimated_duration}分钟</Text>
                                  </div>
                                )}
                                {task.duration_seconds > 0 && (
                                  <div className="time-item">
                                    <CheckCircleOutlined className="time-icon" />
                                    <Text className="time-text">实际: {formatDuration(task.duration_seconds)}</Text>
                                  </div>
                                )}
                              </div>
                            </div>

                            {task.operations && task.operations.length > 0 && (
                              <div className="operations-container">
                                <div className="operations-header">
                                  <Text className="operations-label">操作步骤</Text>
                                  <Text className="operations-count">{task.operations.length}</Text>
                                </div>
                                <div className="operations-list">
                                  {task.operations.map((operation) => (
                                    <div key={`operation-${operation.id}`} className="operation-item">
                                      <div 
                                        className="operation-status-dot"
                                        style={{ background: getStatusColor(operation.status) }}
                                      />
                                      <Text className="operation-name">{operation.name}</Text>
                                      <Tag color={getStatusColor(operation.status)} className="operation-status-tag">
                                        {getStatusText(operation.status)}
                                      </Tag>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono:wght@400;500;600;700&display=swap');

          :root {
            --primary-cyan: #00D9FF;
            --primary-purple: #9333EA;
            --dark-bg: #0A0E27;
            --card-bg: #1A1F3A;
            --text-primary: #E5E7EB;
            --text-secondary: #9CA3AF;
            --border-color: #2D3748;
            --success-green: #10B981;
            --warning-orange: #F59E0B;
            --error-red: #EF4444;
          }

          .workflow-container {
            background: transparent;
          }

          .workflow-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            margin-bottom: 32px;
            position: relative;
          }

          .workflow-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple));
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .template-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            color: var(--dark-bg);
          }

          .template-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .template-name {
            color: var(--text-primary);
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: 700;
            margin: 0;
          }

          .template-meta {
            display: flex;
            gap: 16px;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .meta-icon {
            color: var(--primary-cyan);
            font-size: 16px;
          }

          .meta-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
          }

          .refresh-button {
            background: transparent;
            border: 1px solid var(--primary-cyan);
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            letter-spacing: 1px;
            transition: all 0.3s ease;
          }

          .refresh-button:hover {
            background: rgba(0, 217, 255, 0.1);
            border-color: var(--primary-purple);
            color: var(--primary-purple);
          }

          .workflow-content {
            display: flex;
            flex-direction: column;
            gap: 32px;
          }

          .phase-section {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 32px;
            position: relative;
          }

          .phase-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--primary-cyan);
          }

          .phase-header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 24px;
          }

          .phase-number {
            width: 50px;
            height: 50px;
            background: rgba(0, 217, 255, 0.1);
            border: 2px solid var(--primary-cyan);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .number-text {
            color: var(--primary-cyan);
            font-family: 'Orbitron', sans-serif;
            font-size: 24px;
            font-weight: 700;
          }

          .phase-info {
            flex: 1;
          }

          .phase-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }

          .phase-name {
            color: var(--text-primary);
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
          }

          .phase-status {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          .status-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            border-radius: 8px;
          }

          .phase-meta {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .mode-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            border-radius: 6px;
          }

          .duration-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .duration-icon {
            color: var(--warning-orange);
            font-size: 16px;
          }

          .duration-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
          }

          .progress-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .progress-bar {
            width: 100px;
            height: 6px;
            border-radius: 3px;
          }

          .progress-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
          }

          .stages-container {
            position: relative;
          }

          .connection-line {
            position: absolute;
            left: 25px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, var(--primary-cyan), var(--primary-purple));
            opacity: 0.3;
          }

          .stage-section {
            margin-left: 60px;
            margin-bottom: 24px;
            position: relative;
          }

          .stage-section::before {
            content: '';
            position: absolute;
            left: -35px;
            top: 25px;
            width: 35px;
            height: 2px;
            background: var(--primary-cyan);
            opacity: 0.5;
          }

          .stage-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
          }

          .stage-number {
            width: 40px;
            height: 40px;
            background: rgba(147, 51, 234, 0.1);
            border: 2px solid var(--primary-purple);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .stage-info {
            flex: 1;
          }

          .stage-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .stage-name {
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          .stage-status {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .status-indicator-small {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }

          .status-tag-small {
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            border-radius: 6px;
          }

          .stage-meta {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .mode-tag-small {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
          }

          .progress-info-small {
            width: 80px;
          }

          .progress-bar-small {
            height: 4px;
            border-radius: 2px;
          }

          .tasks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
          }

          .task-card {
            background: rgba(26, 31, 58, 0.5);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px;
            position: relative;
            transition: all 0.3s ease;
          }

          .task-card:hover {
            border-color: var(--primary-cyan);
            transform: translateY(-2px);
          }

          .task-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 3px;
            height: 100%;
            background: var(--primary-cyan);
            border-radius: 12px 0 0 12px;
          }

          .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .task-number {
            width: 30px;
            height: 30px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .number-text-small {
            color: var(--primary-cyan);
            font-family: 'Orbitron', sans-serif;
            font-size: 16px;
            font-weight: 600;
          }

          .task-status-icon {
            font-size: 20px;
          }

          .task-content {
            margin-bottom: 12px;
          }

          .task-name {
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .task-tags {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }

          .task-mode-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
          }

          .task-status-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
          }

          .task-department {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .department-icon {
            color: var(--primary-purple);
            font-size: 14px;
          }

          .department-text {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
          }

          .task-time {
            display: flex;
            gap: 12px;
          }

          .time-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .time-icon {
            color: var(--text-secondary);
            font-size: 12px;
          }

          .time-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
          }

          .operations-container {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color);
          }

          .operations-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .operations-label {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
          }

          .operations-count {
            color: var(--primary-cyan);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
          }

          .operations-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .operation-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 8px;
            background: rgba(26, 31, 58, 0.3);
            border-radius: 6px;
          }

          .operation-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          .operation-name {
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            flex: 1;
          }

          .operation-status-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 10px;
            border-radius: 4px;
          }

          .loading-container {
            padding: 60px;
            text-align: center;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
          }

          .loading-grid {
            position: relative;
            height: 60px;
            margin-bottom: 24px;
          }

          .grid-line {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(0, 217, 255, 0.3);
            animation: loading-line 2s ease-in-out infinite;
          }

          .grid-line:nth-child(2) {
            top: 30%;
            animation-delay: 0.5s;
          }

          @keyframes loading-line {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }

          .loading-content {
            text-align: center;
          }

          .loading-icon {
            width: 60px;
            height: 60px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            color: var(--primary-cyan);
            margin-bottom: 16px;
            animation: loading-rotate 2s linear infinite;
          }

          @keyframes loading-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-text {
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-size: 16px;
          }

          .empty-container {
            padding: 60px;
            text-align: center;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: var(--primary-cyan);
            margin-bottom: 24px;
          }

          .empty-desc {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            margin-bottom: 24px;
          }

          .action-button {
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border: none;
            color: var(--dark-bg);
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            letter-spacing: 1px;
            padding: 12px 32px;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
          }

          @media (max-width: 768px) {
            .workflow-header {
              flex-direction: column;
              gap: 16px;
            }

            .tasks-grid {
              grid-template-columns: 1fr;
            }

            .phase-header,
            .stage-header {
              flex-direction: column;
              gap: 12px;
            }
          }
        `}
      </style>
    </div>
  )
}

export default WorkflowHierarchyDisplay