import React from 'react'
import { List, Typography } from 'antd'
import { WebSocketMessage } from '../../types'

interface MessageListProps {
  messages: WebSocketMessage[]
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <List
      style={{
        height: 300,
        overflow: 'auto',
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        padding: 16,
      }}
      dataSource={messages}
      renderItem={(message) => (
        <List.Item>
          <Typography.Text>
            {message.timestamp && (
              <span style={{ color: '#999', marginRight: 8 }}>
                [{new Date(message.timestamp).toLocaleTimeString()}]
              </span>
            )}
            {message.data?.content || '消息内容'}
          </Typography.Text>
        </List.Item>
      )}
    />
  )
}

export default MessageList