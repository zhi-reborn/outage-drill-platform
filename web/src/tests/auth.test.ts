import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../pages/Login'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders login form correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      isAuthenticated: false,
    })

    render(<Login />)

    expect(screen.getByText('断网断电演练平台')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      isAuthenticated: false,
    })

    render(<Login />)

    const loginButton = screen.getByRole('button', { name: '登录' })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument()
      expect(screen.getByText('请输入密码')).toBeInTheDocument()
    })
  })

  it('calls login function with correct credentials', async () => {
    const mockLogin = vi.fn().mockResolvedValue(true)
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      checkAuth: vi.fn(),
      isAuthenticated: false,
    })

    render(<Login />)

    const usernameInput = screen.getByPlaceholderText('用户名')
    const passwordInput = screen.getByPlaceholderText('密码')
    const loginButton = screen.getByRole('button', { name: '登录' })

    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123',
      })
    })
  })

  it('shows loading state during login', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      isAuthenticated: false,
    })

    render(<Login />)

    const loginButton = screen.getByRole('button', { name: '登录' })
    expect(loginButton).toHaveAttribute('loading')
  })

  it('displays error message when login fails', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: '用户名或密码错误',
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
      isAuthenticated: false,
    })

    render(<Login />)

    expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
  })
})