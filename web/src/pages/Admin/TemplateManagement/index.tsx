import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Card, Typography, Alert, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons'
import { drillService } from '../../../services/drill'
import { DrillTemplate } from '../../../types'
import WorkflowTemplateEditor from '../../../components/WorkflowTemplateEditor'
import WorkflowVisualization from '../../../components/WorkflowVisualization'

const { TextArea } = Input
const { Text } = Typography

interface StepFormData {
  order: number
  name: string
  description: string
  timeout_minutes: number
  guide: string
}

const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<DrillTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DrillTemplate | null>(null)
  const [steps, setSteps] = useState<StepFormData[]>([])
  const [form] = Form.useForm()
  const [workflowModalVisible, setWorkflowModalVisible] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

  useEffect(() => {
    console.log('TemplateManagement: 组件加载,开始获取模板数据')
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    setError('')
    
    console.log('loadTemplates: 开始调用API')
    
    try {
      const data = await drillService.getTemplates()
      console.log('loadTemplates: API返回数据:', data)
      console.log('loadTemplates: 数据长度:', data?.length)
      
      if (data && data.length > 0) {
        setTemplates(data)
        console.log('loadTemplates: 设置templates成功')
      } else {
        console.log('loadTemplates: 数据为空或长度为0')
        setTemplates([])
        setError('没有找到模板数据')
      }
    } catch (error: any) {
      console.error('loadTemplates: API调用失败:', error)
      console.error('loadTemplates: 错误详情:', error.response?.data)
      setError(error.response?.data?.error || error.message || '加载模板列表失败')
      message.error('加载模板列表失败')
    }
    
    setLoading(false)
    console.log('loadTemplates: 完成,loading设置为false')
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    form.resetFields()
    setSteps([])
    setModalVisible(true)
  }

  const handleEdit = (template: DrillTemplate) => {
    setEditingTemplate(template)
    form.setFieldsValue({
      name: template.name,
      description: template.description,
    })
    setSteps(template.steps?.map(s => ({
      order: s.order,
      name: s.name,
      description: s.description,
      timeout_minutes: s.timeout_minutes,
      guide: s.guide,
    })) || [])
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await drillService.deleteTemplate(id)
      message.success('删除成功')
      loadTemplates()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleAddStep = () => {
    const newStep: StepFormData = {
      order: steps.length + 1,
      name: '',
      description: '',
      timeout_minutes: 10,
      guide: '',
    }
    setSteps([...steps, newStep])
  }

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps.map((s, i) => ({ ...s, order: i + 1 })))
  }

  const handleStepChange = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (steps.length === 0) {
        message.error('请添加至少一个步骤')
        return
      }

      const templateData = {
        name: values.name,
        description: values.description,
        steps: steps,
      }

      if (editingTemplate) {
        await drillService.updateTemplate(editingTemplate.id, templateData)
        message.success('更新成功')
      } else {
        await drillService.createTemplate(templateData)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadTemplates()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleRefresh = () => {
    console.log('handleRefresh: 手动刷新')
    loadTemplates()
  }

  const handleOpenWorkflowEditor = (templateId: number) => {
    setSelectedTemplateId(templateId)
    setWorkflowModalVisible(true)
  }

  console.log('TemplateManagement: 当前templates状态:', templates)
  console.log('TemplateManagement: 当前loading状态:', loading)
  console.log('TemplateManagement: 当前error状态:', error)

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '步骤数',
      key: 'steps_count',
      render: (_: any, record: DrillTemplate) => record.steps?.length || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DrillTemplate) => (
        <Space>
          <Button 
            icon={<ApartmentOutlined />} 
            onClick={() => handleOpenWorkflowEditor(record.id)}
          >
            层级结构
          </Button>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此模板?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增模板
          </Button>
          <Button onClick={handleRefresh} loading={loading}>
            刷新数据
          </Button>
        </Space>
      </div>

      {error && (
        <Alert 
          message="错误提示" 
          description={error}
          type="error"
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16 }}
        />
      )}

      {templates.length === 0 && !loading && !error && (
        <Alert 
          message="提示" 
          description="暂无模板数据，请点击'新增模板'创建"
          type="info"
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          当前显示 {templates.length} 个模板
        </Text>
      </div>

      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Card title="流程步骤" style={{ marginBottom: 16 }}>
            <Button onClick={handleAddStep} style={{ marginBottom: 16 }}>
              添加步骤
            </Button>
            {steps.map((step, index) => (
              <Card key={index} size="small" style={{ marginBottom: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>步骤 {step.order}</Text>
                  <Input
                    placeholder="步骤名称"
                    value={step.name}
                    onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="步骤描述"
                    value={step.description}
                    onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                  />
                  <Input
                    placeholder="超时时间(分钟)"
                    type="number"
                    value={step.timeout_minutes}
                    onChange={(e) => handleStepChange(index, 'timeout_minutes', parseInt(e.target.value))}
                  />
                  <TextArea
                    placeholder="操作指引"
                    value={step.guide}
                    onChange={(e) => handleStepChange(index, 'guide', e.target.value)}
                    rows={2}
                  />
                  <Button danger onClick={() => handleRemoveStep(index)}>
                    删除步骤
                  </Button>
                </Space>
              </Card>
            ))}
          </Card>
        </Form>
      </Modal>

      <Modal
        title="层级结构编辑器"
        open={workflowModalVisible}
        onCancel={() => setWorkflowModalVisible(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        {selectedTemplateId && (
          <Tabs defaultActiveKey="editor">
            <Tabs.TabPane tab="编辑器" key="editor">
              <WorkflowTemplateEditor 
                templateId={selectedTemplateId}
                onSave={() => {
                  loadTemplates()
                }}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="可视化" key="visualization">
              <WorkflowVisualization templateId={selectedTemplateId} />
            </Tabs.TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  )
}

export default TemplateManagement