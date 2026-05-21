import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Select, Space, Typography } from 'antd'
import { useWebSocket } from '../../hooks/useWebSocket'
import { drillService } from '../../services/drill'
import { DrillInstance, StepExecution, WebSocketMessage } from '../../types'
import StepCard from '../../components/StepCard'
import MessageList from '../../components/MessageList'

const { Title, Text } = Typography

const Dashboard: React.FC = () => {
  const [drills, setDrills] = useState<DrillInstance[]>([])
  const [selectedDrill, setSelectedDrill] = useState<DrillInstance | null>(null)
  const [executions, setExecutions] = useState<StepExecution[]>([])
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
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
    const data = await drillService.getDrills()
    setDrills(data)
    if (data.length > 0) {
      const runningDrill = data.find(d => d.status === 'running')
      setSelectedDrill(runningDrill || data[0])
    }
  }

  const loadExecutions = async (drillId: number) => {
    const data = await drillService.getDrillExecutions(drillId)
    setExecutions(data)
  }

  const handleDrillChange = (drillId: number) => {
    const drill = drills.find(d => d.id === drillId)
    setSelectedDrill(drill || null)
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space size="large">
              <Title level={3}>指挥中心大屏</Title>
              <Select
                style={{ width: 300 }}
                value={selectedDrill?.id}
                onChange={handleDrillChange}
                placeholder="选择演练"
              >
                {drills.map(drill => (
                  <Select.Option key={drill.id} value={drill.id}>
                    {drill.name} ({drill.status})
                  </Select.Option>
                ))}
              </Select>
              {selectedDrill && (
                <Text>
                  状态: <Text strong>{selectedDrill.status}</Text>
                </Text>
              )}
            </Space>
          </Col>

          <Col span={24}>
            <Card title="流程步骤可视化">
              <Row gutter={[16, 16]}>
                {executions.map((execution, index) => (
                  <Col key={execution.id}>
                    <StepCard
                      execution={execution}
                      isActive={execution.status === 'in_progress'}
                    />
                    {index < executions.length - 1 && (
                      <div style={{
                        textAlign: 'center',
                        fontSize: 24,
                        color: '#999',
                        marginBottom: 16
                      }}>
                        ↓
                      </div>
                    )}
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="实时消息">
              <MessageList messages={messages} />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default Dashboard