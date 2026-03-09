import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  advancedMode: boolean
  sidebarCollapsed: boolean
  toggleMode: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      advancedMode: false,
      sidebarCollapsed: false,
      toggleMode: () => set((state) => ({ advancedMode: !state.advancedMode })),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'ui-storage',
    }
  )
)
