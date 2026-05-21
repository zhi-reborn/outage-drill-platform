import { create } from 'zustand'
import { User, DrillInstance, StepExecution } from '../types'

interface AppState {
  user: User | null
  token: string | null
  currentDrill: DrillInstance | null
  myTasks: StepExecution[]
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setCurrentDrill: (drill: DrillInstance | null) => void
  setMyTasks: (tasks: StepExecution[]) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  currentDrill: null,
  myTasks: [],
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
    set({ token })
  },
  setCurrentDrill: (drill) => set({ currentDrill: drill }),
  setMyTasks: (tasks) => set({ myTasks: tasks }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, currentDrill: null, myTasks: [] })
  },
}))