import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber,
  Collapse,
  Typography,
  message,
  Popconfirm,
  Divider,
  Tag
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons'
import { workflowService } from '../../services/workflow'
import type { Phase, Stage, Task, Operation, DrillTemplateWithPhases } from '../../types'

const { TextArea } = Input
const { Text, Title } = Typography
const { Panel } = Collapse

interface WorkflowTemplateEditorProps {
  templateId: number
  onSave?: () => void
}

const WorkflowTemplateEditor: React.FC<WorkflowTemplateEditorProps> = ({ 
  templateId,
  onSave 
}) => {
  const [template, setTemplate] = useState<DrillTemplateWithPhases | null>(null)
  const [loading, setLoading] = useState(false)
  const [phaseModalVisible, setPhaseModalVisible] = useState(false)
  const [stageModalVisible, setStageModalVisible] = useState(false)
  const [taskModalVisible, setTaskModalVisible] = useState(false)
  const [operationModalVisible, setOperationModalVisible] = useState(false)
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [phaseForm] = Form.useForm()
  const [stageForm] = Form.useForm()
  const [taskForm] = Form.useForm()
  const [operationForm] = Form.useForm()

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

  const handleCreatePhase = () => {
    setEditingPhase(null)
    phaseForm.resetFields()
    setPhaseModalVisible(true)
  }

  const handleEditPhase = (phase: Phase) => {
    setEditingPhase(phase)
    phaseForm.setFieldsValue({
      name: phase.name,
      description: phase.description,
      order: phase.order,
      execution_mode: phase.execution_mode,
    })
    setPhaseModalVisible(true)
  }

  const handleDeletePhase = async (phaseId: number) => {
    try {
      await workflowService.deletePhase(phaseId)
      message.success('删除阶段成功')
      loadTemplateHierarchy()
    } catch (error) {
      message.error('删除阶段失败')
    }
  }

  const handlePhaseSubmit = async () => {
    try {
      const values = await phaseForm.validateFields()
      const phaseData: Partial<Phase> = {
        template_id: templateId,
        name: values.name,
        description: values.description,
        order: values.order,
        execution_mode: values.execution_mode,
        status: 'pending',
      }

      if (editingPhase) {
        await workflowService.updatePhase(editingPhase.id, phaseData)
        message.success('更新阶段成功')
      } else {
        await workflowService.createPhase(phaseData)
        message.success('创建阶段成功')
      }
      setPhaseModalVisible(false)
      loadTemplateHierarchy()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCreateStage = (phaseId: number) => {
    setSelectedPhaseId(phaseId)
    setEditingStage(null)
    stageForm.resetFields()
    setStageModalVisible(true)
  }

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage)
    setSelectedPhaseId(stage.phase_id)
    stageForm.setFieldsValue({
      name: stage.name,
      description: stage.description,
      order: stage.order,
      execution_mode: stage.execution_mode,
    })
    setStageModalVisible(true)
  }

  const handleDeleteStage = async (stageId: number) => {
    try {
      await workflowService.deleteStage(stageId)
      message.success('删除环节成功')
      loadTemplateHierarchy()
    } catch (error) {
      message.error('删除环节失败')
    }
  }

  const handleStageSubmit = async () => {
    try {
      const values = await stageForm.validateFields()
      const stageData: Partial<Stage> = {
        phase_id: selectedPhaseId!,
        name: values.name,
        description: values.description,
        order: values.order,
        execution_mode: values.execution_mode,
        status: 'pending',
      }

      if (editingStage) {
        await workflowService.updateStage(editingStage.id, stageData)
        message.success('更新环节成功')
      } else {
        await workflowService.createStage(stageData)
        message.success('创建环节成功')
      }
      setStageModalVisible(false)
      loadTemplateHierarchy()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCreateTask = (stageId: number) => {
    setSelectedStageId(stageId)
    setEditingTask(null)
    taskForm.resetFields()
    setTaskModalVisible(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setSelectedStageId(task.stage_id)
    taskForm.setFieldsValue({
      name: task.name,
      description: task.description,
      order: task.order,
      execution_mode: task.execution_mode,
      department: task.department,
      estimated_duration: task.estimated_duration,
    })
    setTaskModalVisible(true)
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      await workflowService.deleteTask(taskId)
      message.success('删除任务成功')
      loadTemplateHierarchy()
    } catch (error) {
      message.error('删除任务失败')
    }
  }

  const handleTaskSubmit = async () => {
    try {
      const values = await taskForm.validateFields()
      const taskData: Partial<Task> = {
        stage_id: selectedStageId!,
        name: values.name,
        description: values.description,
        order: values.order,
        execution_mode: values.execution_mode,
        department: values.department,
        estimated_duration: values.estimated_duration,
        predecessor_ids: [],
        status: 'pending',
      }

      if (editingTask) {
        await workflowService.updateTask(editingTask.id, taskData)
        message.success('更新任务成功')
      } else {
        await workflowService.createTask(taskData)
        message.success('创建任务成功')
      }
      setTaskModalVisible(false)
      loadTemplateHierarchy()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const handleCreateOperation = (taskId: number) => {
    setSelectedTaskId(taskId)
    setEditingOperation(null)
    operationForm.resetFields()
    setOperationModalVisible(true)
  }

  const handleEditOperation = (operation: Operation) => {
    setEditingOperation(operation)
    setSelectedTaskId(operation.task_id)
    operationForm.setFieldsValue({
      name: operation.name,
      description: operation.description,
      order: operation.order,
      execution_mode: operation.execution_mode,
      guide: operation.guide,
      timeout_minutes: operation.timeout_minutes,
    })
    setOperationModalVisible(true)
  }

  const handleDeleteOperation = async (operationId: number) => {
    try {
      await workflowService.deleteOperation(operationId)
      message.success('删除操作步骤成功')
      loadTemplateHierarchy()
    } catch (error) {
      message.error('删除操作步骤失败')
    }
  }

  const handleOperationSubmit = async () => {
    try {
      const values = await operationForm.validateFields()
      const operationData: Partial<Operation> = {
        task_id: selectedTaskId!,
        name: values.name,
        description: values.description,
        order: values.order,
        execution_mode: values.execution_mode,
        guide: values.guide,
        timeout_minutes: values.timeout_minutes,
        predecessor_ids: [],
        status: 'pending',
      }

      if (editingOperation) {
        await workflowService.updateOperation(editingOperation.id, operationData)
        message.success('更新操作步骤成功')
      } else {
        await workflowService.createOperation(operationData)
        message.success('创建操作步骤成功')
      }
      setOperationModalVisible(false)
      loadTemplateHierarchy()
    } catch (error) {
      message.error('操作失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'default',
      in_progress: 'processing',
      paused: 'warning',
      completed: 'success',
    }
    const statusTexts: Record<string, string> = {
      pending: '待开始',
      in_progress: '进行中',
      paused: '已暂停',
      completed: '已完成',
    }
    return <Tag color={statusColors[status]}>{statusTexts[status]}</Tag>
  }

  const getExecutionModeTag = (mode: string) => {
    const modeColors: Record<string, string> = {
      serial: 'blue',
      parallel: 'green',
    }
    const modeTexts: Record<string, string> = {
      serial: '串行',
      parallel: '并行',
    }
    return <Tag color={modeColors[mode]}>{modeTexts[mode]}</Tag>
  }

  if (!template) {
    return <Card loading={loading}>加载模板层级结构...</Card>
  }

  return (
    <div>
      <Card 
        title={
          <Space>
            <Title level={4}>{template.name}</Title>
            <Text type="secondary">层级结构编辑器</Text>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePhase}>
            新增阶段
          </Button>
        }
      >
        {template.phases && template.phases.length > 0 ? (
          <Collapse 
            defaultActiveKey={template.phases.map(p => `phase-${p.id}`)}
            expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
          >
            {template.phases.map((phase) => (
              <Panel 
                header={
                  <Space>
                    <Text strong>阶段 {phase.order}: {phase.name}</Text>
                    {getExecutionModeTag(phase.execution_mode)}
                    {getStatusTag(phase.status)}
                  </Space>
                }
                key={`phase-${phase.id}`}
                extra={
                  <Space>
                    <Button 
                      size="small" 
                      icon={<PlusOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCreateStage(phase.id)
                      }}
                    >
                      新增环节
                    </Button>
                    <Button 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditPhase(phase)
                      }}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确定删除此阶段?"
                      onConfirm={() => handleDeletePhase(phase.id)}
                    >
                      <Button 
                        size="small" 
                        icon={<DeleteOutlined />}
                        danger
                        onClick={(e) => e.stopPropagation()}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                {phase.stages && phase.stages.length > 0 ? (
                  <Collapse 
                    defaultActiveKey={phase.stages.map(s => `stage-${s.id}`)}
                    expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
                  >
                    {phase.stages.map((stage) => (
                      <Panel 
                        header={
                          <Space>
                            <Text>环节 {stage.order}: {stage.name}</Text>
                            {getExecutionModeTag(stage.execution_mode)}
                            {getStatusTag(stage.status)}
                          </Space>
                        }
                        key={`stage-${stage.id}`}
                        extra={
                          <Space>
                            <Button 
                              size="small" 
                              icon={<PlusOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreateTask(stage.id)
                              }}
                            >
                              新增任务
                            </Button>
                            <Button 
                              size="small" 
                              icon={<EditOutlined />}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditStage(stage)
                              }}
                            >
                              编辑
                            </Button>
                            <Popconfirm
                              title="确定删除此环节?"
                              onConfirm={() => handleDeleteStage(stage.id)}
                            >
                              <Button 
                                size="small" 
                                icon={<DeleteOutlined />}
                                danger
                                onClick={(e) => e.stopPropagation()}
                              >
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        }
                      >
                        {stage.tasks && stage.tasks.length > 0 ? (
                          <Collapse 
                            defaultActiveKey={stage.tasks.map(t => `task-${t.id}`)}
                            expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
                          >
                            {stage.tasks.map((task) => (
                              <Panel 
                                header={
                                  <Space>
                                    <Text>任务 {task.order}: {task.name}</Text>
                                    {getExecutionModeTag(task.execution_mode)}
                                    {getStatusTag(task.status)}
                                    {task.department && <Tag color="purple">{task.department}</Tag>}
                                  </Space>
                                }
                                key={`task-${task.id}`}
                                extra={
                                  <Space>
                                    <Button 
                                      size="small" 
                                      icon={<PlusOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCreateOperation(task.id)
                                      }}
                                    >
                                      新增操作
                                    </Button>
                                    <Button 
                                      size="small" 
                                      icon={<EditOutlined />}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditTask(task)
                                      }}
                                    >
                                      编辑
                                    </Button>
                                    <Popconfirm
                                      title="确定删除此任务?"
                                      onConfirm={() => handleDeleteTask(task.id)}
                                    >
                                      <Button 
                                        size="small" 
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        删除
                                      </Button>
                                    </Popconfirm>
                                  </Space>
                                }
                              >
                                {task.operations && task.operations.length > 0 ? (
                                  <div>
                                    {task.operations.map((operation) => (
                                      <Card 
                                        key={`operation-${operation.id}`}
                                        size="small"
                                        style={{ marginBottom: 8 }}
                                        title={
                                          <Space>
                                            <Text>操作 {operation.order}: {operation.name}</Text>
                                            {getExecutionModeTag(operation.execution_mode)}
                                            {getStatusTag(operation.status)}
                                          </Space>
                                        }
                                        extra={
                                          <Space>
                                            <Button 
                                              size="small" 
                                              icon={<EditOutlined />}
                                              onClick={() => handleEditOperation(operation)}
                                            >
                                              编辑
                                            </Button>
                                            <Popconfirm
                                              title="确定删除此操作?"
                                              onConfirm={() => handleDeleteOperation(operation.id)}
                                            >
                                              <Button 
                                                size="small" 
                                                icon={<DeleteOutlined />}
                                                danger
                                              >
                                                删除
                                              </Button>
                                            </Popconfirm>
                                          </Space>
                                        }
                                      >
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                          <Text type="secondary">{operation.description}</Text>
                                          {operation.guide && (
                                            <div>
                                              <Text strong>操作指引：</Text>
                                              <Text>{operation.guide}</Text>
                                            </div>
                                          )}
                                          <Text type="secondary">超时时间: {operation.timeout_minutes} 分钟</Text>
                                        </Space>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <Text type="secondary">暂无操作步骤</Text>
                                )}
                              </Panel>
                            ))}
                          </Collapse>
                        ) : (
                          <Text type="secondary">暂无任务</Text>
                        )}
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <Text type="secondary">暂无环节</Text>
                )}
              </Panel>
            ))}
          </Collapse>
        ) : (
          <Text type="secondary">暂无阶段，请点击"新增阶段"创建</Text>
        )}
      </Card>

      {/* Phase Modal */}
      <Modal
        title={editingPhase ? '编辑阶段' : '新增阶段'}
        open={phaseModalVisible}
        onOk={handlePhaseSubmit}
        onCancel={() => setPhaseModalVisible(false)}
        width={600}
      >
        <Form form={phaseForm} layout="vertical">
          <Form.Item
            name="name"
            label="阶段名称"
            rules={[{ required: true, message: '请输入阶段名称' }]}
          >
            <Input placeholder="例如：阶段1：应用降级" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="阶段描述" />
          </Form.Item>
          <Form.Item
            name="order"
            label="顺序"
            rules={[{ required: true, message: '请输入顺序' }]}
          >
            <InputNumber min={1} placeholder="阶段顺序" />
          </Form.Item>
          <Form.Item
            name="execution_mode"
            label="执行模式"
            rules={[{ required: true, message: '请选择执行模式' }]}
          >
            <Select>
              <Select.Option value="serial">串行执行</Select.Option>
              <Select.Option value="parallel">并行执行</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stage Modal */}
      <Modal
        title={editingStage ? '编辑环节' : '新增环节'}
        open={stageModalVisible}
        onOk={handleStageSubmit}
        onCancel={() => setStageModalVisible(false)}
        width={600}
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            name="name"
            label="环节名称"
            rules={[{ required: true, message: '请输入环节名称' }]}
          >
            <Input placeholder="例如：环节1：服务停止" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="环节描述" />
          </Form.Item>
          <Form.Item
            name="order"
            label="顺序"
            rules={[{ required: true, message: '请输入顺序' }]}
          >
            <InputNumber min={1} placeholder="环节顺序" />
          </Form.Item>
          <Form.Item
            name="execution_mode"
            label="执行模式"
            rules={[{ required: true, message: '请选择执行模式' }]}
          >
            <Select>
              <Select.Option value="serial">串行执行</Select.Option>
              <Select.Option value="parallel">并行执行</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Task Modal */}
      <Modal
        title={editingTask ? '编辑任务' : '新增任务'}
        open={taskModalVisible}
        onOk={handleTaskSubmit}
        onCancel={() => setTaskModalVisible(false)}
        width={600}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：任务1：停止Web服务" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="任务描述" />
          </Form.Item>
          <Form.Item
            name="order"
            label="顺序"
            rules={[{ required: true, message: '请输入顺序' }]}
          >
            <InputNumber min={1} placeholder="任务顺序" />
          </Form.Item>
          <Form.Item
            name="execution_mode"
            label="执行模式"
            rules={[{ required: true, message: '请选择执行模式' }]}
          >
            <Select>
              <Select.Option value="serial">串行执行</Select.Option>
              <Select.Option value="parallel">并行执行</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="department"
            label="责任部门"
          >
            <Input placeholder="例如：应用运维组" />
          </Form.Item>
          <Form.Item
            name="estimated_duration"
            label="预计耗时（分钟）"
          >
            <InputNumber min={1} placeholder="预计耗时" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Operation Modal */}
      <Modal
        title={editingOperation ? '编辑操作步骤' : '新增操作步骤'}
        open={operationModalVisible}
        onOk={handleOperationSubmit}
        onCancel={() => setOperationModalVisible(false)}
        width={600}
      >
        <Form form={operationForm} layout="vertical">
          <Form.Item
            name="name"
            label="操作名称"
            rules={[{ required: true, message: '请输入操作名称' }]}
          >
            <Input placeholder="例如：操作1：登录服务器" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="操作描述" />
          </Form.Item>
          <Form.Item
            name="order"
            label="顺序"
            rules={[{ required: true, message: '请输入顺序' }]}
          >
            <InputNumber min={1} placeholder="操作顺序" />
          </Form.Item>
          <Form.Item
            name="execution_mode"
            label="执行模式"
            rules={[{ required: true, message: '请选择执行模式' }]}
          >
            <Select>
              <Select.Option value="serial">串行执行</Select.Option>
              <Select.Option value="parallel">并行执行</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="guide"
            label="操作指引"
          >
            <TextArea rows={4} placeholder="例如：①打开终端 → ②执行ssh user@server → ③输入密码登录" />
          </Form.Item>
          <Form.Item
            name="timeout_minutes"
            label="超时时间（分钟）"
            rules={[{ required: true, message: '请输入超时时间' }]}
          >
            <InputNumber min={1} placeholder="超时时间" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WorkflowTemplateEditor