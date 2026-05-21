import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Card, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { drillService } from '../../../services/drill'
import { DrillTemplate } from '../../../types'

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
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DrillTemplate | null>(null)
  const [steps, setSteps] = useState<StepFormData[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await drillService.getTemplates()
      setTemplates(data)
    } catch (error) {
      message.error('加载模板列表失败')
    }
    setLoading(false)
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
    setSteps(template.steps.map(s => ({
      order: s.order,
      name: s.name,
      description: s.description,
      timeout_minutes: s.timeout_minutes,
      guide: s.guide,
    })))
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增模板
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
      />

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
    </div>
  )
}

export default TemplateManagement