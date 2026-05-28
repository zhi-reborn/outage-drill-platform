import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, Tag, Table, Modal, Select, message, Popconfirm, Typography, Progress, Collapse, Tabs, Empty, Alert } from 'antd'
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  CheckCircleOutlined, 
  UserOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  TeamOutlined,
  SettingOutlined,
  ApartmentOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { drillService } from '../../../services/drill'
import { DrillInstance, StepExecution, User } from '../../../types'
import { userService } from '../../../services/user'
import WorkflowHierarchyDisplay from '../../../components/WorkflowHierarchyDisplay'

const { Title, Text } = Typography

const DrillDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [drill, setDrill] = useState<DrillInstance | null>(null)
  const [executions, setExecutions] = useState<StepExecution[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<StepExecution | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<number | undefined>()

  useEffect(() => {
    if (id) {
      loadDrillDetail()
      loadUsers()
    }
  }, [id])

  const loadDrillDetail = async () => {
    setLoading(true)
    try {
      const drillData = await drillService.getDrill(Number(id))
      setDrill(drillData)
      
      const executionsData = await drillService.getDrillExecutions(Number(id))
      setExecutions(executionsData)
    } catch (error) {
      message.error('加载演练详情失败')
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    try {
      const userData = await userService.getUsers()
      setUsers(userData)
    } catch (error) {
      message.error('加载用户列表失败')
    }
  }

  const handleStartExecution = async (executionId: number) => {
    try {
      await drillService.startExecution(executionId)
      message.success('节点已开始执行')
      loadDrillDetail()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handlePauseExecution = async (executionId: number) => {
    try {
      await drillService.pauseExecution(executionId)
      message.success('节点已暂停')
      loadDrillDetail()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleResumeExecution = async (executionId: number) => {
    try {
      await drillService.resumeExecution(executionId)
      message.success('节点已恢复')
      loadDrillDetail()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCompleteExecution = async (executionId: number) => {
    try {
      await drillService.completeExecution(executionId)
      message.success('节点已完成')
      loadDrillDetail()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleSyncSteps = async () => {
    if (!drill) return
    try {
      await drillService.syncDrillSteps(drill.id)
      message.success('步骤已同步')
      loadDrillDetail()
    } catch (error: any) {
      message.error(error.response?.data?.error || '同步失败')
    }
  }

  const handleAssignStep = async () => {
    if (!selectedExecution || !selectedAssignee) {
      message.error('请选择执行人和任务')
      return
    }

    try {
      await drillService.assignStep(selectedExecution.id, selectedAssignee)
      message.success('任务已分配')
      setAssignModalVisible(false)
      setSelectedExecution(null)
      setSelectedAssignee(undefined)
      loadDrillDetail()
    } catch (error) {
      message.error('分配失败')
    }
  }

  const getStatusTag = (status: string) => {
    const colors = {
      pending: 'default',
      in_progress: 'processing',
      paused: 'warning',
      completed: 'success',
      failed: 'error',
    }
    const texts = {
      pending: '待开始',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败',
    }
    return <Tag color={colors[status as keyof typeof colors]}>{texts[status as keyof typeof texts]}</Tag>
  }

  const getDrillStatusTag = (status: string) => {
    const colors = {
      pending: 'default',
      running: 'processing',
      paused: 'warning',
      completed: 'success',
      cancelled: 'error',
    }
    const texts = {
      pending: '待开始',
      running: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消',
    }
    return <Tag color={colors[status as keyof typeof colors]}>{texts[status as keyof typeof texts]}</Tag>
  }

  const columns = [
    {
      title: '步骤',
      dataIndex: 'step_order',
      key: 'step_order',
      width: 60,
      align: 'center' as const,
    },
    {
      title: '步骤名称',
      dataIndex: 'step_name',
      key: 'step_name',
      width: 180,
      render: (name: string) => {
        const idx = name.indexOf(' - ')
        return idx > 0 ? name.substring(idx + 3) : name
      },
    },
    {
      title: '所属阶段',
      key: 'phase',
      width: 260,
      render: (_: any, record: StepExecution) => {
        const parts: string[] = []
        if (record.phase_name) parts.push(record.phase_name)
        if (record.stage_name) parts.push(record.stage_name)
        if (record.task_name) parts.push(record.task_name)
        if (parts.length > 0) {
          return <Tag style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{parts.join(' / ')}</Tag>
        }
        return <Text type="secondary">-</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '执行人',
      key: 'assignee',
      width: 100,
      render: (_: any, record: StepExecution) => 
        record.assignee ? (
          <Space>
            <UserOutlined />
            <Text>{record.assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary">未分配</Text>
        ),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 160,
      render: (time: string) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      width: 160,
      render: (time: string) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '耗时',
      dataIndex: 'duration_seconds',
      key: 'duration_seconds',
      width: 80,
      render: (seconds: number) => {
        if (!seconds) return '-'
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}分${secs}秒`
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: StepExecution) => (
        <Space wrap>
          {record.status === 'pending' && (
            <Button 
              icon={<PlayCircleOutlined />} 
              type="primary" 
              size="small"
              onClick={() => handleStartExecution(record.id)}
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              开始
            </Button>
          )}
          {record.status === 'in_progress' && (
            <>
              <Button 
                icon={<PauseCircleOutlined />} 
                size="small" 
                onClick={() => handlePauseExecution(record.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              >
                暂停
              </Button>
              <Button 
                icon={<CheckCircleOutlined />} 
                type="primary" 
                size="small"
                onClick={() => handleCompleteExecution(record.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              >
                完成
              </Button>
            </>
          )}
          {(record.status as string) === 'paused' && (
            <>
              <Button 
                icon={<PlayCircleOutlined />} 
                type="primary" 
                size="small" 
                onClick={() => handleResumeExecution(record.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              >
                恢复
              </Button>
              <Button 
                icon={<CheckCircleOutlined />} 
                type="primary" 
                size="small"
                onClick={() => handleCompleteExecution(record.id)}
                style={{ marginRight: 8, marginBottom: 8 }}
              >
                完成
              </Button>
            </>
          )}
          <Button 
            icon={<UserOutlined />} 
            size="small"
            onClick={() => {
              setSelectedExecution(record)
              setSelectedAssignee(record.assignee?.id)
              setAssignModalVisible(true)
            }}
            style={{ marginBottom: 8 }}
          >
            分配
          </Button>
        </Space>
      ),
    },
  ]

  if (!drill) {
    return <div>加载中...</div>
  }

  const completedCount = executions.filter(e => e.status === 'completed').length
  const totalCount = executions.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 10000) / 100 : 0

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/drills')}>
          返回演练列表
        </Button>
      </div>

      <Card title="演练基本信息" style={{ marginBottom: '24px' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="演练ID">{drill.id}</Descriptions.Item>
          <Descriptions.Item label="演练名称">{drill.name}</Descriptions.Item>
          <Descriptions.Item label="模板">{drill.template?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{getDrillStatusTag(drill.status)}</Descriptions.Item>
          <Descriptions.Item label="创建人">{drill.creator?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {drill.created_at ? new Date(drill.created_at).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {drill.start_time ? new Date(drill.start_time).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {drill.end_time ? new Date(drill.end_time).toLocaleString() : '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: '24px' }}>
          <Space>
            <Text strong>执行进度：</Text>
            <Progress 
              percent={progressPercent} 
              status={progressPercent === 100 ? 'success' : 'active'}
              style={{ width: 300 }}
            />
            <Text>{completedCount}/{totalCount} 步骤已完成</Text>
          </Space>
        </div>

        <div style={{ marginTop: '16px' }}>
          <Button icon={<ReloadOutlined />} onClick={loadDrillDetail}>
            刷新数据
          </Button>
        </div>
      </Card>

      <Card 
        title={
          <Space>
            <SettingOutlined />
            <Text>节点执行管理</Text>
          </Space>
        }
      >
        <Tabs
          defaultActiveKey="hierarchy"
          items={[
            {
              key: 'hierarchy',
              label: (
                <Space>
                  <ApartmentOutlined />
                  <Text>层级视图</Text>
                </Space>
              ),
              children: drill.template_id ? (
                <WorkflowHierarchyDisplay 
                  templateId={drill.template_id}
                  drillId={drill.id}
                  onRefresh={loadDrillDetail}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">未分配模板，无法显示层级视图</Text>
                </div>
              )
            },
            {
              key: 'executions',
              label: (
                <Space>
                  <SettingOutlined />
                  <Text>步骤执行列表</Text>
                </Space>
              ),
              children: (
                <div className="execution-list-container">
                  {executions.length === 0 && !loading && (
                    <Alert
                      message="暂无步骤执行记录"
                      description="该演练的步骤执行列表为空，可能是通过旧版本创建的。点击下方按钮从模板同步步骤记录。"
                      type="warning"
                      icon={<WarningOutlined />}
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />
                  )}
                  
                  <div className="execution-header">
                    <div className="execution-stats">
                      <div className="stat-item">
                        <span className="stat-value">{totalCount}</span>
                        <span className="stat-label">总任务</span>
                      </div>
                      <div className="stat-item stat-pending">
                        <span className="stat-value">{executions.filter(e => e.status === 'pending').length}</span>
                        <span className="stat-label">待开始</span>
                      </div>
                      <div className="stat-item stat-progress">
                        <span className="stat-value">{executions.filter(e => e.status === 'in_progress').length}</span>
                        <span className="stat-label">进行中</span>
                      </div>
                      <div className="stat-item stat-completed">
                        <span className="stat-value">{completedCount}</span>
                        <span className="stat-label">已完成</span>
                      </div>
                    </div>
                    <Button 
                      type="primary" 
                      onClick={handleSyncSteps} 
                      icon={<ReloadOutlined />}
                      className="sync-btn"
                    >
                      同步状态
                    </Button>
                  </div>
                  
                  <Table
                    columns={columns}
                    dataSource={executions}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="暂无步骤执行记录"
                        />
                      )
                    }}
                    className="execution-table"
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="分配任务"
        open={assignModalVisible}
        onOk={handleAssignStep}
        onCancel={() => {
          setAssignModalVisible(false)
          setSelectedExecution(null)
          setSelectedAssignee(undefined)
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>任务：{selectedExecution?.step_name}</Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="选择执行人"
          value={selectedAssignee}
          onChange={setSelectedAssignee}
        >
          {users.filter(u => u.role === 'participant').map(user => (
            <Select.Option key={user.id} value={user.id}>
              <Space>
                <UserOutlined />
                <Text>{user.name}</Text>
                <Tag>{user.role}</Tag>
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  )
}

export default DrillDetail