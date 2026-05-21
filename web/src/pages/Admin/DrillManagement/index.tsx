import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, Space, message, Tag, Popconfirm } from 'antd'
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { drillService } from '../../../services/drill'
import { DrillInstance, DrillTemplate } from '../../../types'

const DrillManagement: React.FC = () => {
  const [drills, setDrills] = useState<DrillInstance[]>([])
  const [templates, setTemplates] = useState<DrillTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadDrills()
    loadTemplates()
  }, [])

  const loadDrills = async () => {
    setLoading(true)
    try {
      const data = await drillService.getDrills()
      setDrills(data)
    } catch (error) {
      message.error('加载演练列表失败')
    }
    setLoading(false)
  }

  const loadTemplates = async () => {
    try {
      const data = await drillService.getTemplates()
      setTemplates(data)
    } catch (error) {
      message.error('加载模板列表失败')
    }
  }

  const handleCreate = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleCreateDrill = async () => {
    try {
      const values = await form.validateFields()
      await drillService.createDrill({
        template_id: values.template_id,
        name: values.name,
      })
      message.success('创建成功')
      setModalVisible(false)
      loadDrills()
    } catch (error) {
      message.error('创建失败')
    }
  }

  const handleStart = async (id: number) => {
    try {
      await drillService.startDrill(id)
      message.success('演练已启动')
      loadDrills()
    } catch (error) {
      message.error('启动失败')
    }
  }

  const handlePause = async (id: number) => {
    try {
      await drillService.pauseDrill(id)
      message.success('演练已暂停')
      loadDrills()
    } catch (error) {
      message.error('暂停失败')
    }
  }

  const handleResume = async (id: number) => {
    try {
      await drillService.resumeDrill(id)
      message.success('演练已恢复')
      loadDrills()
    } catch (error) {
      message.error('恢复失败')
    }
  }

  const handleEnd = async (id: number) => {
    try {
      await drillService.endDrill(id)
      message.success('演练已结束')
      loadDrills()
    } catch (error) {
      message.error('结束失败')
    }
  }

  const getStatusTag = (status: string) => {
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '演练名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '模板',
      key: 'template',
      render: (_: any, record: DrillInstance) => record.template?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建人',
      key: 'creator',
      render: (_: any, record: DrillInstance) => record.creator?.name || '-',
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time: string) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (time: string) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DrillInstance) => (
        <Space>
          {record.status === 'pending' && (
            <Popconfirm title="确定启动演练?" onConfirm={() => handleStart(record.id)}>
              <Button icon={<PlayCircleOutlined />} type="primary">
                启动
              </Button>
            </Popconfirm>
          )}
          {record.status === 'running' && (
            <>
              <Button icon={<PauseCircleOutlined />} onClick={() => handlePause(record.id)}>
                暂停
              </Button>
              <Popconfirm title="确定结束演练?" onConfirm={() => handleEnd(record.id)}>
                <Button icon={<CheckCircleOutlined />} danger>
                  结束
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'paused' && (
            <>
              <Button icon={<PlayCircleOutlined />} type="primary" onClick={() => handleResume(record.id)}>
                恢复
              </Button>
              <Popconfirm title="确定结束演练?" onConfirm={() => handleEnd(record.id)}>
                <Button icon={<CheckCircleOutlined />} danger>
                  结束
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增演练
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={drills}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="新增演练"
        open={modalVisible}
        onOk={handleCreateDrill}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="演练名称"
            rules={[{ required: true, message: '请输入演练名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="template_id"
            label="选择模板"
            rules={[{ required: true, message: '请选择模板' }]}
          >
            <Select>
              {templates.map(t => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DrillManagement