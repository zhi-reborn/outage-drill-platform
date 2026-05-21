import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, message, Table, Select, Space, Typography } from 'antd'
import { webhookService, drillService } from '../../../services/drill'
import { DrillInstance } from '../../../types'

const { TextArea } = Input
const { Text } = Typography

const WebhookConfig: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [drills, setDrills] = useState<DrillInstance[]>([])
  const [selectedDrill, setSelectedDrill] = useState<number | null>(null)
  const [messageLogs, setMessageLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [sendForm] = Form.useForm()

  useEffect(() => {
    loadDrills()
  }, [])

  const loadDrills = async () => {
    try {
      const data = await drillService.getDrills()
      setDrills(data)
    } catch (error) {
      message.error('加载演练列表失败')
    }
  }

  const handleSaveWebhook = async () => {
    try {
      const values = await form.validateFields()
      setWebhookUrl(values.webhook_url)
      message.success('Webhook URL 已保存')
    } catch (error) {
      message.error('保存失败')
    }
  }

  const handleLoadLogs = async () => {
    if (!selectedDrill) {
      message.warning('请先选择演练')
      return
    }
    setLoading(true)
    try {
      const logs = await webhookService.getMessageLogs(selectedDrill)
      setMessageLogs(logs)
    } catch (error) {
      message.error('加载消息日志失败')
    }
    setLoading(false)
  }

  const handleSendMessage = async () => {
    try {
      const values = await sendForm.validateFields()
      await webhookService.sendMessage({
        drill_id: selectedDrill || 0,
        content: values.content,
      })
      message.success('消息已发送')
      sendForm.resetFields()
      handleLoadLogs()
    } catch (error) {
      message.error('发送失败')
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <Text style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {content}
        </Text>
      ),
    },
    {
      title: '发送时间',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: 'Webhook URL',
      dataIndex: 'webhook_url',
      key: 'webhook_url',
      render: (url: string) => url || '-',
    },
  ]

  return (
    <div>
      <Card title="Webhook 配置" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="webhook_url"
            label="企业微信 Webhook URL"
            rules={[{ required: false }]}
          >
            <Input 
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your-key"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSaveWebhook}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary">
          配置企业微信机器人 Webhook URL 后，演练过程中的通知消息将自动推送到企业微信群。
        </Text>
      </Card>

      <Card title="消息发送" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: 300 }}
            placeholder="选择演练"
            value={selectedDrill}
            onChange={(value) => setSelectedDrill(value)}
          >
            {drills.map(d => (
              <Select.Option key={d.id} value={d.id}>
                {d.name}
              </Select.Option>
            ))}
          </Select>

          <Form form={sendForm} layout="vertical">
            <Form.Item
              name="content"
              label="消息内容"
              rules={[{ required: true, message: '请输入消息内容' }]}
            >
              <TextArea rows={4} placeholder="输入要发送的消息内容" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleSendMessage}>
                发送消息
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>

      <Card title="消息日志">
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={handleLoadLogs} loading={loading}>
            加载日志
          </Button>
        </Space>
        <Table
          columns={columns}
          dataSource={messageLogs}
          rowKey="id"
          loading={loading}
        />
      </Card>
    </div>
  )
}

export default WebhookConfig