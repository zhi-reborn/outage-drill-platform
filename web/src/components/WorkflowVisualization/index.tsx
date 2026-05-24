import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Steps, 
  Button, 
  Space, 
  Modal, 
  Descriptions,
  Tag,
  Progress,
  Typography,
  message,
  Tooltip
} from 'antd'
import { 
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { workflowService } from '../../services/workflow'
import type { Phase, Stage, Task, Operation, DrillTemplateWithPhases } from '../../types'

const { Text, Title } = Typography

interface WorkflowVisualizationProps {
  templateId: number
  drillId?: number
}

const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({ 
  templateId,
  drillId 
}) => {
  const [template, setTemplate] = useState<DrillTemplateWithPhases | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  useEffect(() => {
    loadTemplateHierarchy()
  }, [templateId])

  const loadTemplateHierarchy = async () => {
    setLoading(true)
    try {
      const data = await workflowService.getTemplateFullHierarchy(templateId)
      setTemplate(data)
    } catch (error: any) {
      message.error('加载模板层级结构失败')
      console.error(error)
    }
    setLoading(false)
  }

  const handleNodeClick = (node: any, type: string) => {
    setSelectedNode({ ...node, type })
    setDetailModalVisible(true)
  }

  const handleStartNode = async (node: any, type: string) => {
    try {
      switch (type) {
        case 'phase':
          await workflowService.startPhase(node.id)
          break
        case 'stage':
          await workflowService.startStage(node.id)
          break
        case 'task':
          await workflowService.startTask(node.id)
          break
        case 'operation':
          await workflowService.startOperation(node.id)
          break
      }
      message.success('启动成功')
      loadTemplateHierarchy()
    } catch (error: any) {
      message.error(error.response?.data?.error || '启动失败')
    }
  }

  const handlePauseNode = async (node: any, type: string) => {
    try {
      switch (type) {
        case 'task':
          await workflowService.pauseTask(node.id)
          break
        case 'operation':
          await workflowService.pauseOperation(node.id)
          break
        default:
          message.warning('该层级不支持暂停操作')
          return
      }
      message.success('暂停成功')
      loadTemplateHierarchy()
    } catch (error: any) {
      message.error(error.response?.data?.error || '暂停失败')
    }
  }

  const handleCompleteNode = async (node: any, type: string) => {
    try {
      switch (type) {
        case 'phase':
          await workflowService.completePhase(node.id)
          break
        case 'stage':
          await workflowService.completeStage(node.id)
          break
        case 'task':
          await workflowService.completeTask(node.id)
          break
        case 'operation':
          await workflowService.completeOperation(node.id)
          break
      }
      message.success('完成成功')
      loadTemplateHierarchy()
    } catch (error: any) {
      message.error(error.response?.data?.error || '完成失败')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
      case 'in_progress':
        return <PlayCircleOutlined style={{ color: '#1890ff' }} />
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#faad14' }} />
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      default:
        return <ClockCircleOutlined />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#8c8c8c'
      case 'in_progress':
        return '#1890ff'
      case 'paused':
        return '#faad14'
      case 'completed':
        return '#52c41a'
      default:
        return '#8c8c8c'
    }
  }

  const getStatusText = (status: string) => {
    const statusTexts: Record<string, string> = {
      pending: '待开始',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
    }
    return statusTexts[status] || status
  }

  const getExecutionModeText = (mode: string) => {
    return mode === 'serial' ? '串行' : '并行'
  }

  const calculateProgress = (node: any, type: string) => {
    if (node.status === 'completed') return 100
    if (node.status === 'in_progress') return 50
    if (node.status === 'paused') return 25
    return 0
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0秒'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`
    }
    if (minutes > 0) {
      return `${minutes}分钟${secs}秒`
    }
    return `${secs}秒`
  }

  const renderNodeDetail = () => {
    if (!selectedNode) return null

    const { type, ...node } = selectedNode

    return (
      <Descriptions bordered column={2}>
        <Descriptions.Item label="名称">{node.name}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={getStatusColor(node.status)}>
            {getStatusIcon(node.status)} {getStatusText(node.status)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="执行模式">
          <Tag color={node.execution_mode === 'serial' ? 'blue' : 'green'}>
            {getExecutionModeText(node.execution_mode)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="顺序">{node.order}</Descriptions.Item>
        {node.description && (
          <Descriptions.Item label="描述" span={2}>{node.description}</Descriptions.Item>
        )}
        {node.department && (
          <Descriptions.Item label="责任部门">
            <TeamOutlined /> {node.department}
          </Descriptions.Item>
        )}
        {node.estimated_duration && (
          <Descriptions.Item label="预计耗时">{node.estimated_duration} 分钟</Descriptions.Item>
        )}
        {node.timeout_minutes && (
          <Descriptions.Item label="超时时间">{node.timeout_minutes} 分钟</Descriptions.Item>
        )}
        {node.guide && (
          <Descriptions.Item label="操作指引" span={2}>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{node.guide}</pre>
          </Descriptions.Item>
        )}
        {node.actual_start_time && (
          <Descriptions.Item label="实际开始时间">
            {new Date(node.actual_start_time).toLocaleString()}
          </Descriptions.Item>
        )}
        {node.actual_end_time && (
          <Descriptions.Item label="实际结束时间">
            {new Date(node.actual_end_time).toLocaleString()}
          </Descriptions.Item>
        )}
        {node.duration_seconds > 0 && (
          <Descriptions.Item label="实际耗时">
            {formatDuration(node.duration_seconds)}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="进度" span={2}>
          <Progress percent={calculateProgress(node, type)} status={node.status === 'in_progress' ? 'active' : undefined} />
        </Descriptions.Item>
      </Descriptions>
    )
  }

  if (!template) {
    return <Card loading={loading}>加载流程可视化...</Card>
  }

  return (
    <div>
      <Card 
        title={
          <Space>
            <Title level={4}>{template.name}</Title>
            <Text type="secondary">流程可视化</Text>
          </Space>
        }
      >
        {template.phases && template.phases.length > 0 ? (
          <div>
            {template.phases.map((phase, phaseIndex) => (
              <Card 
                key={`phase-${phase.id}`}
                style={{ marginBottom: 16 }}
                title={
                  <Space>
                    {getStatusIcon(phase.status)}
                    <Text strong>阶段 {phase.order}: {phase.name}</Text>
                    <Tag color={phase.execution_mode === 'serial' ? 'blue' : 'green'}>
                      {getExecutionModeText(phase.execution_mode)}
                    </Tag>
                    <Progress 
                      percent={calculateProgress(phase, 'phase')} 
                      size="small"
                      status={phase.status === 'in_progress' ? 'active' : undefined}
                    />
                  </Space>
                }
                extra={
                  <Space>
                    {phase.status === 'pending' && (
                      <Button 
                        size="small" 
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleStartNode(phase, 'phase')}
                      >
                        开始
                      </Button>
                    )}
                    {phase.status === 'in_progress' && (
                      <Button 
                        size="small" 
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleCompleteNode(phase, 'phase')}
                      >
                        完成
                      </Button>
                    )}
                    <Button 
                      size="small"
                      onClick={() => handleNodeClick(phase, 'phase')}
                    >
                      详情
                    </Button>
                  </Space>
                }
              >
                {phase.stages && phase.stages.length > 0 ? (
                  <Steps 
                    current={phase.stages.findIndex(s => s.status === 'in_progress')}
                    status={phase.stages.find(s => s.status === 'paused') ? 'wait' : 'process'}
                  >
                    {phase.stages.map((stage) => (
                      <Steps.Step 
                        key={`stage-${stage.id}`}
                        title={
                          <Space direction="vertical" size="small">
                            <Text>{stage.name}</Text>
                            <Tag color={stage.execution_mode === 'serial' ? 'blue' : 'green'} style={{ fontSize: 12 }}>
                              {getExecutionModeText(stage.execution_mode)}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small">
                            <Tag color={getStatusColor(stage.status)} style={{ fontSize: 12 }}>
                              {getStatusText(stage.status)}
                            </Tag>
                            <Space size="small">
                              {stage.status === 'pending' && (
                                <Tooltip title="开始">
                                  <Button 
                                    size="small" 
                                    type="link"
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleStartNode(stage, 'stage')}
                                  />
                                </Tooltip>
                              )}
                              {stage.status === 'in_progress' && (
                                <Tooltip title="完成">
                                  <Button 
                                    size="small" 
                                    type="link"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => handleCompleteNode(stage, 'stage')}
                                  />
                                </Tooltip>
                              )}
                              <Tooltip title="详情">
                                <Button 
                                  size="small" 
                                  type="link"
                                  onClick={() => handleNodeClick(stage, 'stage')}
                                >
                                  详情
                                </Button>
                              </Tooltip>
                            </Space>
                          </Space>
                        }
                        icon={getStatusIcon(stage.status)}
                      />
                    ))}
                  </Steps>
                ) : (
                  <Text type="secondary">暂无环节</Text>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Text type="secondary">暂无流程数据</Text>
        )}
      </Card>

      <Modal
        title={`${selectedNode?.type === 'phase' ? '阶段' : 
                selectedNode?.type === 'stage' ? '环节' : 
                selectedNode?.type === 'task' ? '任务' : '操作步骤'}详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={
          <Space>
            {selectedNode?.status === 'pending' && (
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  handleStartNode(selectedNode, selectedNode.type)
                  setDetailModalVisible(false)
                }}
              >
                开始
              </Button>
            )}
            {selectedNode?.status === 'in_progress' && selectedNode?.type !== 'phase' && selectedNode?.type !== 'stage' && (
              <Button 
                icon={<PauseCircleOutlined />}
                onClick={() => {
                  handlePauseNode(selectedNode, selectedNode.type)
                  setDetailModalVisible(false)
                }}
              >
                暂停
              </Button>
            )}
            {selectedNode?.status === 'in_progress' && (
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  handleCompleteNode(selectedNode, selectedNode.type)
                  setDetailModalVisible(false)
                }}
              >
                完成
              </Button>
            )}
            <Button onClick={() => setDetailModalVisible(false)}>
              关闭
            </Button>
          </Space>
        }
        width={800}
      >
        {renderNodeDetail()}
      </Modal>
    </div>
  )
}

export default WorkflowVisualization