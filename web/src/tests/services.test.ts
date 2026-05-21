import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../services/api'
import { authService } from '../services/auth'
import { drillService } from '../services/drill'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
  },
}))

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login calls correct endpoint with credentials', async () => {
    const mockResponse = { data: { token: 'test-token' } }
    vi.mocked(api.post).mockResolvedValue(mockResponse)

    const result = await authService.login({
      username: 'admin',
      password: 'admin123',
    })

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'admin123',
    })
    expect(result).toEqual({ token: 'test-token' })
  })

  it('logout calls correct endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({})

    await authService.logout()

    expect(api.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('getCurrentUser calls correct endpoint', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      name: '系统管理员',
      role: 'admin',
      created_at: '2026-05-21T10:00:00Z',
      updated_at: '2026-05-21T10:00:00Z',
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockUser })

    const result = await authService.getCurrentUser()

    expect(api.get).toHaveBeenCalledWith('/users/me')
    expect(result).toEqual(mockUser)
  })
})

describe('Drill Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getTemplates calls correct endpoint', async () => {
    const mockTemplates = [
      {
        id: 1,
        name: '标准灾备演练流程',
        description: '测试描述',
        steps: [],
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockTemplates })

    const result = await drillService.getTemplates()

    expect(api.get).toHaveBeenCalledWith('/templates')
    expect(result).toEqual(mockTemplates)
  })

  it('getDrills calls correct endpoint', async () => {
    const mockDrills = [
      {
        id: 1,
        template_id: 1,
        name: '测试演练',
        status: 'running',
        created_by: 1,
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockDrills })

    const result = await drillService.getDrills()

    expect(api.get).toHaveBeenCalledWith('/drills')
    expect(result).toEqual(mockDrills)
  })

  it('createDrill calls correct endpoint with data', async () => {
    const mockDrill = {
      id: 1,
      template_id: 1,
      name: '新演练',
      status: 'pending',
      created_by: 1,
      created_at: '2026-05-21T10:00:00Z',
      updated_at: '2026-05-21T10:00:00Z',
    }
    vi.mocked(api.post).mockResolvedValue({ data: mockDrill })

    const result = await drillService.createDrill({
      template_id: 1,
      name: '新演练',
    })

    expect(api.post).toHaveBeenCalledWith('/drills', {
      template_id: 1,
      name: '新演练',
    })
    expect(result).toEqual(mockDrill)
  })

  it('startDrill calls correct endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({})

    await drillService.startDrill(1)

    expect(api.post).toHaveBeenCalledWith('/drills/1/start')
  })

  it('endDrill calls correct endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({})

    await drillService.endDrill(1)

    expect(api.post).toHaveBeenCalledWith('/drills/1/end')
  })

  it('getMyTasks calls correct endpoint', async () => {
    const mockTasks = [
      {
        id: 1,
        drill_id: 1,
        step_order: 1,
        step_name: '应用降级',
        status: 'pending',
        duration_seconds: 0,
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockTasks })

    const result = await drillService.getMyTasks()

    expect(api.get).toHaveBeenCalledWith('/executions/my-tasks')
    expect(result).toEqual(mockTasks)
  })

  it('completeExecution calls correct endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({})

    await drillService.completeExecution(1)

    expect(api.post).toHaveBeenCalledWith('/executions/1/complete')
  })
})