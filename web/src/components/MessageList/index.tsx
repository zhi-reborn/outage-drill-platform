import React, { useRef, useEffect, useMemo } from 'react'
import { Typography, Tag } from 'antd'
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  UserOutlined,
  RightOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { WebSocketMessage } from '../../types'

interface MessageListProps {
  messages: WebSocketMessage[]
  maxDisplay?: number
}

const MAX_DISPLAY = 50

const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  step_update: { color: '#00D9FF', icon: <SyncOutlined />, label: '步骤更新' },
  drill_update: { color: '#9333EA', icon: <InfoCircleOutlined />, label: '演练更新' },
  message: { color: '#10B981', icon: <CheckCircleOutlined />, label: '消息' },
  timeout_warning: { color: '#F59E0B', icon: <ExclamationCircleOutlined />, label: '超时预警' },
}

const statusColorMap: Record<string, string> = {
  pending: '#6B7280',
  in_progress: '#00D9FF',
  running: '#00D9FF',
  completed: '#10B981',
  failed: '#EF4444',
  timeout: '#F59E0B',
  paused: '#F59E0B',
}

const MessageList: React.FC<MessageListProps> = ({ messages, maxDisplay = MAX_DISPLAY }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  const displayMessages = useMemo(() => {
    return messages.slice(-maxDisplay)
  }, [messages, maxDisplay])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !isAutoScrollRef.current) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    })
  }, [displayMessages])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getMessageContent = (message: WebSocketMessage) => {
    if (message.data?.content) return message.data.content

    const { data } = message
    if (!data) return '系统消息'

    if (data.step_name) {
      const status = data.status || 'unknown'
      const statusText: Record<string, string> = {
        pending: '等待执行',
        in_progress: '开始执行',
        completed: '执行完成',
        timeout: '执行超时',
        failed: '执行失败',
      }
      return `[${data.step_name}] ${statusText[status] || status}`
    }

    if (data.status) {
      const statusText: Record<string, string> = {
        pending: '待命',
        running: '运行中',
        paused: '已暂停',
        completed: '已完成',
        cancelled: '已取消',
      }
      return `演练状态变更: ${statusText[data.status] || data.status}`
    }

    return '流程节点变化'
  }

  const getStatusTag = (message: WebSocketMessage) => {
    const status = message.data?.status
    if (!status || !statusColorMap[status]) return null
    const statusText: Record<string, string> = {
      pending: '待命',
      in_progress: '进行中',
      running: '运行中',
      completed: '完成',
      failed: '失败',
      timeout: '超时',
      paused: '暂停',
    }
    return (
      <Tag
        style={{
          background: `${statusColorMap[status]}20`,
          border: `1px solid ${statusColorMap[status]}`,
          color: statusColorMap[status],
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          borderRadius: 4,
          marginLeft: 8,
          marginRight: 0,
          padding: '0 6px',
          lineHeight: '20px',
        }}
      >
        {statusText[status] || status}
      </Tag>
    )
  }

  if (messages.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>
          <ClockCircleOutlined style={{ fontSize: 32, color: '#00D9FF', opacity: 0.6 }} />
        </div>
        <Typography.Text style={styles.emptyText}>
          等待流程节点变化...
        </Typography.Text>
        <Typography.Text style={styles.emptySubText}>
          演练执行过程中的状态变更将实时显示在此处
        </Typography.Text>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div ref={containerRef} style={styles.container}>
        {displayMessages.map((message, index) => {
          const config = typeConfig[message.type] || typeConfig.message
          return (
            <div
              key={`${message.timestamp}-${index}`}
              style={{
                ...styles.messageItem,
                borderLeft: `3px solid ${config.color}`,
                animation: index === displayMessages.length - 1 ? 'fadeIn 0.3s ease' : undefined,
              }}
            >
              <div style={styles.messageHeader}>
                <span style={{ ...styles.typeIcon, color: config.color }}>
                  {config.icon}
                </span>
                <span style={{ ...styles.typeLabel, color: config.color }}>
                  {config.label}
                </span>
                <span style={styles.timestamp}>
                  {formatTime(message.timestamp)}
                </span>
                {getStatusTag(message)}
              </div>
              {(message.data?.phase_name || message.data?.stage_name) && (
                <div style={styles.breadcrumbRow}>
                  <ApartmentOutlined style={styles.breadcrumbIcon} />
                  {message.data.phase_name && (
                    <>
                      <span style={styles.breadcrumbItem}>{message.data.phase_name}</span>
                      {message.data.stage_name && <RightOutlined style={styles.breadcrumbSep} />}
                    </>
                  )}
                  {message.data.stage_name && (
                    <span style={styles.breadcrumbItem}>{message.data.stage_name}</span>
                  )}
                  {message.data.task_name && (
                    <>
                      <RightOutlined style={styles.breadcrumbSep} />
                      <span style={{ ...styles.breadcrumbItem, ...styles.breadcrumbLeaf }}>{message.data.task_name}</span>
                    </>
                  )}
                </div>
              )}
              <div style={styles.messageBody}>
                {getMessageContent(message)}
              </div>
              {message.data?.assignee_name && (
                <div style={styles.assigneeRow}>
                  <UserOutlined style={styles.assigneeIcon} />
                  <span style={styles.assigneeName}>{message.data.assignee_name}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {messages.length > maxDisplay && (
        <div style={styles.truncated}>
          仅显示最近 {maxDisplay} 条，共 {messages.length} 条消息
        </div>
      )}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
  },
  container: {
    height: 300,
    overflowY: 'auto',
    border: '1px solid #2D3748',
    borderRadius: 8,
    padding: '8px 12px',
    background: 'rgba(10, 14, 39, 0.6)',
  },
  messageItem: {
    padding: '8px 12px',
    marginBottom: 6,
    background: 'rgba(26, 31, 58, 0.5)',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeIcon: {
    fontSize: 13,
  },
  typeLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
  },
  timestamp: {
    marginLeft: 'auto',
    color: '#6B7280',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
  },
  breadcrumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 20,
    marginBottom: 4,
  },
  breadcrumbIcon: {
    fontSize: 11,
    color: '#6B7280',
  },
  breadcrumbItem: {
    color: '#9CA3AF',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 12,
    padding: '1px 6px',
    background: 'rgba(0, 217, 255, 0.06)',
    borderRadius: 3,
    border: '1px solid rgba(0, 217, 255, 0.15)',
  },
  breadcrumbLeaf: {
    color: '#00D9FF',
    background: 'rgba(0, 217, 255, 0.1)',
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  breadcrumbSep: {
    fontSize: 9,
    color: '#4B5563',
  },
  messageBody: {
    color: '#E5E7EB',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 14,
    paddingLeft: 20,
    lineHeight: '22px',
  },
  assigneeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 20,
    marginTop: 4,
  },
  assigneeIcon: {
    fontSize: 11,
    color: '#6B7280',
  },
  assigneeName: {
    color: '#9CA3AF',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 12,
  },
  truncated: {
    textAlign: 'center',
    color: '#6B7280',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    padding: '6px 0 0',
  },
  emptyContainer: {
    height: 300,
    border: '1px solid #2D3748',
    borderRadius: 8,
    background: 'rgba(10, 14, 39, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(0, 217, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9CA3AF',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 16,
  },
  emptySubText: {
    color: '#6B7280',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 13,
  },
}

export default MessageList
