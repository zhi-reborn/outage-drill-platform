export const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0秒'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

export const getStatusText = (status: string): string => {
  const statusMap = {
    pending: '待开始',
    running: '进行中',
    paused: '已暂停',
    completed: '已完成',
    cancelled: '已取消',
    in_progress: '进行中',
    timeout: '超时',
  }
  return statusMap[status as keyof typeof statusMap] || status
}

export const getStatusColor = (status: string): string => {
  const colorMap = {
    pending: '#d9d9d9',
    running: '#1890ff',
    paused: '#faad14',
    completed: '#52c41a',
    cancelled: '#f5222d',
    in_progress: '#1890ff',
    timeout: '#f5222d',
  }
  return colorMap[status as keyof typeof colorMap] || '#d9d9d9'
}

export const getRoleText = (role: string): string => {
  const roleMap = {
    admin: '管理员',
    commander: '指挥员',
    participant: '参演人员',
  }
  return roleMap[role as keyof typeof roleMap] || role
}