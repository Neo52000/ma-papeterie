import { ShoppingCart, UserPlus, Package, Clock } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'il y a quelques secondes';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const STATUS_CONFIG: Record<string, { icon: typeof ShoppingCart; color: string; label: string }> = {
  pending: { icon: Clock, color: '#F59E0B', label: 'Nouvelle commande' },
  confirmed: { icon: ShoppingCart, color: '#3B82F6', label: 'Commande confirmée' },
  preparing: { icon: Package, color: '#8B5CF6', label: 'En préparation' },
  shipped: { icon: Package, color: '#10B981', label: 'Expédiée' },
  delivered: { icon: Package, color: '#10B981', label: 'Livrée' },
  cancelled: { icon: ShoppingCart, color: '#EF4444', label: 'Annulée' },
};

export function RecentActivityWidget() {
  const { orders, isLoading } = useOrders(true);

  const recentOrders = (orders ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div
      className="kpi-card-enter rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '500ms',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
      >
        Activité récente
      </h3>

      {isLoading ? (
        <div className="space-y-3 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Aucune activité récente</p>
        </div>
      ) : (
        <div className="space-y-1 flex-1 overflow-y-auto">
          {recentOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const Icon = config.icon;
            return (
              <div
                key={order.id}
                className="flex items-start gap-3 px-2 py-2.5 rounded-lg transition-colors hover:bg-white/5"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${config.color}15` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#F9FAFB' }}>
                    {config.label} #{order.order_number}
                  </p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: '#9CA3AF' }}>
                    {order.customer_email} &middot;{' '}
                    {order.total_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <span className="text-[10px] shrink-0 mt-0.5" style={{ color: '#6B7280' }}>
                  {timeAgo(order.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
