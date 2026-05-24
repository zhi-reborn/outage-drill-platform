import React, { useState, useEffect } from 'react'
import { Row, Col, Select, Space, Typography, Button, Empty, Spin, Tabs } from 'antd'
import { ReloadOutlined, ApartmentOutlined, DashboardOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../../hooks/useWebSocket'
import { drillService } from '../../services/drill'
import { DrillInstance, StepExecution, WebSocketMessage } from '../../types'
import WorkflowHierarchyDisplay from '../../components/WorkflowHierarchyDisplay'
import MessageList from '../../components/MessageList'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [drills, setDrills] = useState<DrillInstance[]>([])
  const [selectedDrill, setSelectedDrill] = useState<DrillInstance | null>(null)
  const [executions, setExecutions] = useState<StepExecution[]>([])
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const { subscribe, unsubscribe } = useWebSocket()

  useEffect(() => {
    loadDrills()
  }, [])

  useEffect(() => {
    if (selectedDrill) {
      loadExecutions(selectedDrill.id)
      
      const handleStepUpdate = (data: WebSocketMessage) => {
        if (data.drill_id === selectedDrill.id) {
          loadExecutions(selectedDrill.id)
          setMessages(prev => [...prev, data])
        }
      }

      subscribe('step_update', handleStepUpdate)
      subscribe('message', handleStepUpdate)

      return () => {
        unsubscribe('step_update', handleStepUpdate)
        unsubscribe('message', handleStepUpdate)
      }
    }
  }, [selectedDrill])

  const loadDrills = async () => {
    setLoading(true)
    setError('')
    
    try {
      const data = await drillService.getDrills()
      
      if (data && data.length > 0) {
        setDrills(data)
        const runningDrill = data.find(d => d.status === 'running')
        setSelectedDrill(runningDrill || data[0])
      } else {
        setDrills([])
        setSelectedDrill(null)
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || '加载演练列表失败')
    }
    
    setLoading(false)
  }

  const loadExecutions = async (drillId: number) => {
    try {
      const data = await drillService.getDrillExecutions(drillId)
      
      if (data && data.length > 0) {
        setExecutions(data)
      } else {
        setExecutions([])
      }
    } catch (error: any) {
      setExecutions([])
    }
  }

  const handleRefreshExecutions = () => {
    if (selectedDrill) {
      loadExecutions(selectedDrill.id)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#94a3b8',
      running: '#3b82f6',
      paused: '#f59e0b',
      completed: '#10b981',
      failed: '#ef4444'
    }
    return colors[status] || '#94a3b8'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '待开始',
      running: '进行中',
      paused: '已暂停',
      completed: '已完成',
      failed: '已失败'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <Space direction="vertical" size="large" align="center">
          <Spin size="large" />
          <Text style={{ color: '#64748b', fontSize: '16px' }}>
            正在加载演练数据...
          </Text>
        </Space>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc'
      }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small">
              <Text style={{ color: '#334155', fontSize: '18px', fontWeight: 600 }}>
                加载失败
              </Text>
              <Text style={{ color: '#64748b', fontSize: '14px' }}>
                {error}
              </Text>
            </Space>
          }
        >
          <Button 
            type="primary"
            onClick={loadDrills}
            style={{
              background: '#3b82f6',
              borderColor: '#3b82f6',
              borderRadius: '8px',
              height: '40px',
              padding: '0 24px'
            }}
          >
            重新加载
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100dvh',
      background: '#f8fafc',
      padding: '32px 0'
    }}>
      <div style={{ 
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 32px'
      }}>
        {/* Header Section - Asymmetric Layout */}
        <div style={{ marginBottom: '48px' }}>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={16}>
              <Space direction="vertical" size="small">
                <Title level={2} style={{ 
                  color: '#1e293b',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: 0
                }}>
                  指挥中心大屏
                </Title>
                <Text style={{ 
                  color: '#64748b',
                  fontSize: '16px',
                  maxWidth: '600px'
                }}>
                  实时监控演练进度，管理流程执行状态
                </Text>
              </Space>
            </Col>
            
            <Col xs={24} md={8}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '16px'
              }}>
                <Select
                  value={selectedDrill?.id}
                  onChange={(value) => {
                    const drill = drills.find(d => d.id === value)
                    setSelectedDrill(drill)
                  }}
                  placeholder="选择演练实例"
                  style={{ 
                    width: '280px',
                    borderRadius: '8px'
                  }}
                  size="large"
                >
                  {drills.map(drill => (
                    <Select.Option key={drill.id} value={drill.id}>
                      <Space>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getStatusColor(drill.status)
                        }} />
                        <Text>{drill.name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {getStatusText(drill.status)}
                        </Text>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
                
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshExecutions}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    borderColor: '#e2e8f0',
                    color: '#64748b'
                  }}
                >
                  刷新
                </Button>
              </div>
            </Col>
          </Row>
        </div>

        {/* Drill Status Bar */}
        {selectedDrill && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: '#64748b', fontSize: '12px' }}>
                    演练名称
                  </Text>
                  <Text style={{ 
                    color: '#1e293b',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    {selectedDrill.name}
                  </Text>
                </Space>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: '#64748b', fontSize: '12px' }}>
                    当前状态
                  </Text>
                  <Space size="small">
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: getStatusColor(selectedDrill.status),
                      animation: selectedDrill.status === 'running' ? 
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }} />
                    <Text style={{ 
                      color: '#1e293b',
                      fontSize: '16px',
                      fontWeight: 600
                    }}>
                      {getStatusText(selectedDrill.status)}
                    </Text>
                  </Space>
                </Space>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: '#64748b', fontSize: '12px' }}>
                    开始时间
                  </Text>
                  <Text style={{ 
                    color: '#1e293b',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    {selectedDrill.start_time ? 
                      new Date(selectedDrill.start_time).toLocaleString('zh-CN') : 
                      '未开始'
                    }
                  </Text>
                </Space>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: '#64748b', fontSize: '12px' }}>
                    执行进度
                  </Text>
                  <Text style={{ 
                    color: '#1e293b',
                    fontSize: '16px',
                    fontWeight: 600
                  }}>
                    {executions.length > 0 ? 
                      `${executions.filter(e => e.status === 'completed').length}/${executions.length} 步骤` :
                      '0 步骤'
                    }
                  </Text>
                </Space>
              </Col>
            </Row>
          </div>
        )}

        {/* Main Content - Tabs */}
        {selectedDrill && (
          <Tabs 
            defaultActiveKey="hierarchy"
            size="large"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}
            items={[
              {
                key: 'hierarchy',
                label: (
                  <Space size="small">
                    <ApartmentOutlined style={{ fontSize: '16px' }} />
                    <Text style={{ fontSize: '16px', fontWeight: 500 }}>
                      层级结构
                    </Text>
                  </Space>
                ),
                children: selectedDrill.template_id ? (
                  <WorkflowHierarchyDisplay 
                    templateId={selectedDrill.template_id}
                    drillId={selectedDrill.id}
                    onRefresh={handleRefreshExecutions}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Space direction="vertical" size="small">
                        <Text style={{ color: '#334155', fontSize: '16px', fontWeight: 600 }}>
                          该演练未关联模板
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: '14px' }}>
                          无法显示层级结构数据
                        </Text>
                      </Space>
                    }
                  >
                    <Button 
                      type="primary"
                      onClick={() => navigate('/admin/templates')}
                      style={{
                        background: '#3b82f6',
                        borderColor: '#3b82f6',
                        borderRadius: '8px',
                        height: '40px',
                        padding: '0 24px'
                      }}
                    >
                      配置模板
                    </Button>
                  </Empty>
                )
              },
              {
                key: 'messages',
                label: (
                  <Space size="small">
                    <DashboardOutlined style={{ fontSize: '16px' }} />
                    <Text style={{ fontSize: '16px', fontWeight: 500 }}>
                      实时消息
                    </Text>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      ({messages.length})
                    </Text>
                  </Space>
                ),
                children: (
                  <MessageList messages={messages} />
                )
              }
            ]}
          />
        )}

        {/* Empty State */}
        {!selectedDrill && (
          <div style={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size="small">
                  <Text style={{ color: '#334155', fontSize: '18px', fontWeight: 600 }}>
                    暂无演练数据
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: '14px' }}>
                    请先创建演练实例
                  </Text>
                </Space>
              }
            >
              <Button 
                type="primary"
                onClick={() => navigate('/admin/drills')}
                style={{
                  background: '#3b82f6',
                  borderColor: '#3b82f6',
                  borderRadius: '8px',
                  height: '40px',
                  padding: '0 24px'
                }}
              >
                创建演练
              </Button>
            </Empty>
          </div>
        )}
      </div>

      {/* CSS Animation for Pulse */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .5;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Dashboard