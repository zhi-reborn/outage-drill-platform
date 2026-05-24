import React from 'react'
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { UserOutlined, DashboardOutlined, ToolOutlined, SettingOutlined, LogoutOutlined, BugOutlined } from '@ant-design/icons'
import { useAppStore } from '../../store'

const { Header, Content } = Layout

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAppStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getMenuItems = () => {
    const items: any[] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '指挥中心大屏',
      },
      {
        key: '/workbench',
        icon: <ToolOutlined />,
        label: '参演工作台',
      },
      {
        key: '/diagnostic',
        icon: <BugOutlined />,
        label: '系统诊断',
      },
    ]

    if (user?.role === 'admin' || user?.role === 'commander') {
      items.push({
        key: '/admin',
        icon: <SettingOutlined />,
        label: '管理后台',
        children: [
          {
            key: '/admin/users',
            label: '用户管理',
          },
          {
            key: '/admin/templates',
            label: '模板管理',
          },
          {
            key: '/admin/drills',
            label: '演练管理',
          },
          {
            key: '/admin/webhook',
            label: 'Webhook配置',
          },
        ],
      })
    }

    return items
  }

  const userMenuItems: any[] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `当前用户: ${user?.name || '未知'}`,
    },
    {
      key: 'role',
      label: `角色: ${user?.role || '未知'}`,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginRight: '24px',
            color: '#1890ff'
          }}>
            断网断电演练平台
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={getMenuItems()}
            onClick={handleMenuClick}
            style={{ border: 'none', flex: 1 }}
          />
        </div>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span>{user?.name || '用户'}</span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ 
        padding: '24px',
        background: '#f0f2f5',
        minHeight: 'calc(100vh - 64px)'
      }}>
        {children}
      </Content>
    </Layout>
  )
}

export default AppLayout