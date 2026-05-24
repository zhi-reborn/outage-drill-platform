import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workbench from './pages/Workbench'
import AdminLayout from './pages/Admin/Layout'
import UserManagement from './pages/Admin/UserManagement'
import TemplateManagement from './pages/Admin/TemplateManagement'
import DrillManagement from './pages/Admin/DrillManagement'
import WebhookConfig from './pages/Admin/WebhookConfig'
import AppLayout from './components/Layout'
import DiagnosticPage from './pages/Diagnostic'

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
              isAuthenticated ? (
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/workbench"
            element={
              isAuthenticated ? (
                <AppLayout>
                  <Workbench />
                </AppLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated && (user?.role === 'admin' || user?.role === 'commander') 
                ? <AdminLayout /> 
                : <Navigate to="/login" />
            }
          >
            <Route path="users" element={<UserManagement />} />
            <Route path="templates" element={<TemplateManagement />} />
            <Route path="drills" element={<DrillManagement />} />
            <Route path="webhooks" element={<WebhookConfig />} />
            <Route index element={<Navigate to="/admin/templates" />} />
          </Route>
          <Route
            path="/diagnostic"
            element={
              isAuthenticated ? (
                <AppLayout>
                  <DiagnosticPage />
                </AppLayout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/" element={<Navigate to={getRedirectPath()} />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App