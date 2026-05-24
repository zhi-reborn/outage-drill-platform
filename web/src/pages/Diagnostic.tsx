import React, { useEffect, useState } from 'react'
import { Card, Descriptions, Button, Alert, Space } from 'antd'
import { drillService } from '../services/drill'
import { useAppStore } from '../store'

const DiagnosticPage: React.FC = () => {
  const { user, token } = useAppStore()
  const [apiStatus, setApiStatus] = useState<'success' | 'error' | 'testing'>('testing')
  const [templates, setTemplates] = useState<any[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    testAPI()
  }, [])

  const testAPI = async () => {
    setApiStatus('testing')
    setError('')
    
    try {
      const data = await drillService.getTemplates()
      setTemplates(data)
      setApiStatus('success')
    } catch (err: any) {
      setApiStatus('error')
      setError(err.response?.data?.error || err.message || 'API调用失败')
    }
  }

  const checkLocalStorage = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    return {
      hasToken: !!storedToken,
      tokenLength: storedToken?.length || 0,
      hasUser: !!storedUser,
      tokenPreview: storedToken ? storedToken.substring(0, 50) + '...' : '无',
    }
  }

  const storageInfo = checkLocalStorage()

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="系统诊断">
          <Descriptions bordered column={1}>
            <Descriptions.Item label="用户状态">
              {user ? `${user.name} (${user.role})` : '未登录'}
            </Descriptions.Item>
            <Descriptions.Item label="Token状态">
              {token ? '已获取' : '未获取'}
            </Descriptions.Item>
            <Descriptions.Item label="LocalStorage Token">
              {storageInfo.hasToken ? `存在 (${storageInfo.tokenLength}字符)` : '不存在'}
            </Descriptions.Item>
            <Descriptions.Item label="Token预览">
              {storageInfo.tokenPreview}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="API连接测试">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button onClick={testAPI} loading={apiStatus === 'testing'}>
              测试API连接
            </Button>
            
            {apiStatus === 'success' && (
              <Alert 
                message="API连接成功" 
                description={`成功获取 ${templates.length} 个模板`}
                type="success"
              />
            )}
            
            {apiStatus === 'error' && (
              <Alert 
                message="API连接失败" 
                description={error}
                type="error"
              />
            )}
            
            {templates.length > 0 && (
              <Card title="模板数据">
                <pre>{JSON.stringify(templates, null, 2)}</pre>
              </Card>
            )}
          </Space>
        </Card>

        <Card title="常见问题排查">
          <Space direction="vertical">
            <Alert 
              message="如果看不到模板数据，请检查：" 
              description={
                <div>
                  <p>1. 是否已登录？(用户状态应显示用户名)</p>
                  <p>2. Token是否存在？(LocalStorage应有token)</p>
                  <p>3. API是否正常？(点击测试按钮检查)</p>
                  <p>4. 浏览器控制台是否有错误？(按F12查看)</p>
                </div>
              }
              type="info"
            />
            
            <Alert 
              message="解决方案：" 
              description={
                <div>
                  <p>1. 如果未登录，请先登录</p>
                  <p>2. 如果Token不存在，请重新登录</p>
                  <p>3. 如果API失败，检查后端是否运行</p>
                  <p>4. 清除浏览器缓存并刷新(Ctrl+Shift+R)</p>
                </div>
              }
              type="warning"
            />
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default DiagnosticPage