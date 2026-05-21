import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppStore } from '../store'

describe('App Store', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      user: null,
      token: null,
      currentDrill: null,
      myTasks: [],
    })
  })

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useAppStore())

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.currentDrill).toBeNull()
    expect(result.current.myTasks).toEqual([])
  })

  it('sets user correctly', () => {
    const { result } = renderHook(() => useAppStore())

    const mockUser = {
      id: 1,
      username: 'admin',
      name: '系统管理员',
      role: 'admin' as const,
      created_at: '2026-05-21T10:00:00Z',
      updated_at: '2026-05-21T10:00:00Z',
    }

    act(() => {
      result.current.setUser(mockUser)
    })

    expect(result.current.user).toEqual(mockUser)
  })

  it('sets token and stores in localStorage', () => {
    const { result } = renderHook(() => useAppStore())

    act(() => {
      result.current.setToken('test-token')
    })

    expect(result.current.token).toBe('test-token')
    expect(localStorage.getItem('token')).toBe('test-token')
  })

  it('removes token from localStorage when set to null', () => {
    const { result } = renderHook(() => useAppStore())

    act(() => {
      result.current.setToken('test-token')
    })

    act(() => {
      result.current.setToken(null)
    })

    expect(result.current.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('sets current drill correctly', () => {
    const { result } = renderHook(() => useAppStore())

    const mockDrill = {
      id: 1,
      template_id: 1,
      name: '测试演练',
      status: 'running' as const,
      created_by: 1,
      created_at: '2026-05-21T10:00:00Z',
      updated_at: '2026-05-21T10:00:00Z',
    }

    act(() => {
      result.current.setCurrentDrill(mockDrill)
    })

    expect(result.current.currentDrill).toEqual(mockDrill)
  })

  it('sets my tasks correctly', () => {
    const { result } = renderHook(() => useAppStore())

    const mockTasks = [
      {
        id: 1,
        drill_id: 1,
        step_order: 1,
        step_name: '应用降级',
        status: 'pending' as const,
        duration_seconds: 0,
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      },
    ]

    act(() => {
      result.current.setMyTasks(mockTasks)
    })

    expect(result.current.myTasks).toEqual(mockTasks)
  })

  it('logout clears all state and localStorage', () => {
    const { result } = renderHook(() => useAppStore())

    act(() => {
      result.current.setToken('test-token')
      result.current.setUser({
        id: 1,
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
      })
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(result.current.currentDrill).toBeNull()
    expect(result.current.myTasks).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
  })
})