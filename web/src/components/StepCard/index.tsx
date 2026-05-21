import React from 'react'
import { Card, Tag } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { StepExecution } from '../../types'

interface StepCardProps {
  execution: StepExecution
  isActive?: boolean
}

const StepCard: React.FC<StepCardProps> = ({ execution, isActive }) => {
  const getStatusIcon = () => {
    switch (execution.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
      case 'in_progress':
        return <LoadingOutlined style={{ color: '#faad14', fontSize: 24 }} />
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
      timeout: 'error',
      pending: 'default',
    }
    const texts = {
      completed: '已完成',
      in_progress: '进行中',
      timeout: '超时',
      pending: '待开始',
    }
    return <Tag color={colors[execution.status]}>{texts[execution.status]}</Tag>
  }

  return (
    <Card
      style={{
        width: 200,
        border: isActive ? '2px solid #1890ff' : '1px solid #d9d9d9',
        marginBottom: 16,
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
            执行人: {execution.assignee.name}
          </div>
        )}
        {execution.status === 'completed' && (
          <div style={{ marginTop: 8, color: '#666' }}>
            耗时: {execution.duration_seconds}秒
          </div>
        )}
      </div>
    </Card>
  )
}

export default StepCard