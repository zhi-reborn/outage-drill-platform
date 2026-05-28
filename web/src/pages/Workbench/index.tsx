import React, { useState, useEffect } from 'react'
import { Button, Typography, Space, Tag, List, message, Progress, Card } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, ThunderboltOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { useDrill } from '../../hooks/useDrill'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppStore } from '../../store'
import { StepExecution } from '../../types'

const { Title, Text, Paragraph } = Typography

const Workbench: React.FC = () => {
  const { myTasks } = useAppStore()
  const { fetchMyTasks, startExecution, completeExecution, loading } = useDrill()
  const { subscribe, unsubscribe } = useWebSocket()
  const [currentTask, setCurrentTask] = useState<StepExecution | null>(null)
  const [countdown, setCountdown] = useState<number>(0)

  useEffect(() => {
    fetchMyTasks()

    const handleTaskUpdate = () => {
      fetchMyTasks()
    }

    subscribe('step_update', handleTaskUpdate)

    return () => {
      unsubscribe('step_update', handleTaskUpdate)
    }
  }, [])

  useEffect(() => {
    const pendingTask = myTasks.find(t => t.status === 'pending')
    const inProgressTask = myTasks.find(t => t.status === 'in_progress')
    setCurrentTask(inProgressTask || pendingTask || null)
  }, [myTasks])

  useEffect(() => {
    if (currentTask && currentTask.status === 'in_progress') {
      const timer = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 0)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentTask])

  const handleStart = async () => {
    if (currentTask) {
      await startExecution(currentTask.id)
      message.success('开始执行任务')
    }
  }

  const handleComplete = async () => {
    if (currentTask) {
      await completeExecution(currentTask.id)
      message.success('任务已完成')
    }
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#6B7280',
      in_progress: '#00D9FF',
      completed: '#10B981',
      paused: '#F59E0B'
    }
    return colors[status] || '#6B7280'
  }

  return (
    <div className="workbench-container">
      <div className="workbench-background">
        <div className="grid-overlay"></div>
      </div>

      <div className="workbench-content">
        <div className="workbench-header">
          <div className="header-icon">
            <ThunderboltOutlined />
          </div>
          <div className="header-text">
            <Title level={1} className="header-title">
              参演工作台
            </Title>
            <Text className="header-subtitle">
              PARTICIPANT WORKBENCH
            </Text>
          </div>
        </div>

        {currentTask && (
          <div className="current-task-card">
            <div className="task-header">
              <div className="task-icon">
                {currentTask.status === 'in_progress' ? (
                  <PlayCircleOutlined style={{ color: getStatusColor(currentTask.status) }} />
                ) : (
                  <ClockCircleOutlined style={{ color: getStatusColor(currentTask.status) }} />
                )}
              </div>
              <div className="task-info">
                <Title level={3} className="task-title">
                  当前任务: {currentTask.step_name}
                </Title>
                <Space className="task-meta">
                  <Text className="meta-item">
                    演练: {currentTask.drill?.name}
                  </Text>
                  <Text className="meta-item">
                    步骤: {currentTask.step_order}
                  </Text>
                  <Tag color={currentTask.status === 'in_progress' ? 'processing' : 'default'}>
                    {currentTask.status === 'in_progress' ? '进行中' : '待开始'}
                  </Tag>
                </Space>
              </div>
            </div>

            {currentTask.drill?.template?.steps[currentTask.step_order - 1]?.guide && (
              <div className="guide-section">
                <div className="guide-header">
                  <Text className="guide-label">操作指引</Text>
                </div>
                <div className="guide-content">
                  <Paragraph className="guide-text">
                    {currentTask.drill.template.steps[currentTask.step_order - 1].guide}
                  </Paragraph>
                </div>
              </div>
            )}

            {currentTask.status === 'in_progress' && countdown > 0 && (
              <div className="countdown-section">
                <div className="countdown-header">
                  <ClockCircleOutlined className="countdown-icon" />
                  <Text className="countdown-label">剩余时间</Text>
                </div>
                <div className="countdown-display">
                  <Text className="countdown-value" style={{ color: countdown < 60 ? '#EF4444' : '#10B981' }}>
                    {formatCountdown(countdown)}
                  </Text>
                  <Progress 
                    percent={(countdown / 600) * 100}
                    strokeColor={countdown < 60 ? '#EF4444' : '#10B981'}
                    trailColor="#2D3748"
                    showInfo={false}
                    className="countdown-progress"
                  />
                </div>
              </div>
            )}

            <div className="task-actions">
              {currentTask.status === 'pending' && (
                <Button 
                  type="primary" 
                  onClick={handleStart} 
                  loading={loading}
                  className="cyber-button"
                  icon={<PlayCircleOutlined />}
                >
                  开始执行
                </Button>
              )}
              {currentTask.status === 'in_progress' && (
                <Button 
                  type="primary" 
                  onClick={handleComplete} 
                  loading={loading}
                  className="cyber-button success"
                  icon={<CheckCircleOutlined />}
                >
                  完成任务
                </Button>
              )}
            </div>
          </div>
        )}

        {!currentTask && (
          <div className="empty-state">
            <div className="empty-icon">
              <ClockCircleOutlined />
            </div>
            <Title level={3} className="empty-title">
              暂无待执行任务
            </Title>
            <Text className="empty-subtitle">
              当前没有分配给您的工作任务
            </Text>
          </div>
        )}

        <div className="history-section">
          <div className="section-header">
            <Title level={4} className="section-title">
              历史任务
            </Title>
            <Text className="section-count">
              {myTasks.filter(t => t.status === 'completed').length} 个已完成
            </Text>
          </div>

          <List
            className="history-list"
            dataSource={myTasks.filter(t => t.status === 'completed')}
            renderItem={(task) => (
              <List.Item className="history-item">
                <div className="item-content">
                  <div className="item-icon">
                    <CheckCircleOutlined style={{ color: '#10B981' }} />
                  </div>
                  <div className="item-info">
                    <Text className="item-name">{task.step_name}</Text>
                    <Text className="item-status">已完成</Text>
                  </div>
                  <div className="item-meta">
                    <Text className="item-duration">耗时: {task.duration_seconds}秒</Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.font.im/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');

          :root {
            --primary-color: #00D9FF;
            --secondary-color: #9333EA;
            --background-dark: #0A0E27;
            --background-card: #1A1F3A;
            --text-primary: #E5E7EB;
            --text-secondary: #9CA3AF;
            --border-color: #2D3748;
            --success-color: #10B981;
            --warning-color: #F59E0B;
            --error-color: #EF4444;
          }

          .workbench-container {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
          }

          .workbench-background {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--background-dark);
            z-index: 0;
          }

          .grid-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
          }

          .workbench-content {
            position: relative;
            z-index: 1;
            max-width: 1200px;
            margin: 0 auto;
            padding: 32px;
          }

          .workbench-header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 48px;
          }

          .header-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: var(--background-dark);
            box-shadow: 0 8px 32px rgba(0, 217, 255, 0.3);
          }

          .header-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 2px;
          }

          .header-subtitle {
            color: var(--primary-color);
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            letter-spacing: 3px;
          }

          .current-task-card {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
          }

          .current-task-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
          }

          .task-header {
            display: flex;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 24px;
          }

          .task-icon {
            width: 48px;
            height: 48px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }

          .task-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .task-meta {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .meta-item {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
          }

          .guide-section {
            background: rgba(0, 217, 255, 0.05);
            border: 1px solid rgba(0, 217, 255, 0.2);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
          }

          .guide-header {
            margin-bottom: 16px;
          }

          .guide-label {
            color: var(--primary-color);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 600;
          }

          .guide-text {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
            line-height: 1.8;
          }

          .countdown-section {
            background: rgba(16, 185, 129, 0.05);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
          }

          .countdown-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .countdown-icon {
            color: var(--success-color);
            font-size: 20px;
          }

          .countdown-label {
            color: var(--success-color);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 600;
          }

          .countdown-display {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .countdown-value {
            color: var(--success-color);
            font-family: 'JetBrains Mono', monospace;
            font-size: 32px;
            font-weight: 600;
          }

          .countdown-progress {
            height: 8px;
            border-radius: 4px;
          }

          .task-actions {
            display: flex;
            gap: 16px;
          }

          .cyber-button {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border: none;
            border-radius: 8px;
            color: var(--background-dark);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 600;
            height: 48px;
            padding: 0 32px;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .cyber-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 217, 255, 0.4);
          }

          .cyber-button.success {
            background: linear-gradient(135deg, var(--success-color), #059669);
          }

          .empty-state {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 64px 32px;
            text-align: center;
            margin-bottom: 32px;
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            background: rgba(107, 114, 128, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: var(--text-secondary);
            margin-bottom: 24px;
          }

          .empty-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .empty-subtitle {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
          }

          .history-section {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 32px;
          }

          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
          }

          .section-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          .section-count {
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
          }

          .history-list {
            border: none;
          }

          .history-item {
            background: rgba(26, 31, 58, 0.5);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
          }

          .item-content {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .item-icon {
            width: 32px;
            height: 32px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          }

          .item-info {
            flex: 1;
          }

          .item-name {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
            font-weight: 500;
            display: block;
          }

          .item-status {
            color: var(--success-color);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 12px;
          }

          .item-meta {
            display: flex;
            align-items: center;
          }

          .item-duration {
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
          }

          @media (max-width: 768px) {
            .workbench-content {
              padding: 16px;
            }

            .header-title {
              font-size: 20px;
            }

            .current-task-card {
              padding: 24px;
            }

            .task-header {
              flex-direction: column;
              gap: 16px;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Workbench