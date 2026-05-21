export interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'commander' | 'participant'
  created_at: string
  updated_at: string
}

export interface StepDefinition {
  order: number
  name: string
  description: string
  timeout_minutes: number
  guide: string
}

export interface DrillTemplate {
  id: number
  name: string
  description: string
  steps: StepDefinition[]
  created_at: string
  updated_at: string
}

export interface DrillInstance {
  id: number
  template_id: number
  name: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled'
  start_time?: string
  end_time?: string
  created_by: number
  created_at: string
  updated_at: string
  template?: DrillTemplate
  creator?: User
}

export interface StepExecution {
  id: number
  drill_id: number
  step_order: number
  step_name: string
  assignee_id?: number
  status: 'pending' | 'in_progress' | 'completed' | 'timeout'
  start_time?: string
  end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  drill?: DrillInstance
  assignee?: User
}

export interface MessageLog {
  id: number
  drill_id: number
  content: string
  sent_at: string
  webhook_url: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user?: User
}

export interface WebSocketMessage {
  type: 'step_update' | 'drill_update' | 'message' | 'timeout_warning'
  drill_id?: number
  user_id?: number
  data?: any
  timestamp?: string
}