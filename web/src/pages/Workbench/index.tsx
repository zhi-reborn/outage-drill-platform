import React, { useState, useEffect } from 'react'
import { Card, Button, Typography, Space, Tag, List, message } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
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

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Title level={3}>参演工作台</Title>

        {currentTask && (
          <Card
            title={`当前任务: ${currentTask.step_name}`}
            style={{ marginBottom: 24 }}
          >
            <Space direction="vertical" size="large">
              <Text>
                演练名称: {currentTask.drill?.name}
              </Text>
              <Text>
                步骤: {currentTask.step_order}
              </Text>
              <Tag color={currentTask.status === 'in_progress' ? 'warning' : 'default'}>
                {currentTask.status === 'in_progress' ? '进行中' : '待开始'}
              </Tag>

              {currentTask.drill?.template?.steps[currentTask.step_order - 1]?.guide && (
                <Card title="操作指引" size="small">
                  <Paragraph>
                    {currentTask.drill.template.steps[currentTask.step_order - 1].guide}
                  </Paragraph>
                </Card>
              )}

              {currentTask.status === 'in_progress' && countdown > 0 && (
                <Text strong style={{ color: countdown < 60 ? '#f5222d' : '#52c41a' }}>
                  <ClockCircleOutlined /> 剩余时间: {formatCountdown(countdown)}
                </Text>
              )}

              <Space>
                {currentTask.status === 'pending' && (
                  <Button type="primary" onClick={handleStart} loading={loading}>
                    开始执行
                  </Button>
                )}
                {currentTask.status === 'in_progress' && (
                  <Button type="primary" onClick={handleComplete} loading={loading}>
                    完成任务
                  </Button>
                )}
              </Space>
            </Space>
          </Card>
        )}

        {!currentTask && (
          <Card>
            <Text>暂无待执行任务</Text>
          </Card>
        )}

        <Card title="历史任务">
          <List
            dataSource={myTasks.filter(t => t.status === 'completed')}
            renderItem={(task) => (
              <List.Item>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>{task.step_name} - 已完成</Text>
                  <Text type="secondary">耗时: {task.duration_seconds}秒</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Card>
    </div>
  )
}

export default Workbench