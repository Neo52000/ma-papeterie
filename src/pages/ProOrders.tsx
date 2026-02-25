import { useState } from 'react';
import { Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { OrderDetailModal } from '@/components/order/OrderDetailModal';
import { useOrders } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Order } from '@/hooks/useOrders';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  all: 'Tous les statuts',
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export default function ProOrders() {
  const { orders, loading } = useOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = orders.filter(o => {
    const matchesSearch =
      !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Commandes</h2>
        <span className="text-sm text-muted-foreground">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° ou email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Package className="h-10 w-10" />
            <p>Aucune commande trouvée</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div>
                  <p className="font-semibold text-sm">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), 'd MMM yyyy', { locale: fr })}
                    {order.order_items && ` · ${order.order_items.length} article${order.order_items.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${STATUS_COLORS[order.status] || ''}`} variant="outline">
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                  <span className="font-bold text-sm">
                    {order.total_amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm">
              Total affiché :{' '}
              <span className="font-bold">
                {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
        </>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
