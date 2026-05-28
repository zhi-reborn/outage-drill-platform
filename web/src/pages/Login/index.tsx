import React from 'react'
import { Form, Input, Button, Typography } from 'antd'
import { UserOutlined, LockOutlined, ThunderboltOutlined, SafetyCertificateOutlined, ApiOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    const success = await login({
      username: values.username,
      password: values.password,
    })

    if (success) {
      navigate('/dashboard')
    }
  }

  React.useEffect(() => {
    if (error) {
      form.setFields([
        {
          name: 'password',
          errors: [error],
        },
      ])
    }
  }, [error])

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="grid-pattern"></div>
        <div className="scan-line"></div>
        <div className="data-stream"></div>
        <div className="corner-decoration top-left"></div>
        <div className="corner-decoration top-right"></div>
        <div className="corner-decoration bottom-left"></div>
        <div className="corner-decoration bottom-right"></div>
      </div>

      <div className="login-content">
        <div className="login-header">
          <div className="logo-section">
            <div className="logo-frame">
              <div className="logo-icon">
                <ThunderboltOutlined />
              </div>
              <div className="logo-ring"></div>
            </div>
          </div>
          
          <div className="title-section">
            <Title level={1} className="main-title">
              容灾演练指挥平台
            </Title>
            <div className="subtitle-line">
              <div className="line-decoration"></div>
              <Text className="subtitle">DISASTER RECOVERY COMMAND SYSTEM</Text>
              <div className="line-decoration"></div>
            </div>
          </div>

          <div className="system-info">
            <div className="info-item">
              <SafetyCertificateOutlined className="info-icon" />
              <Text className="info-text">安全认证</Text>
            </div>
            <div className="info-item">
              <ApiOutlined className="info-icon" />
              <Text className="info-text">实时监控</Text>
            </div>
          </div>
        </div>

        <div className="login-form-container">
          <div className="form-header">
            <div className="header-decoration left"></div>
            <Title level={2} className="form-title">系统登录</Title>
            <div className="header-decoration right"></div>
          </div>

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            className="login-form"
          >
            <div className="form-section">
              <div className="input-group">
                <div className="input-label">
                  <UserOutlined className="label-icon" />
                  <Text className="label-text">用户名</Text>
                </div>
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input
                    className="cyber-input"
                    placeholder="请输入用户名"
                    size="large"
                  />
                </Form.Item>
              </div>

              <div className="input-group">
                <div className="input-label">
                  <LockOutlined className="label-icon" />
                  <Text className="label-text">密码</Text>
                </div>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    className="cyber-input"
                    placeholder="请输入密码"
                    size="large"
                  />
                </Form.Item>
              </div>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-button"
              >
                {loading ? '正在验证...' : '登录系统'}
              </Button>
            </Form.Item>
          </Form>

          <div className="form-footer">
            <div className="footer-line"></div>
            <Text className="footer-text">
              VERSION 2.0.1 | SYSTEM STATUS: ONLINE
            </Text>
          </div>
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.font.im/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono:wght@400;500;600;700&display=swap');

          :root {
            --primary-cyan: #00D9FF;
            --primary-purple: #9333EA;
            --dark-bg: #0A0E27;
            --card-bg: #1A1F3A;
            --text-primary: #E5E7EB;
            --text-secondary: #9CA3AF;
            --border-color: #2D3748;
            --success-green: #10B981;
            --warning-orange: #F59E0B;
            --error-red: #EF4444;
          }

          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }

          .login-background {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--dark-bg);
            z-index: 0;
          }

          .grid-pattern {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(rgba(0, 217, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 217, 255, 0.03) 1px, transparent 1px);
            background-size: 60px 60px;
            animation: grid-move 15s linear infinite;
          }

          @keyframes grid-move {
            0% { transform: translate(0, 0); }
            100% { transform: translate(60px, 60px); }
          }

          .scan-line {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--primary-cyan), transparent);
            animation: scan 4s linear infinite;
            opacity: 0.7;
          }

          @keyframes scan {
            0% { top: 0; }
            100% { top: 100%; }
          }

          .data-stream {
            position: absolute;
            top: 30%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.4), transparent);
            animation: stream 6s ease-in-out infinite;
          }

          @keyframes stream {
            0%, 100% { transform: translateX(-100%); opacity: 0; }
            50% { transform: translateX(100%); opacity: 0.5; }
          }

          .corner-decoration {
            position: absolute;
            width: 100px;
            height: 100px;
            border: 2px solid rgba(0, 217, 255, 0.2);
          }

          .corner-decoration.top-left {
            top: 20px;
            left: 20px;
            border-right: none;
            border-bottom: none;
          }

          .corner-decoration.top-right {
            top: 20px;
            right: 20px;
            border-left: none;
            border-bottom: none;
          }

          .corner-decoration.bottom-left {
            bottom: 20px;
            left: 20px;
            border-right: none;
            border-top: none;
          }

          .corner-decoration.bottom-right {
            bottom: 20px;
            right: 20px;
            border-left: none;
            border-top: none;
          }

          .login-content {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 500px;
            padding: 40px;
          }

          .login-header {
            text-align: center;
            margin-bottom: 60px;
          }

          .logo-section {
            margin-bottom: 40px;
          }

          .logo-frame {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
          }

          .logo-icon {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border-radius: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            color: var(--dark-bg);
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 1;
          }

          .logo-ring {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 3px solid var(--primary-cyan);
            border-radius: 30px;
            animation: ring-pulse 3s ease-in-out infinite;
          }

          @keyframes ring-pulse {
            0%, 100% { 
              opacity: 0.3;
              transform: scale(1);
            }
            50% { 
              opacity: 0.6;
              transform: scale(1.05);
            }
          }

          .title-section {
            margin-bottom: 24px;
          }

          .main-title {
            color: var(--text-primary);
            font-family: 'Orbitron', sans-serif;
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 4px;
            text-transform: uppercase;
          }

          .subtitle-line {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 16px;
          }

          .line-decoration {
            width: 60px;
            height: 2px;
            background: var(--primary-cyan);
          }

          .subtitle {
            color: var(--primary-cyan);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            letter-spacing: 3px;
            text-transform: uppercase;
          }

          .system-info {
            display: flex;
            justify-content: center;
            gap: 40px;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(0, 217, 255, 0.05);
            border: 1px solid rgba(0, 217, 255, 0.2);
            border-radius: 20px;
          }

          .info-icon {
            color: var(--primary-cyan);
            font-size: 16px;
          }

          .info-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            letter-spacing: 1px;
          }

          .login-form-container {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 40px;
            position: relative;
            overflow: hidden;
          }

          .login-form-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-cyan), var(--primary-purple), var(--primary-cyan));
          }

          .login-form-container::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-purple), var(--primary-cyan), var(--primary-purple));
          }

          .form-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 40px;
          }

          .header-decoration {
            width: 40px;
            height: 2px;
            background: var(--primary-cyan);
          }

          .form-title {
            color: var(--text-primary);
            font-family: 'Orbitron', sans-serif;
            font-size: 20px;
            font-weight: 600;
            margin: 0;
            letter-spacing: 2px;
          }

          .login-form {
            margin-bottom: 32px;
          }

          .form-section {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .input-group {
            position: relative;
          }

          .input-label {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .label-icon {
            color: var(--primary-cyan);
            font-size: 18px;
          }

          .label-text {
            color: var(--text-secondary);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            letter-spacing: 1px;
          }

          .cyber-input {
            background: rgba(26, 31, 58, 0.8);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-family: 'Rajdhani', sans-serif;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .cyber-input:hover,
          .cyber-input:focus {
            border-color: var(--primary-cyan);
            box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
          }

          .cyber-input::placeholder {
            color: var(--text-secondary);
          }

          .ant-form-item {
            margin-bottom: 0;
          }

          .ant-form-item-explain-error {
            color: var(--error-red);
            font-family: 'Rajdhani', sans-serif;
            font-size: 12px;
            margin-top: 8px;
          }

          .login-button {
            background: linear-gradient(135deg, var(--primary-cyan), var(--primary-purple));
            border: none;
            color: var(--dark-bg);
            font-family: 'Orbitron', sans-serif;
            font-size: 16px;
            font-weight: 700;
            height: 56px;
            letter-spacing: 2px;
            border-radius: 16px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .login-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s ease;
          }

          .login-button:hover::before {
            left: 100%;
          }

          .login-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(0, 217, 255, 0.5);
          }

          .form-footer {
            text-align: center;
            padding-top: 24px;
          }

          .footer-line {
            width: 100%;
            height: 1px;
            background: var(--border-color);
            margin-bottom: 16px;
          }

          .footer-text {
            color: var(--text-secondary);
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            letter-spacing: 2px;
          }

          @media (max-width: 768px) {
            .login-content {
              padding: 20px;
            }

            .main-title {
              font-size: 24px;
            }

            .login-form-container {
              padding: 32px;
            }

            .system-info {
              flex-direction: column;
              gap: 16px;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Login