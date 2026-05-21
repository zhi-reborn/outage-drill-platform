import { useState } from 'react'
import { useAppStore } from '../store'
import { authService } from '../services/auth'
import { LoginRequest } from '../types'

export const useAuth = () => {
  const { user, token, setUser, setToken, logout } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest) => {
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login(credentials)
      setToken(response.token)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      return true
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logoutUser = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    logout()
  }

  const checkAuth = async () => {
    if (token) {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        logout()
      }
    }
  }

  return {
    user,
    token,
    loading,
    error,
    login,
    logout: logoutUser,
    checkAuth,
    isAuthenticated: !!token,
  }
}