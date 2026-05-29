import { create } from 'zustand'
import type { UserShort } from '../types'

interface AuthState {
  token: string | null
  user: UserShort | null
  setToken: (token: string) => void
  setUser: (user: UserShort) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
  },
}))
