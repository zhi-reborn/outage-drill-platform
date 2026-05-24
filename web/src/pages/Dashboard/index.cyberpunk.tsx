import React, { useState, useEffect } from 'react'
import { Row, Col, Select, Space, Typography, Button, Empty, Spin, Tabs } from 'antd'
import { ReloadOutlined, ApartmentOutlined, DashboardOutlined, ThunderboltOutlined, RadarChartOutlined, CloudServerOutlined } from '@ant-design/icons'
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
      pending: '#6B7280',
      running: '#00F0FF',
      paused: '#FFB800',
      completed: '#00FF88',
      failed: '#FF0055'
    }
    return colors[status] || '#6B7280'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '待机',
      running: '运行中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="cyber-loading-screen">
        <div className="cyber-grid-bg"></div>
        <div className="loading-content">
          <div className="cyber-loader">
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
          </div>
          <Text className="cyber-loading-text">
            系统初始化中...
          </Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cyber-error-screen">
        <div className="cyber-grid-bg"></div>
        <div className="error-content">
          <div className="error-icon-wrapper">
            <RadarChartOutlined className="error-icon" />
          </div>
          <Title level={3} className="cyber-error-title">
            系统错误
          </Title>
          <Text className="cyber-error-message">
            {error}
          </Text>
          <Button 
            className="cyber-retry-button"
            onClick={loadDrills}
          >
            重新连接
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-dashboard-container">
      {/* Cyber Grid Background */}
      <div className="cyber-grid-bg"></div>
      
      {/* Scanline Effect */}
      <div className="scanline-effect"></div>

      {/* Header Section */}
      <div className="cyber-header">
        <Row gutter={[32, 32]}>
          <Col xs={24} md={18}>
            <div className="header-left">
              <div className="cyber-icon-wrapper">
                <ThunderboltOutlined className="cyber-icon" />
                <div className="icon-glow"></div>
              </div>
              <div className="header-text">
                <Title level={1} className="cyber-title">
                  灾备演练指挥中心
                </Title>
                <Text className="cyber-subtitle">
                  实时监控演练进度 · 智能管理流程执行
                </Text>
              </div>
            </div>
          </Col>
          
          <Col xs={24} md={6}>
            <div className="header-controls">
              <Select
                value={selectedDrill?.id}
                onChange={(value) => {
                  const drill = drills.find(d => d.id === value)
                  setSelectedDrill(drill)
                }}
                placeholder="选择演练"
                className="cyber-selector"
                size="large"
              >
                {drills.map(drill => (
                  <Select.Option key={drill.id} value={drill.id}>
                    <Space>
                      <div 
                        className="cyber-status-dot"
                        style={{ background: getStatusColor(drill.status) }}
                      />
                      <Text className="cyber-drill-name">{drill.name}</Text>
                      <Text className="cyber-drill-status">{getStatusText(drill.status)}</Text>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshExecutions}
                size="large"
                className="cyber-refresh-button"
              >
                同步数据
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* Status Dashboard */}
      {selectedDrill && (
        <div className="cyber-status-dashboard">
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <div className="cyber-status-card">
                <div className="card-glow"></div>
                <div className="status-icon-wrapper">
                  <CloudServerOutlined className="status-icon" />
                </div>
                <Text className="cyber-status-label">演练名称</Text>
                <Text className="cyber-status-value">{selectedDrill.name}</Text>
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div className="cyber-status-card">
                <div className="card-glow"></div>
                <div className="status-icon-wrapper">
                  <DashboardOutlined className="status-icon" />
                </div>
                <Text className="cyber-status-label">系统状态</Text>
                <div className="cyber-status-indicator">
                  <div 
                    className="cyber-pulse-indicator"
                    style={{ background: getStatusColor(selectedDrill.status) }}
                  />
                  <Text className="cyber-status-value">{getStatusText(selectedDrill.status)}</Text>
                </div>
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div className="cyber-status-card">
                <div className="card-glow"></div>
                <div className="status-icon-wrapper">
                  <ApartmentOutlined className="status-icon" />
                </div>
                <Text className="cyber-status-label">启动时间</Text>
                <Text className="cyber-status-value mono">
                  {selectedDrill.start_time ? 
                    new Date(selectedDrill.start_time).toLocaleTimeString('zh-CN', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 
                    '未启动'
                  }
                </Text>
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div className="cyber-status-card">
                <div className="card-glow"></div>
                <div className="status-icon-wrapper">
                  <RadarChartOutlined className="status-icon" />
                </div>
                <Text className="cyber-status-label">执行进度</Text>
                <Text className="cyber-status-value mono">
                  {executions.length > 0 ? 
                    `${executions.filter(e => e.status === 'completed').length}/${executions.length} 步骤` :
                    '0 步骤'
                  }
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* Main Content */}
      {selectedDrill && (
        <div className="cyber-main-content">
          <Tabs 
            defaultActiveKey="hierarchy"
            size="large"
            className="cyber-content-tabs"
            items={[
              {
                key: 'hierarchy',
                label: (
                  <Space size="small">
                    <ApartmentOutlined />
                    <Text>层级结构</Text>
                  </Space>
                ),
                children: selectedDrill.template_id ? (
                  <WorkflowHierarchyDisplay 
                    templateId={selectedDrill.template_id}
                    drillId={selectedDrill.id}
                    onRefresh={handleRefreshExecutions}
                  />
                ) : (
                  <div className="cyber-empty-state">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Space direction="vertical" size="small">
                          <Text className="cyber-empty-title">未关联模板</Text>
                          <Text className="cyber-empty-subtitle">请先配置演练模板以启用层级结构视图</Text>
                        </Space>
                      }
                    >
                      <Button 
                        className="cyber-action-button"
                        onClick={() => navigate('/admin/templates')}
                      >
                        配置模板
                      </Button>
                    </Empty>
                  </div>
                )
              },
              {
                key: 'messages',
                label: (
                  <Space size="small">
                    <DashboardOutlined />
                    <Text>实时日志</Text>
                    <Text className="cyber-message-count">({messages.length})</Text>
                  </Space>
                ),
                children: (
                  <MessageList messages={messages} />
                )
              }
            ]}
          />
        </div>
      )}

      {/* Empty State */}
      {!selectedDrill && (
        <div className="cyber-empty-state-full">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <Text className="cyber-empty-title">暂无演练数据</Text>
                <Text className="cyber-empty-subtitle">请先创建演练实例以开始监控</Text>
              </Space>
            }
          >
            <Button 
              className="cyber-action-button"
              onClick={() => navigate('/admin/drills')}
            >
              创建演练
            </Button>
          </Empty>
        </div>
      )}

      {/* Custom Styles */}
      <style>
        {`
          /* Font Import - Chinese Fonts */
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

          /* Global Variables - Cyberpunk Theme */
          :root {
            --cyber-primary: #00F0FF;
            --cyber-secondary: #FF00FF;
            --cyber-success: #00FF88;
            --cyber-warning: #FFB800;
            --cyber-error: #FF0055;
            --cyber-bg-dark: #0D0D1A;
            --cyber-bg-card: #1A1A2E;
            --cyber-text-primary: #E0E0E0;
            --cyber-text-secondary: #A0A0A0;
            --cyber-border: #2A2A3E;
          }

          /* Dashboard Container */
          .cyber-dashboard-container {
            min-height: 100dvh;
            background: var(--cyber-bg-dark);
            padding: 32px 0;
            font-family: 'Noto Sans SC', sans-serif;
            position: relative;
            overflow: hidden;
          }

          /* Cyber Grid Background */
          .cyber-grid-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: grid-move 20s linear infinite;
            z-index: 0;
          }

          @keyframes grid-move {
            0% {
              transform: translate(0, 0);
            }
            100% {
              transform: translate(50px, 50px);
            }
          }

          /* Scanline Effect */
          .scanline-effect {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              to bottom,
              transparent 50%,
              rgba(0, 240, 255, 0.02) 50%
            );
            background-size: 100% 4px;
            animation: scanline 8s linear infinite;
            z-index: 1;
            pointer-events: none;
          }

          @keyframes scanline {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(4px);
            }
          }

          /* Loading Screen */
          .cyber-loading-screen {
            min-height: 100dvh;
            background: var(--cyber-bg-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .loading-content {
            text-align: center;
            z-index: 2;
          }

          .cyber-loader {
            position: relative;
            width: 120px;
            height: 120px;
            margin-bottom: 32px;
          }

          .loader-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2px solid transparent;
            border-top-color: var(--cyber-primary);
            border-radius: 50%;
            animation: loader-spin 1.5s linear infinite;
          }

          .loader-ring:nth-child(2) {
            width: 80%;
            height: 80%;
            top: 10%;
            left: 10%;
            border-top-color: var(--cyber-secondary);
            animation-delay: 0.2s;
          }

          .loader-ring:nth-child(3) {
            width: 60%;
            height: 60%;
            top: 20%;
            left: 20%;
            border-top-color: var(--cyber-success);
            animation-delay: 0.4s;
          }

          @keyframes loader-spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .cyber-loading-text {
            color: var(--cyber-primary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 16px;
            letter-spacing: 2px;
            animation: text-glow 2s ease-in-out infinite;
          }

          @keyframes text-glow {
            0%, 100% {
              text-shadow: 0 0 8px var(--cyber-primary);
            }
            50% {
              text-shadow: 0 0 16px var(--cyber-primary), 0 0 24px var(--cyber-primary);
            }
          }

          /* Error Screen */
          .cyber-error-screen {
            min-height: 100dvh;
            background: var(--cyber-bg-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .error-content {
            text-align: center;
            z-index: 2;
          }

          .error-icon-wrapper {
            width: 80px;
            height: 80px;
            margin-bottom: 24px;
            position: relative;
          }

          .error-icon {
            font-size: 48px;
            color: var(--cyber-error);
            animation: error-pulse 2s ease-in-out infinite;
          }

          @keyframes error-pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.1);
            }
          }

          .cyber-error-title {
            color: var(--cyber-text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-weight: 700;
            letter-spacing: 2px;
          }

          .cyber-error-message {
            color: var(--cyber-text-secondary);
            font-size: 14px;
            margin-bottom: 24px;
          }

          .cyber-retry-button {
            background: linear-gradient(135deg, var(--cyber-primary), var(--cyber-secondary));
            border: none;
            color: var(--cyber-bg-dark);
            font-family: 'Noto Sans SC', sans-serif;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 12px 32px;
            border-radius: 8px;
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.5);
            transition: all 0.3s ease;
          }

          .cyber-retry-button:hover {
            box-shadow: 0 0 24px rgba(0, 240, 255, 0.8);
            transform: translateY(-2px);
          }

          /* Header */
          .cyber-header {
            max-width: 1400px;
            margin: 0 auto 48px;
            padding: 0 32px;
            z-index: 2;
            position: relative;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .cyber-icon-wrapper {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--cyber-primary), var(--cyber-secondary));
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 0 32px rgba(0, 240, 255, 0.5);
          }

          .cyber-icon {
            font-size: 32px;
            color: var(--cyber-bg-dark);
          }

          .icon-glow {
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
            border: 2px solid var(--cyber-primary);
            border-radius: 20px;
            animation: icon-glow-pulse 2s ease-in-out infinite;
          }

          @keyframes icon-glow-pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.05);
            }
          }

          .cyber-title {
            color: var(--cyber-text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 32px;
            font-weight: 900;
            letter-spacing: 4px;
            margin: 0;
            text-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
          }

          .cyber-subtitle {
            color: var(--cyber-text-secondary);
            font-size: 14px;
            letter-spacing: 2px;
          }

          .header-controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 16px;
          }

          .cyber-selector {
            width: 280px;
            background: var(--cyber-bg-card);
            border: 1px solid var(--cyber-border);
            border-radius: 8px;
          }

          .cyber-selector .ant-select-selector {
            background: var(--cyber-bg-card) !important;
            border: 1px solid var(--cyber-border) !important;
            color: var(--cyber-text-primary) !important;
          }

          .cyber-drill-name {
            color: var(--cyber-text-primary);
            font-family: 'Noto Sans SC', sans-serif;
          }

          .cyber-drill-status {
            color: var(--cyber-text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
          }

          .cyber-refresh-button {
            background: var(--cyber-bg-card);
            border: 1px solid var(--cyber-primary);
            color: var(--cyber-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-weight: 600;
            letter-spacing: 1px;
            box-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
            transition: all 0.3s ease;
          }

          .cyber-refresh-button:hover {
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.6);
            background: rgba(0, 240, 255, 0.1);
          }

          /* Status Dashboard */
          .cyber-status-dashboard {
            max-width: 1400px;
            margin: 0 auto 32px;
            padding: 0 32px;
            z-index: 2;
            position: relative;
          }

          .cyber-status-card {
            background: var(--cyber-bg-card);
            border: 1px solid var(--cyber-border);
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }

          .cyber-status-card:hover {
            border-color: var(--cyber-primary);
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.3);
          }

          .card-glow {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--cyber-primary), transparent);
            animation: card-glow-move 3s linear infinite;
          }

          @keyframes card-glow-move {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          .status-icon-wrapper {
            width: 40px;
            height: 40px;
            background: rgba(0, 240, 255, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }

          .status-icon {
            font-size: 20px;
            color: var(--cyber-primary);
          }

          .cyber-status-label {
            color: var(--cyber-text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            letter-spacing: 1px;
            display: block;
            margin-bottom: 8px;
          }

          .cyber-status-value {
            color: var(--cyber-text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 18px;
            font-weight: 700;
          }

          .cyber-status-value.mono {
            font-family: 'JetBrains Mono', monospace;
          }

          .cyber-status-indicator {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .cyber-pulse-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: cyber-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes cyber-pulse {
            0%, 100% {
              opacity: 1;
              box-shadow: 0 0 8px currentColor;
            }
            50% {
              opacity: 0.6;
              box-shadow: 0 0 16px currentColor, 0 0 24px currentColor;
            }
          }

          .cyber-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }

          /* Main Content */
          .cyber-main-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 32px;
            z-index: 2;
            position: relative;
          }

          .cyber-content-tabs {
            background: var(--cyber-bg-card);
            border: 1px solid var(--cyber-border);
            border-radius: 16px;
            padding: 24px;
          }

          .cyber-content-tabs .ant-tabs-tab {
            color: var(--cyber-text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
          }

          .cyber-content-tabs .ant-tabs-tab-active {
            color: var(--cyber-primary);
          }

          .cyber-content-tabs .ant-tabs-ink-bar {
            background: var(--cyber-primary);
          }

          .cyber-message-count {
            color: var(--cyber-text-secondary);
            font-family: 'JetBrains Mono', monospace;
          }

          /* Empty States */
          .cyber-empty-state {
            padding: 48px;
            text-align: center;
          }

          .cyber-empty-state-full {
            min-height: 400px;
            background: var(--cyber-bg-card);
            border: 1px solid var(--cyber-border);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 32px;
          }

          .cyber-empty-title {
            color: var(--cyber-text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 700;
          }

          .cyber-empty-subtitle {
            color: var(--cyber-text-secondary);
            font-size: 14px;
          }

          .cyber-action-button {
            background: linear-gradient(135deg, var(--cyber-primary), var(--cyber-secondary));
            border: none;
            color: var(--cyber-bg-dark);
            font-family: 'Noto Sans SC', sans-serif;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 12px 32px;
            border-radius: 8px;
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.5);
            transition: all 0.3s ease;
          }

          .cyber-action-button:hover {
            box-shadow: 0 0 24px rgba(0, 240, 255, 0.8);
            transform: translateY(-2px);
          }

          /* Responsive */
          @media (max-width: 768px) {
            .cyber-header {
              padding: 0 16px;
            }

            .cyber-title {
              font-size: 24px;
            }

            .header-controls {
              justify-content: flex-start;
            }

            .cyber-selector {
              width: 100%;
            }

            .cyber-status-dashboard {
              padding: 0 16px;
            }

            .cyber-main-content {
              padding: 0 16px;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Dashboard