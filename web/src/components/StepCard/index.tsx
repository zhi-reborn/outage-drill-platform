import React, { useState } from 'react'
import { Card, Tag, Button, Modal, Space, Typography, Descriptions, message } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined, UserOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { StepExecution } from '../../types'
import { drillService } from '../../services/drill'

const { Text, Paragraph } = Typography

interface StepCardProps {
  execution: StepExecution
  isActive?: boolean
  onRefresh?: () => void
}

const StepCard: React.FC<StepCardProps> = ({ execution, isActive, onRefresh }) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
      case 'in_progress':
        return <LoadingOutlined style={{ color: '#faad14', fontSize: 24 }} />
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#722ed1', fontSize: 24 }} />
      case 'timeout':
        return <ClockCircleOutlined style={{ color: '#f5222d', fontSize: 24 }} />
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 24 }} />
    }
  }

  const getStatusTag = () => {
    const colors = {
      completed: 'success',
      in_progress: 'warning',
      paused: 'purple',
      timeout: 'error',
      pending: 'default',
    }
    const texts = {
      completed: '已完成',
      in_progress: '进行中',
      paused: '已暂停',
      timeout: '超时',
      pending: '待开始',
    }
    return <Tag color={colors[execution.status]}>{texts[execution.status]}</Tag>
  }

  const handleClick = () => {
    setModalVisible(true)
  }

  const handleStartExecution = async () => {
    setLoading(true)
    try {
      await drillService.startExecution(execution.id)
      message.success('步骤已开始执行')
      setModalVisible(false)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '开始执行失败')
    }
    setLoading(false)
  }

  const handlePauseExecution = async () => {
    setLoading(true)
    try {
      await drillService.pauseExecution(execution.id)
      message.success('步骤已暂停')
      setModalVisible(false)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '暂停失败')
    }
    setLoading(false)
  }

  const handleResumeExecution = async () => {
    setLoading(true)
    try {
      await drillService.resumeExecution(execution.id)
      message.success('步骤已恢复执行')
      setModalVisible(false)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '恢复失败')
    }
    setLoading(false)
  }

  const handleCompleteExecution = async () => {
    setLoading(true)
    try {
      await drillService.completeExecution(execution.id)
      message.success('步骤已完成')
      setModalVisible(false)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '完成步骤失败')
    }
    setLoading(false)
  }

  const getActionButtons = () => {
    switch (execution.status) {
      case 'pending':
        return (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={handleStartExecution}
            loading={loading}
          >
            开始执行
          </Button>
        )
      case 'in_progress':
        return (
          <Space>
            <Button 
              icon={<PauseCircleOutlined />}
              onClick={handlePauseExecution}
              loading={loading}
            >
              暂停
            </Button>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={handleCompleteExecution}
              loading={loading}
            >
              完成步骤
            </Button>
          </Space>
        )
      case 'paused':
        return (
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={handleResumeExecution}
            loading={loading}
          >
            恢复执行
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <>
      <Card
        hoverable
        onClick={handleClick}
        style={{
          width: 200,
          border: isActive ? '2px solid #1890ff' : 
                  execution.status === 'paused' ? '2px solid #722ed1' : '1px solid #d9d9d9',
          marginBottom: 16,
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>
            {getStatusIcon()}
          </div>
          <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            步骤{execution.step_order}: {execution.step_name}
          </div>
          {getStatusTag()}
          {execution.assignee && (
            <div style={{ marginTop: 8, color: '#666' }}>
              <UserOutlined /> {execution.assignee.name}
            </div>
          )}
          {execution.status === 'completed' && (
            <div style={{ marginTop: 8, color: '#666' }}>
              耗时: {execution.duration_seconds}秒
            </div>
          )}
          {(execution.status === 'pending' || execution.status === 'paused') && (
            <div style={{ marginTop: 8 }}>
              <Button size="small" type="link">
                点击查看详情
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal
        title={`步骤${execution.step_order}: ${execution.step_name}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={getActionButtons()}
        width={600}
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="状态">
            {getStatusTag()}
          </Descriptions.Item>
          <Descriptions.Item label="执行人">
            {execution.assignee ? execution.assignee.name : '未分配'}
          </Descriptions.Item>
          {execution.start_time && (
            <Descriptions.Item label="开始时间">
              {new Date(execution.start_time).toLocaleString()}
            </Descriptions.Item>
          )}
          {execution.end_time && (
            <Descriptions.Item label="结束时间">
              {new Date(execution.end_time).toLocaleString()}
            </Descriptions.Item>
          )}
          {execution.duration_seconds > 0 && (
            <Descriptions.Item label="耗时">
              {execution.duration_seconds}秒
            </Descriptions.Item>
          )}
        </Descriptions>

        {execution.drill?.template?.steps && (
          <Card title="操作指引" style={{ marginTop: 16 }} size="small">
            {execution.drill.template.steps
              .filter(s => s.order === execution.step_order)
              .map(step => (
                <div key={step.order}>
                  <Paragraph>
                    <Text strong>描述: </Text>
                    {step.description || '无'}
                  </Paragraph>
                  <Paragraph>
                    <Text strong>超时时间: </Text>
                    {step.timeout_minutes}分钟
                  </Paragraph>
                  <Paragraph>
                    <Text strong>操作指引: </Text>
                  </Paragraph>
                  <Paragraph style={{ background: '#f5f5f5', padding: 8 }}>
                    {step.guide || '无操作指引'}
                  </Paragraph>
                </div>
              ))}
          </Card>
        )}

        {execution.status === 'pending' && !execution.assignee && (
          <Card style={{ marginTop: 16 }} size="small">
            <Space direction="vertical">
              <Text type="secondary">
                该步骤尚未分配执行人，您可以点击"开始执行"按钮开始执行此步骤。
              </Text>
              <Text type="warning">
                注意：开始执行后，步骤状态将变为"进行中"，请确保您已准备好执行该步骤。
              </Text>
            </Space>
          </Card>
        )}

        {execution.status === 'in_progress' && (
          <Card style={{ marginTop: 16 }} size="small">
            <Space direction="vertical">
              <Text type="secondary">
                步骤正在执行中。如果需要临时中断，可以点击"暂停"按钮。
              </Text>
              <Text type="warning">
                注意：暂停后可以随时恢复执行，不会影响已执行的部分。
              </Text>
            </Space>
          </Card>
        )}

        {execution.status === 'paused' && (
          <Card style={{ marginTop: 16 }} size="small">
            <Space direction="vertical">
              <Text type="secondary">
                步骤已暂停。您可以点击"恢复执行"按钮继续执行此步骤。
              </Text>
              <Text type="info">
                提示：暂停期间不会计入超时时间。
              </Text>
            </Space>
          </Card>
        )}
      </Modal>
    </>
  )
}

export default StepCard