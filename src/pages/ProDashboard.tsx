import { Link } from 'react-router-dom';
import { RefreshCw, Package, FileText, TrendingUp, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BudgetWidget } from '@/components/pro/BudgetWidget';
import { useB2BAccount } from '@/hooks/useB2BAccount';
import { useB2BBudget } from '@/hooks/useB2BBudget';
import { useOrders } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export default function ProDashboard() {
  const { account } = useB2BAccount();
  const { budget, remaining, percentUsed, isOverBudget, isNearAlert, isLoading: budgetLoading } = useB2BBudget(account?.id);
  const { orders, loading: ordersLoading } = useOrders();

  const recentOrders = orders.slice(0, 5);
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const ytdTotal = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commandes {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold">{ordersLoading ? '—' : orders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold">{ordersLoading ? '—' : activeOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total dépensé YTD</p>
              <p className="text-2xl font-bold">
                {ordersLoading ? '—' : ytdTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Budget annuel</h2>
        </div>
        <BudgetWidget
          budget={budget ?? null}
          remaining={remaining}
          percentUsed={percentUsed}
          isOverBudget={isOverBudget}
          isNearAlert={isNearAlert}
          isLoading={budgetLoading}
        />
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="gap-2">
            <Link to="/pro/reassort">
              <RefreshCw className="h-4 w-4" />
              Recommander (réassort)
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/pro/factures">
              <FileText className="h-4 w-4" />
              Mes factures
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/catalogue">
              <Package className="h-4 w-4" />
              Catalogue
            </Link>
          </Button>
        </div>
      </div>

      {/* Dernières commandes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Dernières commandes</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/pro/commandes">Voir tout</Link>
          </Button>
        </div>

        {ordersLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-muted rounded-lg" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Aucune commande pour l'instant.{' '}
              <Link to="/catalogue" className="text-primary underline">
                Parcourir le catalogue
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-card border border-border/50 rounded-lg px-4 py-3 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${STATUS_COLORS[order.status] || ''}`} variant="outline">
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                  <span className="font-semibold text-sm">
                    {order.total_amount?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
