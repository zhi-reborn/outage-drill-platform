import React, { useState, useEffect } from 'react'
import { Row, Col, Select, Space, Typography, Button, Empty, Spin, Tabs, Progress, Tag, Card } from 'antd'
import { ReloadOutlined, ApartmentOutlined, DashboardOutlined, ThunderboltOutlined, DatabaseOutlined, ClockCircleOutlined, CheckCircleOutlined, WarningOutlined, SyncOutlined } from '@ant-design/icons'
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
      running: '#00D9FF',
      paused: '#F59E0B',
      completed: '#10B981',
      failed: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: '待命',
      running: '运行中',
      paused: '已暂停',
      completed: '已完成',
      failed: '失败'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-grid">
          <div className="grid-line"></div>
          <div className="grid-line"></div>
          <div className="grid-line"></div>
        </div>
        <div className="loading-content">
          <div className="loading-icon">
            <SyncOutlined />
          </div>
          <div className="loading-text">
            <Text>系统初始化中</Text>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-grid">
          <div className="grid-line error"></div>
          <div className="grid-line error"></div>
        </div>
        <div className="error-content">
          <div className="error-icon">
            <WarningOutlined />
          </div>
          <Title level={2}>系统异常</Title>
          <Text className="error-message">{error}</Text>
          <Button 
            className="retry-button"
            onClick={loadDrills}
            icon={<ReloadOutlined />}
          >
            重新连接
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        <div className="grid-overlay"></div>
        <div className="scan-line"></div>
        <div className="data-flow"></div>
        <div className="data-flow-2"></div>
        <div className="hex-pattern"></div>
        <div className="particle-container">
          <div className="particle p1"></div>
          <div className="particle p2"></div>
          <div className="particle p3"></div>
          <div className="particle p4"></div>
          <div className="particle p5"></div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="header-section">
          <div className="header-left">
            <div className="logo-container">
              <div className="logo-icon">
                <ThunderboltOutlined />
              </div>
              <div className="logo-glow"></div>
              <div className="logo-radar"></div>
            </div>
            <div className="header-info">
              <Title level={1} className="main-title">
                容灾演练指挥中心
              </Title>
              <div className="subtitle-container">
                <Text className="subtitle">DISASTER RECOVERY COMMAND CENTER</Text>
                <div className="status-indicator">
                  <div className="status-dot"></div>
                  <Text className="status-text">系统在线</Text>
                </div>
              </div>
            </div>
          </div>

          <div className="header-right">
            <div className="control-panel">
              <div className="control-item">
                <Select
                  value={selectedDrill?.id}
                  onChange={(value) => {
                    const drill = drills.find(d => d.id === value)
                    setSelectedDrill(drill || null)
                  }}
                  placeholder="选择演练"
                  className="drill-selector"
                  size="large"
                >
                  {drills.map(drill => (
                    <Select.Option key={drill.id} value={drill.id}>
                      <Space>
                        <div 
                          className="status-dot-mini"
                          style={{ background: getStatusColor(drill.status) }}
                        />
                        <Text className="drill-name">{drill.name}</Text>
                        <Tag color={getStatusColor(drill.status)} className="status-tag">
                          {getStatusText(drill.status)}
                        </Tag>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </div>
              
              <div className="control-item">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefreshExecutions}
                  size="large"
                  className="sync-button"
                >
                  数据同步
                </Button>
              </div>
            </div>
          </div>
        </div>

        {selectedDrill && (
          <div className="data-section">
            <div className="data-grid">
              <div className="data-card primary">
                <div className="card-corner card-corner-tl"></div>
                <div className="card-corner card-corner-tr"></div>
                <div className="card-corner card-corner-bl"></div>
                <div className="card-corner card-corner-br"></div>
                <div className="card-header">
                  <DatabaseOutlined className="card-icon" />
                  <Text className="card-label">演练编号</Text>
                </div>
                <div className="card-value">
                  <Text className="value-text">{selectedDrill.name}</Text>
                </div>
                <div className="card-decoration"></div>
              </div>

              <div className="data-card status">
                <div className="card-corner card-corner-tl"></div>
                <div className="card-corner card-corner-tr"></div>
                <div className="card-corner card-corner-bl"></div>
                <div className="card-corner card-corner-br"></div>
                <div className="card-header">
                  <SyncOutlined className="card-icon" />
                  <Text className="card-label">系统状态</Text>
                </div>
                <div className="card-value">
                  <div className="status-display">
                    <div 
                      className="status-pulse"
                      style={{ background: getStatusColor(selectedDrill.status) }}
                    />
                    <Text className="value-text">{getStatusText(selectedDrill.status)}</Text>
                  </div>
                </div>
                <div className="card-decoration"></div>
              </div>

              <div className="data-card time">
                <div className="card-corner card-corner-tl"></div>
                <div className="card-corner card-corner-tr"></div>
                <div className="card-corner card-corner-bl"></div>
                <div className="card-corner card-corner-br"></div>
                <div className="card-header">
                  <ClockCircleOutlined className="card-icon" />
                  <Text className="card-label">开始时间</Text>
                </div>
                <div className="card-value">
                  <Text className="value-text mono">
                    {selectedDrill.start_time ? 
                      new Date(selectedDrill.start_time).toLocaleString('zh-CN', { 
                        month: '2-digit',
                        day: '2-digit',
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 
                      '未开始'
                    }
                  </Text>
                </div>
                <div className="card-decoration"></div>
              </div>

              <div className="data-card progress">
                <div className="card-corner card-corner-tl"></div>
                <div className="card-corner card-corner-tr"></div>
                <div className="card-corner card-corner-bl"></div>
                <div className="card-corner card-corner-br"></div>
                <div className="card-header">
                  <CheckCircleOutlined className="card-icon" />
                  <Text className="card-label">执行进度</Text>
                </div>
                <div className="card-value">
                  <div className="progress-display">
                    <Text className="value-text mono">
                      {executions.length > 0 ? 
                        `${Math.round((executions.filter(e => e.status === 'completed').length / executions.length) * 100)}%` :
                        '0%'
                      }
                    </Text>
                    <Progress 
                      type="line"
                      percent={executions.length > 0 ? 
                        (executions.filter(e => e.status === 'completed').length / executions.length) * 100 : 
                        0
                      }
                      strokeColor="#00D9FF"
                      trailColor="#2D3748"
                      showInfo={false}
                      className="progress-bar-custom"
                    />
                  </div>
                </div>
                <div className="card-decoration"></div>
              </div>
            </div>
          </div>
        )}

        {selectedDrill && (
          <div className="content-section">
            <Tabs 
              defaultActiveKey="hierarchy"
              size="large"
              className="content-tabs"
              items={[
                {
                  key: 'hierarchy',
                  label: (
                    <div className="tab-label">
                      <ApartmentOutlined className="tab-icon" />
                      <Text>层级视图</Text>
                    </div>
                  ),
                  children: selectedDrill.template_id ? (
                    <WorkflowHierarchyDisplay 
                      templateId={selectedDrill.template_id}
                      drillId={selectedDrill.id}
                      onRefresh={handleRefreshExecutions}
                    />
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <ApartmentOutlined />
                      </div>
                      <Title level={3}>未分配模板</Title>
                      <Text className="empty-desc">配置演练模板以启用层级视图</Text>
                      <Button 
                        className="action-button"
                        onClick={() => navigate('/admin/templates')}
                        icon={<ApartmentOutlined />}
                      >
                        配置模板
                      </Button>
                    </div>
                  )
                },
                {
                  key: 'messages',
                  label: (
                    <div className="tab-label">
                      <DashboardOutlined className="tab-icon" />
                      <Text>实时日志</Text>
                      <Tag className="message-count">{messages.length}</Tag>
                    </div>
                  ),
                  children: (
                    <MessageList messages={messages} />
                  )
                }
              ]}
            />
          </div>
        )}

        {!selectedDrill && (
          <div className="empty-state-full">
            <div className="empty-icon-large">
              <SyncOutlined />
            </div>
            <Title level={2}>无活跃演练</Title>
            <Text className="empty-desc">初始化演练实例以开始监控</Text>
            <Button 
              className="action-button-large"
              onClick={() => navigate('/admin/drills')}
              icon={<ThunderboltOutlined />}
            >
              创建演练
            </Button>
          </div>
        )}
      </div>

      <style>
        {`
          @import url('https://fonts.font.im/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono:wght@400;500;600;700&display=swap');

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

          .dashboard-container .ant-typography {
            color: #E5E7EB !important;
          }

          .dashboard-container .ant-typography.main-title {
            color: #00D9FF !important;
          }

          .dashboard-container .ant-typography.subtitle {
            color: #00D9FF !important;
          }

          .dashboard-container {
            min-height: 100vh;
            position: relative;
            overflow: hidden;
          }

          .dashboard-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--dark-bg);
            z-index: 0;
          }

          .grid-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(rgba(0, 217, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 217, 255, 0.05) 1px, transparent 1px);
            background-size: 40px 40px;
            animation: grid-pulse 8s ease-in-out infinite;
          }

          @keyframes grid-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }

          .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--primary-cyan), transparent);
            animation: scan 3s linear infinite;
            opacity: 0.8;
          }

          @keyframes scan {
            0% { top: 0; }
            100% { top: 100%; }
          }

          .data-flow {
            position: absolute;
            top: 20%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.5), transparent);
            animation: flow 5s ease-in-out infinite;
          }

          @keyframes flow {
            0%, 100% { transform: translateX(-100%); opacity: 0; }
            50% { transform: translateX(100%); opacity: 0.6; }
          }

          .data-flow-2 {
            position: absolute;
            top: 60%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.4), transparent);
            animation: flow2 7s ease-in-out infinite;
          }

          @keyframes flow2 {
            0%, 100% { transform: translateX(100%); opacity: 0; }
            50% { transform: translateX(-100%); opacity: 0.5; }
          }

          .hex-pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L55.98 15V45L30 60L4.02 45V15z' fill='none' stroke='rgba(0, 217, 255, 0.03)' stroke-width='1'/%3E%3C/svg%3E");
            background-size: 60px 60px;
            animation: hex-shift 20s linear infinite;
          }

          @keyframes hex-shift {
            0% { background-position: 0 0; }
            100% { background-position: 60px 60px; }
          }

          .particle-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            pointer-events: none;
          }

          .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--primary-cyan);
            border-radius: 50%;
            opacity: 0;
            animation: particle-float 15s linear infinite;
          }

          .particle.p1 { left: 10%; animation-delay: 0s; }
          .particle.p2 { left: 30%; animation-delay: 3s; }
          .particle.p3 { left: 50%; animation-delay: 6s; }
          .particle.p4 { left: 70%; animation-delay: 9s; }
          .particle.p5 { left: 90%; animation-delay: 12s; }

          @keyframes particle-float {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
          }

          .dashboard-content {
            position: relative;
            z-index: 1;
            max-width: 1600px;
            margin: 0 auto;
            padding: 40px 60px;
          }

          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 60px;
            padding-bottom: 40px;
            border-bottom: 2px solid var(--border-color);
            position: relative;
          }

          .header-section::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 200px;
            height: 2px;
            background: var(--primary-cyan);
            animation: header-glow 2s ease-in-out infinite;
          }

          @keyframes header-glow {
            0%, 100% { opacity: 0.5; width: 200px; }
            50% { opacity: 1; width: 300px; }
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 40px;
          }

          .logo-container {
            position: relative;
          }

          .logo-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: var(--dark-bg);
            position: relative;
            z-index: 1;
          }

          .logo-glow {
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            background: radial-gradient(circle, rgba(0, 217, 255, 0.4), transparent);
            border-radius: 30px;
            animation: glow-pulse 3s ease-in-out infinite;
          }

          @keyframes glow-pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }

          .logo-radar {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            pointer-events: none;
          }

          .logo-radar::before,
          .logo-radar::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            border: 1px solid rgba(0, 217, 255, 0.3);
          }

          .logo-radar::before {
            width: 60px;
            height: 60px;
            animation: radar-ring 3s ease-out infinite;
          }

          .logo-radar::after {
            width: 80px;
            height: 80px;
            animation: radar-ring 3s ease-out infinite 1.5s;
          }

          @keyframes radar-ring {
            0% { width: 30px; height: 30px; opacity: 0.8; border-width: 2px; }
            100% { width: 90px; height: 90px; opacity: 0; border-width: 1px; }
          }

          .header-info {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .main-title {
            color: #00D9FF !important;
            font-family: 'Orbitron', sans-serif;
            font-size: 36px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 3px;
            text-transform: uppercase;
            white-space: normal;
            word-break: break-word;
            text-shadow: 0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.2);
            position: relative;
            animation: title-glow 4s ease-in-out infinite;
          }

          @keyframes title-glow {
            0%, 100% { text-shadow: 0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.2); }
            50% { text-shadow: 0 0 30px rgba(0, 217, 255, 0.7), 0 0 60px rgba(0, 217, 255, 0.4), 0 0 80px rgba(147, 51, 234, 0.2); }
          }

          .subtitle-container {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .subtitle {
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            letter-spacing: 4px;
            text-transform: uppercase;
          }

          .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid var(--success-green);
            border-radius: 20px;
            min-width: 100px;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success-green);
            border-radius: 50%;
            animation: dot-pulse 2s ease-in-out infinite;
          }

          @keyframes dot-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          .status-text {
            color: var(--success-green);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            letter-spacing: 2px;
            white-space: nowrap;
          }

          .header-right {
            display: flex;
            align-items: center;
          }

          .control-panel {
            display: flex;
            gap: 20px;
            padding: 20px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            position: relative;
          }

          .control-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple));
          }

          .control-item {
            display: flex;
            align-items: center;
          }

          .drill-selector {
            width: 300px;
          }

          .drill-selector .ant-select-selector {
            background: rgba(26, 31, 58, 0.8) !important;
            border: 1px solid var(--border-color) !important;
            color: var(--text-primary) !important;
            font-family: 'Rajdhani', sans-serif;
          }

          .status-dot-mini {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: mini-pulse 2s ease-in-out infinite;
          }

          @keyframes mini-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }

          .drill-name {
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            white-space: normal;
            word-break: break-word;
          }

          .status-tag {
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            border-radius: 4px;
          }

          .sync-button {
            background: transparent;
            border: 1px solid var(--primary-cyan);
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            letter-spacing: 1px;
            transition: all 0.3s ease;
          }

          .sync-button:hover {
            background: rgba(0, 217, 255, 0.1);
            border-color: var(--primary-purple);
            color: var(--primary-purple);
          }

          .data-section {
            margin-bottom: 40px;
          }

          .data-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
          }

          .data-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            position: relative;
            overflow: visible;
            transition: all 0.3s ease;
          }

          .data-card:hover {
            transform: translateY(-4px);
            border-color: var(--primary-cyan);
          }

          .data-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--primary-cyan);
            border-radius: 16px 16px 0 0;
          }

          .data-card.primary::before {
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple));
          }

          .data-card.status::before {
            background: var(--success-green);
          }

          .data-card.time::before {
            background: var(--warning-orange);
          }

          .data-card.progress::before {
            background: var(--primary-purple);
          }

          .card-decoration {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(0, 217, 255, 0.1), transparent);
            border-radius: 0 0 16px 0;
          }

          .data-card::after {
            content: '';
            position: absolute;
            top: 8px;
            left: 8px;
            right: 8px;
            bottom: 8px;
            border: 1px solid transparent;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(0, 217, 255, 0.3), transparent 40%, transparent 60%, rgba(147, 51, 234, 0.3)) border-box;
            -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
          }

          .data-card:hover::after {
            opacity: 1;
          }

          .card-corner {
            position: absolute;
            width: 12px;
            height: 12px;
            pointer-events: none;
          }

          .card-corner::before,
          .card-corner::after {
            content: '';
            position: absolute;
            background: var(--primary-cyan);
          }

          .card-corner-tl { top: 6px; left: 6px; }
          .card-corner-tl::before { width: 12px; height: 2px; top: 0; left: 0; }
          .card-corner-tl::after { width: 2px; height: 12px; top: 0; left: 0; }

          .card-corner-tr { top: 6px; right: 6px; }
          .card-corner-tr::before { width: 12px; height: 2px; top: 0; right: 0; }
          .card-corner-tr::after { width: 2px; height: 12px; top: 0; right: 0; }

          .card-corner-bl { bottom: 6px; left: 6px; }
          .card-corner-bl::before { width: 12px; height: 2px; bottom: 0; left: 0; }
          .card-corner-bl::after { width: 2px; height: 12px; bottom: 0; left: 0; }

          .card-corner-br { bottom: 6px; right: 6px; }
          .card-corner-br::before { width: 12px; height: 2px; bottom: 0; right: 0; }
          .card-corner-br::after { width: 2px; height: 12px; bottom: 0; right: 0; }

          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .card-icon {
            color: var(--primary-cyan);
            font-size: 20px;
          }

          .card-label {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            white-space: normal;
            word-break: break-word;
          }

          .card-value {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
          }

          .value-text {
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 24px;
            font-weight: 600;
            white-space: normal;
            word-break: break-word;
          }

          .value-text.mono {
            font-family: 'Share Tech Mono', monospace;
          }

          .status-display {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .status-pulse {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            animation: status-pulse 2s ease-in-out infinite;
          }

          @keyframes status-pulse {
            0%, 100% { 
              opacity: 1;
              box-shadow: 0 0 8px currentColor;
            }
            50% { 
              opacity: 0.6;
              box-shadow: 0 0 16px currentColor;
            }
          }

          .progress-display {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .progress-bar-custom {
            height: 6px;
            border-radius: 3px;
            min-width: 100px;
          }

          .content-section {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 32px;
            position: relative;
            overflow: hidden;
          }

          .content-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple), var(--primary-cyan));
            background-size: 200% 100%;
            animation: border-slide 3s linear infinite;
          }

          @keyframes border-slide {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .content-section::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(
              from 0deg,
              transparent 0deg,
              rgba(0, 217, 255, 0.03) 60deg,
              transparent 120deg
            );
            animation: rotate-scan 8s linear infinite;
            pointer-events: none;
          }

          @keyframes rotate-scan {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .content-tabs {
            background: transparent;
          }

          .content-tabs .ant-tabs-tab {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 16px;
            padding: 12px 24px;
            margin: 0 8px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }

          .content-tabs .ant-tabs-tab:hover {
            color: var(--primary-cyan);
            background: rgba(0, 217, 255, 0.05);
          }

          .content-tabs .ant-tabs-tab-active {
            color: var(--primary-cyan);
            background: rgba(0, 217, 255, 0.1);
          }

          .content-tabs .ant-tabs-ink-bar {
            background: var(--primary-cyan);
            height: 3px;
          }

          .tab-label {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .tab-icon {
            font-size: 18px;
          }

          .message-count {
            background: rgba(147, 51, 234, 0.2);
            border: 1px solid var(--primary-purple);
            color: var(--primary-purple);
            font-family: 'Share Tech Mono', monospace;
            font-size: 12px;
            border-radius: 12px;
            padding: 2px 8px;
          }

          .empty-state {
            padding: 60px;
            text-align: center;
          }

          .empty-icon {
            width: 100px;
            height: 100px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
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

          .empty-state-full {
            min-height: 500px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px;
            position: relative;
          }

          .empty-state-full::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple));
          }

          .empty-icon-large {
            width: 120px;
            height: 120px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            color: var(--primary-cyan);
            margin-bottom: 32px;
            animation: empty-pulse 3s ease-in-out infinite;
          }

          @keyframes empty-pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
          }

          .action-button-large {
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border: none;
            color: var(--dark-bg);
            font-family: 'Rajdhani', sans-serif;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 2px;
            padding: 16px 48px;
            border-radius: 16px;
            transition: all 0.3s ease;
          }

          .action-button-large:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 217, 255, 0.5);
          }

          .loading-screen {
            min-height: 100vh;
            background: var(--dark-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .loading-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
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

          .grid-line:nth-child(3) {
            top: 70%;
            animation-delay: 1s;
          }

          @keyframes loading-line {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.8; }
          }

          .loading-content {
            text-align: center;
            z-index: 1;
          }

          .loading-icon {
            width: 100px;
            height: 100px;
            background: rgba(0, 217, 255, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: var(--primary-cyan);
            margin-bottom: 24px;
            animation: loading-rotate 2s linear infinite;
          }

          @keyframes loading-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-text {
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-size: 18px;
            letter-spacing: 2px;
          }

          .loading-progress {
            width: 200px;
            height: 4px;
            background: var(--border-color);
            border-radius: 2px;
            margin-top: 16px;
            overflow: hidden;
          }

          .progress-bar {
            width: 100%;
            height: 100%;
            background: var(--primary-cyan);
            animation: loading-progress 2s ease-in-out infinite;
          }

          @keyframes loading-progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          .error-screen {
            min-height: 100vh;
            background: var(--dark-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }

          .error-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }

          .grid-line.error {
            background: rgba(239, 68, 68, 0.3);
          }

          .error-content {
            text-align: center;
            z-index: 1;
          }

          .error-icon {
            width: 100px;
            height: 100px;
            background: rgba(239, 68, 68, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: var(--error-red);
            margin-bottom: 24px;
          }

          .error-message {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            margin-bottom: 24px;
          }

          .retry-button {
            background: transparent;
            border: 1px solid var(--error-red);
            color: var(--error-red);
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
            letter-spacing: 1px;
            padding: 12px 32px;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .retry-button:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: var(--warning-orange);
            color: var(--warning-orange);
          }

          @media (max-width: 1200px) {
            .data-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .main-title {
              font-size: 28px;
              white-space: normal;
            }
          }

          @media (max-width: 768px) {
            .dashboard-content {
              padding: 20px;
            }

            .header-section {
              flex-direction: column;
              gap: 24px;
            }

            .header-left {
              flex-direction: column;
              gap: 20px;
            }

            .main-title {
              font-size: 24px;
              white-space: normal;
            }

            .control-panel {
              flex-direction: column;
              width: 100%;
            }

            .drill-selector {
              width: 100%;
            }

            .data-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Dashboard