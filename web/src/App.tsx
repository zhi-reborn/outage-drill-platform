import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workbench from './pages/Workbench'
import AdminLayout from './pages/Admin/Layout'

const App: React.FC = () => {
  const { checkAuth, isAuthenticated, user } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [])

  const getRedirectPath = () => {
    if (!isAuthenticated) return '/login'
    if (user?.role === 'admin' || user?.role === 'commander') return '/dashboard'
    return '/workbench'
  }

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/workbench"
            element={
              isAuthenticated ? <Workbench /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/*"
            element={
              isAuthenticated && (user?.role === 'admin' || user?.role === 'commander') 
                ? <AdminLayout /> 
                : <Navigate to="/login" />
            }
          />
          <Route path="/" element={<Navigate to={getRedirectPath()} />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App