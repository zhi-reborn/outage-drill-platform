import React from 'react'
import { Layout, Menu, Typography, Dropdown, Avatar, Space, Divider } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  UserOutlined, FileTextOutlined, ThunderboltOutlined, ApiOutlined,
  DashboardOutlined, ToolOutlined, BugOutlined, LogoutOutlined,
  HomeOutlined, SettingOutlined
} from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

const AdminLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const topMenuItems = [
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
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: '管理后台',
    },
  ]

  const sideMenuItems = [
    {
      key: 'quick-nav',
      label: '快捷导航',
      type: 'group',
    },
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
      type: 'divider',
    },
    {
      key: 'admin-nav',
      label: '管理功能',
      type: 'group',
    },
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

  const userMenuItems = [
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
      type: 'divider',
    },
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
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'logout') {
      logout()
      navigate('/login')
    } else if (e.key.startsWith('/')) {
      navigate(e.key)
    }
  }

  return (
    <Layout className="admin-layout">
      <Header className="admin-header">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">
              <ThunderboltOutlined />
            </div>
            <Title level={4} className="logo-title">
              容灾演练指挥平台
            </Title>
          </div>
          
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname.startsWith('/admin') ? '/admin' : location.pathname]}
            items={topMenuItems}
            onClick={handleMenuClick}
            className="top-menu"
          />
        </div>

        <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
          <div className="user-section">
            <Avatar icon={<UserOutlined />} className="user-avatar" />
            <Text className="user-name">{user?.name || '用户'}</Text>
          </div>
        </Dropdown>
      </Header>

      <Layout className="admin-body">
        <Sider width={220} className="admin-sider">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['quick-nav', 'admin-nav']}
            items={sideMenuItems}
            onClick={handleMenuClick}
            className="side-menu"
          />
        </Sider>

        <Content className="admin-content">
          <div className="content-header">
            <div className="header-info">
              <Text className="page-title">
                {location.pathname === '/admin/users' && '用户管理'}
                {location.pathname === '/admin/templates' && '模板管理'}
                {location.pathname === '/admin/drills' && '演练管理'}
                {location.pathname === '/admin/webhooks' && 'Webhook配置'}
              </Text>
              <Divider type="vertical" className="header-divider" />
              <Text className="page-desc">
                {location.pathname === '/admin/users' && '管理系统用户账号'}
                {location.pathname === '/admin/templates' && '管理演练流程模板'}
                {location.pathname === '/admin/drills' && '管理演练实例'}
                {location.pathname === '/admin/webhooks' && '配置企业微信Webhook'}
              </Text>
            </div>
            
            <Space className="quick-links">
              <a onClick={() => navigate('/dashboard')} className="quick-link">
                <DashboardOutlined /> 指挥中心
              </a>
              <Divider type="vertical" className="link-divider" />
              <a onClick={() => navigate('/workbench')} className="quick-link">
                <ToolOutlined /> 参演工作台
              </a>
            </Space>
          </div>

          <Outlet />
        </Content>
      </Layout>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700&display=swap');

          :root {
            --primary-color: #00D9FF;
            --secondary-color: #9333EA;
            --background-dark: #0A0E27;
            --background-card: #1A1F3A;
            --background-sider: #0F1429;
            --text-primary: #E5E7EB;
            --text-secondary: #9CA3AF;
            --border-color: #2D3748;
            --success-color: #10B981;
            --warning-color: #F59E0B;
            --error-color: #EF4444;
          }

          .admin-layout {
            min-height: 100vh;
            background: var(--background-dark);
          }

          .admin-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--background-card);
            border-bottom: 1px solid var(--border-color);
            padding: 0 24px;
            height: 64px;
            position: relative;
          }

          .admin-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 32px;
          }

          .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: var(--background-dark);
          }

          .logo-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 1px;
          }

          .top-menu {
            background: transparent;
            border: none;
            flex: 1;
          }

          .top-menu .ant-menu-item {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            border-bottom: 2px solid transparent;
            transition: all 0.3s ease;
          }

          .top-menu .ant-menu-item:hover {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
          }

          .top-menu .ant-menu-item-selected {
            color: var(--primary-color);
            background: rgba(0, 217, 255, 0.1);
            border-bottom-color: var(--primary-color);
          }

          .user-section {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }

          .user-section:hover {
            background: rgba(0, 217, 255, 0.1);
          }

          .user-avatar {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: var(--background-dark);
          }

          .user-name {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
          }

          .admin-body {
            background: var(--background-dark);
          }

          .admin-sider {
            background: var(--background-sider);
            border-right: 1px solid var(--border-color);
            overflow: auto;
          }

          .side-menu {
            background: transparent;
            border: none;
            height: 100%;
            padding-top: 16px;
          }

          .side-menu .ant-menu-item-group-title {
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            letter-spacing: 1px;
            padding: 8px 16px;
          }

          .side-menu .ant-menu-item {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            margin: 4px 8px;
            border-radius: 8px;
            transition: all 0.3s ease;
          }

          .side-menu .ant-menu-item:hover {
            color: var(--primary-color);
            background: rgba(0, 217, 255, 0.1);
          }

          .side-menu .ant-menu-item-selected {
            color: var(--primary-color);
            background: rgba(0, 217, 255, 0.15);
            border-left: 3px solid var(--primary-color);
          }

          .admin-content {
            background: var(--background-dark);
            padding: 24px;
            overflow: auto;
          }

          .content-header {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .content-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            border-radius: 12px 12px 0 0;
          }

          .header-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .page-title {
            color: var(--text-primary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 16px;
            font-weight: 600;
          }

          .header-divider {
            background: var(--border-color);
            margin: 0 8px;
          }

          .page-desc {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
          }

          .quick-links {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .quick-link {
            color: var(--primary-color);
            font-family: 'Noto Sans SC', sans-serif;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .quick-link:hover {
            color: var(--secondary-color);
          }

          .link-divider {
            background: var(--border-color);
          }

          .ant-dropdown-menu {
            background: var(--background-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px;
          }

          .ant-dropdown-menu-item {
            color: var(--text-secondary);
            font-family: 'Noto Sans SC', sans-serif;
            border-radius: 6px;
            transition: all 0.3s ease;
          }

          .ant-dropdown-menu-item:hover {
            color: var(--primary-color);
            background: rgba(0, 217, 255, 0.1);
          }

          .ant-dropdown-menu-item-danger {
            color: var(--error-color);
          }

          .ant-dropdown-menu-item-danger:hover {
            color: var(--error-color);
            background: rgba(239, 68, 68, 0.1);
          }

          @media (max-width: 768px) {
            .admin-header {
              padding: 0 16px;
            }

            .header-left {
              gap: 16px;
            }

            .logo-title {
              font-size: 14px;
            }

            .admin-content {
              padding: 16px;
            }

            .content-header {
              flex-direction: column;
              gap: 16px;
              align-items: flex-start;
            }
          }
        `}
      </style>
    </Layout>
  )
}

export default AdminLayout