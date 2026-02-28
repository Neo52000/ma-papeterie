import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package, ShoppingCart, BarChart3, TrendingUp, AlertTriangle,
  ArrowRight, ArrowUpRight, ArrowDownRight, Clock, Truck, Users,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { products } = useProducts();

  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const lowStockProducts = products?.filter(p => (p.stock_quantity || 0) < 10).length || 0;
  const totalProducts = products?.length || 0;
  const activeProducts = totalProducts;

  const stats = [
    {
      title: "Produits actifs",
      value: activeProducts,
      subtitle: `${totalProducts} total`,
      icon: Package,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      trend: totalProducts > 0 ? `${Math.round((activeProducts / totalProducts) * 100)}% actifs` : undefined,
      trendUp: true,
    },
    {
      title: "Commandes en attente",
      value: pendingOrders,
      subtitle: `${orders?.length || 0} total`,
      icon: ShoppingCart,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary-dark",
      trend: pendingOrders > 0 ? "À traiter" : "Tout est à jour",
      trendUp: pendingOrders === 0,
    },
    {
      title: "Chiffre d'affaires",
      value: `${totalRevenue.toFixed(0)} €`,
      subtitle: "Toutes commandes",
      icon: BarChart3,
      iconBg: "bg-accent/10",
      iconColor: "text-accent-dark",
      trend: orders && orders.length > 0 ? `Panier moy. ${(totalRevenue / orders.length).toFixed(0)} €` : undefined,
      trendUp: true,
    },
    {
      title: "Alertes stock",
      value: lowStockProducts,
      subtitle: "Produits < 10 unités",
      icon: AlertTriangle,
      iconBg: lowStockProducts > 0 ? "bg-destructive/10" : "bg-accent/10",
      iconColor: lowStockProducts > 0 ? "text-destructive" : "text-accent-dark",
      trend: lowStockProducts > 0 ? "Action requise" : "Stocks OK",
      trendUp: lowStockProducts === 0,
    },
  ];

  const quickActions = [
    { label: "Commandes", path: "/admin/orders", icon: ShoppingCart, desc: "Gérer les commandes" },
    { label: "Produits", path: "/admin/products", icon: Package, desc: "Gérer le catalogue" },
    { label: "Alertes", path: "/admin/alerts", icon: AlertTriangle, desc: "Voir les alertes" },
    { label: "Fournisseurs", path: "/admin/suppliers", icon: Truck, desc: "Gérer les achats" },
    { label: "Intelligence", path: "/admin/sales-predictions", icon: TrendingUp, desc: "Analyses IA" },
    { label: "CRM", path: "/admin/crm", icon: Users, desc: "Gestion clients" },
  ];

  return (
    <AdminLayout title="Tableau de bord" description="Vue d'ensemble de votre activité">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-5 hover:shadow-md transition-all duration-200 border-border/50">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              {stat.trend && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  stat.trendUp ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                }`}>
                  {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.trend}
                </div>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.subtitle}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 group"
            >
              <div className="p-2 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
              <span className="text-xs text-muted-foreground">{action.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Dernières commandes
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')} className="text-primary text-xs gap-1">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-4">
            {orders && orders.length > 0 ? (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-500' :
                        order.status === 'pending' ? 'bg-yellow-500' :
                        order.status === 'preparing' ? 'bg-blue-500' :
                        'bg-muted-foreground'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{Number(order.total_amount).toFixed(2)} €</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-500/10 text-green-600' :
                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                        order.status === 'preparing' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {order.status === 'pending' ? 'En attente' : 
                         order.status === 'delivered' ? 'Livrée' : 
                         order.status === 'preparing' ? 'Préparation' : order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Aucune commande récente</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Produits en stock faible
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/stock-virtuel')} className="text-primary text-xs gap-1">
              Stock virtuel <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-4">
            {products && lowStockProducts > 0 ? (
              <div className="space-y-2">
                {products
                  .filter(p => (p.stock_quantity || 0) < 10)
                  .slice(0, 5)
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name || "Produit"} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                        (product.stock_quantity || 0) === 0 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {product.stock_quantity || 0}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Tous les stocks sont suffisants</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
