import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StepCard from '../components/StepCard'
import { StepExecution } from '../types'

describe('StepCard Component', () => {
  const mockExecution: StepExecution = {
    id: 1,
    drill_id: 1,
    step_order: 1,
    step_name: '应用降级',
    status: 'pending',
    duration_seconds: 0,
    created_at: '2026-05-21T10:00:00Z',
    updated_at: '2026-05-21T10:00:00Z',
  }

  it('renders step information correctly', () => {
    render(<StepCard execution={mockExecution} />)

    expect(screen.getByText('步骤1: 应用降级')).toBeInTheDocument()
    expect(screen.getByText('待开始')).toBeInTheDocument()
  })

  it('shows completed status correctly', () => {
    const completedExecution: StepExecution = {
      ...mockExecution,
      status: 'completed',
      duration_seconds: 120,
    }

    render(<StepCard execution={completedExecution} />)

    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('耗时: 120秒')).toBeInTheDocument()
  })

  it('shows in_progress status correctly', () => {
    const inProgressExecution: StepExecution = {
      ...mockExecution,
      status: 'in_progress',
    }

    render(<StepCard execution={inProgressExecution} isActive={true} />)

    expect(screen.getByText('进行中')).toBeInTheDocument()
  })

  it('shows timeout status correctly', () => {
    const timeoutExecution: StepExecution = {
      ...mockExecution,
      status: 'timeout',
    }

    render(<StepCard execution={timeoutExecution} />)

    expect(screen.getByText('超时')).toBeInTheDocument()
  })

  it('displays assignee information when available', () => {
    const executionWithAssignee: StepExecution = {
      ...mockExecution,
      assignee: {
        id: 2,
        username: 'participant1',
        name: '参演人员李四',
        role: 'participant',
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    }

    render(<StepCard execution={executionWithAssignee} />)

    expect(screen.getByText('执行人: 参演人员李四')).toBeInTheDocument()
  })
})