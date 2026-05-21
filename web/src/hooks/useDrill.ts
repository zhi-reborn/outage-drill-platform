import { useState, useEffect } from 'react'
import { drillService } from '../services/drill'
import { useAppStore } from '../store'

export const useDrill = (drillId?: number) => {
  const { setCurrentDrill, setMyTasks } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDrill = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const drill = await drillService.getDrill(id)
      setCurrentDrill(drill)
      return drill
    } catch (err: any) {
      setError(err.response?.data?.error || '获取演练信息失败')
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchMyTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const tasks = await drillService.getMyTasks()
      setMyTasks(tasks)
      return tasks
    } catch (err: any) {
      setError(err.response?.data?.error || '获取任务列表失败')
      return []
    } finally {
      setLoading(false)
    }
  }

  const startExecution = async (executionId: number) => {
    try {
      await drillService.startExecution(executionId)
      await fetchMyTasks()
    } catch (err: any) {
      setError(err.response?.data?.error || '开始执行失败')
    }
  }

  const completeExecution = async (executionId: number) => {
    try {
      await drillService.completeExecution(executionId)
      await fetchMyTasks()
    } catch (err: any) {
      setError(err.response?.data?.error || '完成执行失败')
    }
  }

  useEffect(() => {
    if (drillId) {
      fetchDrill(drillId)
    }
  }, [drillId])

  return {
    loading,
    error,
    fetchDrill,
    fetchMyTasks,
    startExecution,
    completeExecution,
  }
}