import { Database, ShoppingBag, Globe, Server } from 'lucide-react';

interface SystemStatusWidgetProps {
  shopifySyncErrors: number;
}

interface ServiceStatus {
  name: string;
  icon: typeof Database;
  status: 'operational' | 'degraded' | 'down';
  detail: string;
}

const STATUS_COLORS = {
  operational: '#10B981',
  degraded: '#F59E0B',
  down: '#EF4444',
};

const STATUS_LABELS = {
  operational: 'Opérationnel',
  degraded: 'Dégradé',
  down: 'Hors service',
};

export function SystemStatusWidget({ shopifySyncErrors }: SystemStatusWidgetProps) {
  const services: ServiceStatus[] = [
    {
      name: 'Supabase',
      icon: Database,
      status: 'operational',
      detail: 'Base de données & Auth',
    },
    {
      name: 'Shopify Sync',
      icon: ShoppingBag,
      status: shopifySyncErrors > 0 ? (shopifySyncErrors > 5 ? 'down' : 'degraded') : 'operational',
      detail: shopifySyncErrors > 0 ? `${shopifySyncErrors} erreur(s)` : 'Synchronisé',
    },
    {
      name: 'Netlify CDN',
      icon: Globe,
      status: 'operational',
      detail: 'Déploiement actif',
    },
    {
      name: 'Edge Functions',
      icon: Server,
      status: 'operational',
      detail: '40+ fonctions',
    },
  ];

  const allOperational = services.every((s) => s.status === 'operational');

  return (
    <div
      className="kpi-card-enter rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '550ms',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
        >
          Statut système
        </h3>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: allOperational ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: allOperational ? '#10B981' : '#F59E0B',
          }}
        >
          {allOperational ? 'Tout OK' : 'Attention'}
        </span>
      </div>

      <div className="space-y-3 flex-1">
        {services.map((service) => {
          const Icon = service.icon;
          const color = STATUS_COLORS[service.status];
          return (
            <div key={service.name} className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}15` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: '#F9FAFB' }}>
                  {service.name}
                </p>
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {service.detail}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                />
                <span className="text-[10px]" style={{ color }}>
                  {STATUS_LABELS[service.status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
