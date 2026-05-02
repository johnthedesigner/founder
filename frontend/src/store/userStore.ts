import { create } from 'zustand'
import { getMe } from '../api/auth'

interface UserStore {
  user: { id: string; email: string; displayName: string } | null
  isLoading: boolean
  fetchUser: () => Promise<void>
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  isLoading: false,
  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const { user } = await getMe()
      set({ user, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },
}))
