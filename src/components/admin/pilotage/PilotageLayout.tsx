import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Store,
  Target,
  MessageCircle,
  BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePilotageStore } from '@/stores/pilotageStore';
import { useActiveAlerts } from '@/hooks/usePilotageAlerts';
import type { PilotageChannel } from '@/types/pilotage';
import { DATA_NOIR } from './_shared/colors';
import { channelLabel } from './_shared/formatters';

const navItems = [
  { path: '/admin/pilotage/overview',      label: 'Vue d\'ensemble',  icon: LayoutDashboard },
  { path: '/admin/pilotage/ca-marge',      label: 'CA & Marge',        icon: TrendingUp },
  { path: '/admin/pilotage/tresorerie',    label: 'Trésorerie',        icon: Wallet },
  { path: '/admin/pilotage/boutique-pos',  label: 'Boutique physique', icon: Store },
  { path: '/admin/pilotage/objectifs',     label: 'Objectifs',         icon: Target },
  { path: '/admin/pilotage/coach',         label: 'Coach IA',          icon: MessageCircle },
  { path: '/admin/pilotage/alertes',       label: 'Alertes',           icon: BellRing },
];

const channels: PilotageChannel[] = ['all', 'web_b2c', 'web_b2b', 'pos'];

export function PilotageLayout() {
  const channel = usePilotageStore(s => s.channel);
  const setChannel = usePilotageStore(s => s.setChannel);
  const { data: activeAlerts } = useActiveAlerts();
  const alertsCount = activeAlerts?.length ?? 0;

  return (
    <div className={cn('min-h-screen flex', DATA_NOIR.bg)}>
      {/* Sidebar */}
      <aside className={cn('w-60 border-r', DATA_NOIR.bgBorder, 'p-4')}>
        <div className="mb-6">
          <h1 className={cn('text-lg font-semibold', DATA_NOIR.textPrimary)}>Pilotage</h1>
          <p className={cn('text-xs mt-0.5', DATA_NOIR.textMuted)}>
            ma-papeterie.fr
          </p>
        </div>

        {/* Sélecteur de canal */}
        <div className="mb-6">
          <label className={cn('text-xs uppercase tracking-wider mb-2 block', DATA_NOIR.textMuted)}>
            Canal
          </label>
          <div className="flex flex-col gap-1">
            {channels.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  'text-left text-sm px-3 py-1.5 rounded-md transition-colors',
                  channel === c
                    ? 'bg-zinc-800 text-zinc-100 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                )}
              >
                {channelLabel(c)}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isAlertes = item.path.endsWith('/alertes');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 text-sm px-3 py-2 rounded-md transition-colors',
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {isAlertes && alertsCount > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
                      DATA_NOIR.criticalBg,
                      DATA_NOIR.critical
                    )}
                  >
                    {alertsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
