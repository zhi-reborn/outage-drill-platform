import React from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

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
      message.success('登录成功')
      navigate('/dashboard')
    }
  }

  React.useEffect(() => {
    if (error) {
      message.error(error)
    }
  }, [error])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#f0f2f5'
    }}>
      <Card title="断网断电演练平台" style={{ width: 400 }}>
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login