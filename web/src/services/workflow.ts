import api from './api'
import type { 
  Phase, 
  Stage, 
  Task, 
  Operation, 
  DrillTemplateWithPhases 
} from '../types'

export const workflowService = {
  // Phase operations
  getPhase: async (id: number): Promise<Phase> => {
    const response = await api.get(`/workflow/phases/${id}`)
    return response.data
  },

  getPhaseWithStages: async (id: number): Promise<Phase> => {
    const response = await api.get(`/workflow/phases/${id}/stages`)
    return response.data
  },

  getTemplatePhases: async (templateId: number): Promise<Phase[]> => {
    const response = await api.get(`/workflow/templates/${templateId}/phases`)
    return response.data
  },

  createPhase: async (phase: Partial<Phase>): Promise<Phase> => {
    const response = await api.post('/workflow/phases', phase)
    return response.data
  },

  updatePhase: async (id: number, phase: Partial<Phase>): Promise<Phase> => {
    const response = await api.put(`/workflow/phases/${id}`, phase)
    return response.data
  },

  deletePhase: async (id: number): Promise<void> => {
    await api.delete(`/workflow/phases/${id}`)
  },

  startPhase: async (id: number): Promise<void> => {
    await api.post(`/workflow/phases/${id}/start`)
  },

  completePhase: async (id: number): Promise<void> => {
    await api.post(`/workflow/phases/${id}/complete`)
  },

  // Stage operations
  getStage: async (id: number): Promise<Stage> => {
    const response = await api.get(`/workflow/stages/${id}`)
    return response.data
  },

  getStageWithTasks: async (id: number): Promise<Stage> => {
    const response = await api.get(`/workflow/stages/${id}/tasks`)
    return response.data
  },

  getPhaseStages: async (phaseId: number): Promise<Stage[]> => {
    const response = await api.get(`/workflow/stages/by-phase/${phaseId}`)
    return response.data
  },

  createStage: async (stage: Partial<Stage>): Promise<Stage> => {
    const response = await api.post('/workflow/stages', stage)
    return response.data
  },

  updateStage: async (id: number, stage: Partial<Stage>): Promise<Stage> => {
    const response = await api.put(`/workflow/stages/${id}`, stage)
    return response.data
  },

  deleteStage: async (id: number): Promise<void> => {
    await api.delete(`/workflow/stages/${id}`)
  },

  startStage: async (id: number): Promise<void> => {
    await api.post(`/workflow/stages/${id}/start`)
  },

  completeStage: async (id: number): Promise<void> => {
    await api.post(`/workflow/stages/${id}/complete`)
  },

  // Task operations
  getTask: async (id: number): Promise<Task> => {
    const response = await api.get(`/workflow/tasks/${id}`)
    return response.data
  },

  getTaskWithOperations: async (id: number): Promise<Task> => {
    const response = await api.get(`/workflow/tasks/${id}/operations`)
    return response.data
  },

  getTaskWithDetails: async (id: number): Promise<Task> => {
    const response = await api.get(`/workflow/tasks/${id}/details`)
    return response.data
  },

  getStageTasks: async (stageId: number): Promise<Task[]> => {
    const response = await api.get(`/workflow/tasks/by-stage/${stageId}`)
    return response.data
  },

  createTask: async (task: Partial<Task>): Promise<Task> => {
    const response = await api.post('/workflow/tasks', task)
    return response.data
  },

  updateTask: async (id: number, task: Partial<Task>): Promise<Task> => {
    const response = await api.put(`/workflow/tasks/${id}`, task)
    return response.data
  },

  deleteTask: async (id: number): Promise<void> => {
    await api.delete(`/workflow/tasks/${id}`)
  },

  startTask: async (id: number): Promise<void> => {
    await api.post(`/workflow/tasks/${id}/start`)
  },

  pauseTask: async (id: number): Promise<void> => {
    await api.post(`/workflow/tasks/${id}/pause`)
  },

  completeTask: async (id: number): Promise<void> => {
    await api.post(`/workflow/tasks/${id}/complete`)
  },

  // Operation operations
  getOperation: async (id: number): Promise<Operation> => {
    const response = await api.get(`/workflow/operations/${id}`)
    return response.data
  },

  getOperationWithDetails: async (id: number): Promise<Operation> => {
    const response = await api.get(`/workflow/operations/${id}/details`)
    return response.data
  },

  getTaskOperations: async (taskId: number): Promise<Operation[]> => {
    const response = await api.get(`/workflow/operations/by-task/${taskId}`)
    return response.data
  },

  createOperation: async (operation: Partial<Operation>): Promise<Operation> => {
    const response = await api.post('/workflow/operations', operation)
    return response.data
  },

  updateOperation: async (id: number, operation: Partial<Operation>): Promise<Operation> => {
    const response = await api.put(`/workflow/operations/${id}`, operation)
    return response.data
  },

  deleteOperation: async (id: number): Promise<void> => {
    await api.delete(`/workflow/operations/${id}`)
  },

  startOperation: async (id: number): Promise<void> => {
    await api.post(`/workflow/operations/${id}/start`)
  },

  pauseOperation: async (id: number): Promise<void> => {
    await api.post(`/workflow/operations/${id}/pause`)
  },

  completeOperation: async (id: number): Promise<void> => {
    await api.post(`/workflow/operations/${id}/complete`)
  },

  // Get full hierarchy
  getTemplateFullHierarchy: async (templateId: number): Promise<DrillTemplateWithPhases> => {
    const response = await api.get(`/workflow/templates/${templateId}/hierarchy`)
    return response.data
  },
}