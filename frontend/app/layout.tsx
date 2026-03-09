'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Sidebar } from '@/components/layout/Sidebar'
import { useUIStore } from '@/store/uiStore'
import { isAuthenticated } from '@/lib/auth'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

const PUBLIC_PATHS = ['/login']

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { advancedMode, toggleMode } = useUIStore()

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (!isPublic && !isAuthenticated()) {
      router.replace('/login')
    }
  }, [pathname, isPublic, router])

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-navy-900">
            CRM ma-papeterie.fr
          </h1>
          <button
            onClick={toggleMode}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              advancedMode
                ? 'bg-navy-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {advancedMode ? 'Mode avancé' : 'Mode débutant'}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AppShell>{children}</AppShell>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  )
}
