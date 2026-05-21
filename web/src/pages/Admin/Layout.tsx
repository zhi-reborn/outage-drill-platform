import React from 'react'
import { Layout, Menu, Typography } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { UserOutlined, FileTextOutlined, ThunderboltOutlined, ApiOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Header, Sider, Content } = Layout
const { Title } = Typography

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const menuItems = [
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/admin/templates',
      icon: <FileTextOutlined />,
      label: '模板管理',
    },
    {
      key: '/admin/drills',
      icon: <ThunderboltOutlined />,
      label: '演练管理',
    },
    {
      key: '/admin/webhooks',
      icon: <ApiOutlined />,
      label: 'Webhook配置',
    },
  ]

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px'
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          断网断电演练平台 - 管理后台
        </Title>
        <div style={{ color: '#fff' }}>
          <span style={{ marginRight: 16 }}>用户: {user?.name}</span>
          <a onClick={handleLogout} style={{ color: '#fff' }}>退出</a>
        </div>
      </Header>
      <Layout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout