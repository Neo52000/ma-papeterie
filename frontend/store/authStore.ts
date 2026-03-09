import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken, removeToken, decodeToken } from '@/lib/auth'

interface AuthUser {
  id: string
  email: string
  name?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token: string) => {
        setToken(token)
        const payload = decodeToken()
        const user: AuthUser = {
          id: (payload?.sub as string) ?? '',
          email: (payload?.email as string) ?? '',
          name: (payload?.name as string) ?? undefined,
        }
        set({ token, user })
      },
      logout: () => {
        removeToken()
        set({ token: null, user: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
