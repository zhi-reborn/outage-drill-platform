export interface User {
  id: number
  username: string
  password?: string
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
  phase_name?: string
  stage_name?: string
  task_name?: string
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

// New workflow hierarchy types
export interface Phase {
  id: number
  template_id: number
  name: string
  description: string
  order: number
  execution_mode: 'serial' | 'parallel'
  status: 'pending' | 'in_progress' | 'completed'
  estimated_start_time?: string
  estimated_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  template?: DrillTemplate
  stages?: Stage[]
}

export interface Stage {
  id: number
  phase_id: number
  name: string
  description: string
  order: number
  execution_mode: 'serial' | 'parallel'
  status: 'pending' | 'in_progress' | 'completed'
  estimated_start_time?: string
  estimated_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  phase?: Phase
  tasks?: Task[]
}

export interface Task {
  id: number
  stage_id: number
  name: string
  description: string
  order: number
  execution_mode: 'serial' | 'parallel'
  status: 'pending' | 'in_progress' | 'paused' | 'completed'
  department: string
  responsible_person_id?: number
  executor_id?: number
  reviewer_id?: number
  predecessor_ids: number[]
  estimated_start_time?: string
  estimated_end_time?: string
  estimated_duration: number
  actual_start_time?: string
  actual_end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  stage?: Stage
  operations?: Operation[]
  responsible_person?: User
  executor?: User
  reviewer?: User
}

export interface Operation {
  id: number
  task_id: number
  name: string
  description: string
  order: number
  execution_mode: 'serial' | 'parallel'
  status: 'pending' | 'in_progress' | 'paused' | 'completed'
  executor_id?: number
  predecessor_ids: number[]
  guide: string
  timeout_minutes: number
  estimated_start_time?: string
  estimated_end_time?: string
  actual_start_time?: string
  actual_end_time?: string
  duration_seconds: number
  created_at: string
  updated_at: string
  task?: Task
  executor?: User
}

// Update DrillTemplate to include phases
export interface DrillTemplateWithPhases extends DrillTemplate {
  phases?: Phase[]
}