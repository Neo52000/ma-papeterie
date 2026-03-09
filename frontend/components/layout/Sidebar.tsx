'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Building2,
  FileText,
  Package,
  Wrench,
  Settings,
  Upload,
  BarChart3,
  Brain,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  advancedOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/taches', label: 'Tâches', icon: CheckSquare },
  { href: '/clients', label: 'Clients', icon: Building2 },
  { href: '/devis', label: 'Devis', icon: FileText },
  { href: '/catalogue', label: 'Catalogue', icon: Package },
  { href: '/sav', label: 'SAV', icon: Wrench },
  { href: '/imports', label: 'Imports', icon: Upload, advancedOnly: true },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, advancedOnly: true },
  { href: '/ai-logs', label: 'Logs IA', icon: Brain, advancedOnly: true },
  {
    href: '/settings/advanced',
    label: 'Paramètres avancés',
    icon: SlidersHorizontal,
    advancedOnly: true,
  },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { advancedMode, sidebarCollapsed, toggleSidebar } = useUIStore()

  const visibleItems = navItems.filter(
    (item) => !item.advancedOnly || advancedMode
  )

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-gray-200 bg-navy-950 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-navy-800">
        {!sidebarCollapsed && (
          <span className="text-white font-semibold text-sm truncate">
            ma-papeterie
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto rounded p-1 text-gray-400 hover:text-white hover:bg-navy-800 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-navy-700 text-white'
                      : 'text-gray-400 hover:bg-navy-800 hover:text-white',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
