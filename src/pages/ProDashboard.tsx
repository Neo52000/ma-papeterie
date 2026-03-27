import { Link } from 'react-router-dom';
import {
  RefreshCw, Package, FileText, TrendingUp, TrendingDown,
  ShoppingBag, ShoppingCart, Users, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BudgetWidget } from '@/components/pro/BudgetWidget';
import { DashboardAlerts } from '@/components/pro/DashboardAlerts';
import { SpendingChart } from '@/components/pro/SpendingChart';
import { OrderStatusChart } from '@/components/pro/OrderStatusChart';
import { TopProductsWidget } from '@/components/pro/TopProductsWidget';
import { useB2BAccount } from '@/hooks/useB2BAccount';
import { useB2BBudget } from '@/hooks/useB2BBudget';
import { useOrders } from '@/hooks/useOrders';
import { useB2BInvoices } from '@/hooks/useB2BInvoices';
import { useB2BTopProducts } from '@/hooks/useB2BReorderTemplates';
import { useB2BDashboardStats } from '@/hooks/useB2BDashboardStats';
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

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-purple-500',
  shipped: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const QUICK_ACTIONS = [
  { to: '/catalogue', label: 'Passer commande', icon: ShoppingCart },
  { to: '/pro/reassort', label: 'Réassort', icon: RefreshCw },
  { to: '/pro/factures', label: 'Mes factures', icon: FileText },
  { to: '/pro/equipe', label: 'Mon équipe', icon: Users },
  { to: '/pro/commandes', label: 'Mes commandes', icon: Package },
];

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function ProDashboard() {
  const { account } = useB2BAccount();
  const { budget, remaining, percentUsed, isOverBudget, isNearAlert, isLoading: budgetLoading } = useB2BBudget(account?.id);
  const { orders, loading: ordersLoading } = useOrders();
  const { data: invoices, isLoading: invoicesLoading } = useB2BInvoices(account?.id);
  const { data: topProducts, isLoading: topProductsLoading } = useB2BTopProducts(account?.id);

  const {
    monthlySpending,
    statusDistribution,
    unpaidInvoices,
    unpaidTotal,
    spendingTrend,
    activeOrders,
    pendingOrders,
    ytdTotal,
  } = useB2BDashboardStats(orders, invoices);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Alertes contextuelles */}
      {!ordersLoading && !invoicesLoading && (
        <DashboardAlerts
          unpaidInvoices={unpaidInvoices}
          unpaidTotal={unpaidTotal}
          isOverBudget={isOverBudget}
          isNearAlert={isNearAlert}
          percentUsed={percentUsed}
          pendingOrders={pendingOrders}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commandes {new Date().getFullYear()}</p>
              <p className="text-2xl font-bold">{ordersLoading ? '—' : orders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-orange-100">
              <Package className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold">{ordersLoading ? '—' : activeOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total dépensé YTD</p>
              <p className="text-2xl font-bold">
                {ordersLoading ? '—' : formatCurrency(ytdTotal)}
              </p>
              {!ordersLoading && spendingTrend !== null && spendingTrend !== 0 && (
                <p className={`text-xs flex items-center gap-0.5 mt-0.5 ${spendingTrend > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {spendingTrend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {spendingTrend > 0 ? '+' : ''}{spendingTrend}% vs mois préc.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md transition-all duration-200 ${unpaidInvoices.length > 0 ? 'border-red-200' : ''}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${unpaidInvoices.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <FileText className={`h-5 w-5 ${unpaidInvoices.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Factures impayées</p>
              <p className="text-2xl font-bold">
                {invoicesLoading ? '—' : unpaidInvoices.length}
              </p>
              {!invoicesLoading && unpaidInvoices.length > 0 && (
                <p className="text-xs text-red-600 mt-0.5">{formatCurrency(unpaidTotal)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget */}
      <BudgetWidget
        budget={budget ?? null}
        remaining={remaining}
        percentUsed={percentUsed}
        isOverBudget={isOverBudget}
        isNearAlert={isNearAlert}
        isLoading={budgetLoading}
      />

      {/* Graphiques : Dépenses + Répartition statuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SpendingChart data={monthlySpending} isLoading={ordersLoading} />
        </div>
        <div>
          <OrderStatusChart
            data={statusDistribution}
            total={orders.length}
            isLoading={ordersLoading}
          />
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Dernières commandes + Top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dernières commandes */}
        <Card>
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Dernières commandes</h3>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/pro/commandes">Voir tout</Link>
            </Button>
          </div>
          <CardContent className="pt-0">
            {ordersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-muted rounded-lg" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Aucune commande pour l'instant.{' '}
                <Link to="/catalogue" className="text-primary underline">
                  Parcourir le catalogue
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentOrders.map(order => (
                  <Link
                    key={order.id}
                    to="/pro/commandes"
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[order.status] || 'bg-gray-400'}`} />
                      <div>
                        <p className="font-medium text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'd MMM yyyy', { locale: fr })}
                          {order.order_items && order.order_items.length > 0 && (
                            <> · {order.order_items.length} article{order.order_items.length > 1 ? 's' : ''}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={`text-xs ${STATUS_COLORS[order.status] || ''}`} variant="outline">
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                      <span className="font-semibold text-sm tabular-nums">
                        {formatCurrency(order.total_amount || 0)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top produits */}
        <TopProductsWidget products={topProducts} isLoading={topProductsLoading} />
      </div>
    </div>
  );
}
