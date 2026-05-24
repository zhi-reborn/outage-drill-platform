import api from './api'
import { DrillTemplate, DrillInstance, StepExecution } from '../types'

export const drillService = {
  getTemplates: async (): Promise<DrillTemplate[]> => {
    const response = await api.get<DrillTemplate[]>('/templates')
    return response.data
  },

  getTemplate: async (id: number): Promise<DrillTemplate> => {
    const response = await api.get<DrillTemplate>(`/templates/${id}`)
    return response.data
  },

  createTemplate: async (data: Partial<DrillTemplate>): Promise<DrillTemplate> => {
    const response = await api.post<DrillTemplate>('/templates', data)
    return response.data
  },

  updateTemplate: async (id: number, data: Partial<DrillTemplate>): Promise<DrillTemplate> => {
    const response = await api.put<DrillTemplate>(`/templates/${id}`, data)
    return response.data
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/templates/${id}`)
  },

  getDrills: async (): Promise<DrillInstance[]> => {
    const response = await api.get<DrillInstance[]>('/drills')
    return response.data
  },

  getDrill: async (id: number): Promise<DrillInstance> => {
    const response = await api.get<DrillInstance>(`/drills/${id}`)
    return response.data
  },

  createDrill: async (data: { template_id: number; name: string }): Promise<DrillInstance> => {
    const response = await api.post<DrillInstance>('/drills', data)
    return response.data
  },

  startDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/start`)
  },

  pauseDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/pause`)
  },

  resumeDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/resume`)
  },

  endDrill: async (id: number): Promise<void> => {
    await api.post(`/drills/${id}/end`)
  },

  getMyTasks: async (): Promise<StepExecution[]> => {
    const response = await api.get<StepExecution[]>('/executions/my-tasks')
    return response.data
  },

  getExecution: async (id: number): Promise<StepExecution> => {
    const response = await api.get<StepExecution>(`/executions/${id}`)
    return response.data
  },

  getDrillExecutions: async (drillId: number): Promise<StepExecution[]> => {
    const response = await api.get<StepExecution[]>(`/executions/drill/${drillId}`)
    return response.data
  },

  assignStep: async (id: number, assigneeId: number): Promise<void> => {
    await api.post(`/executions/${id}/assign`, { assignee_id: assigneeId })
  },

  startExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/start`)
  },

  pauseExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/pause`)
  },

  resumeExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/resume`)
  },

  completeExecution: async (id: number): Promise<void> => {
    await api.post(`/executions/${id}/complete`)
  },
}