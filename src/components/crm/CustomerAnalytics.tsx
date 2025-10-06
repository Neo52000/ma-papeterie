import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';

interface CustomerStats {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCustomers: Array<{
    email: string;
    orderCount: number;
    totalSpent: number;
  }>;
}

export const CustomerAnalytics = () => {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email, total_amount, status');

      if (error) throw error;

      // Calculate stats
      const uniqueCustomers = new Set(orders?.map(o => o.customer_email)).size;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top customers
      const customerMap = new Map<string, { orderCount: number; totalSpent: number }>();
      orders?.forEach(order => {
        const existing = customerMap.get(order.customer_email) || { orderCount: 0, totalSpent: 0 };
        customerMap.set(order.customer_email, {
          orderCount: existing.orderCount + 1,
          totalSpent: existing.totalSpent + Number(order.total_amount),
        });
      });

      const topCustomers = Array.from(customerMap.entries())
        .map(([email, data]) => ({ email, ...data }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setStats({
        totalCustomers: uniqueCustomers,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        topCustomers,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Chargement des analytics...</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Clients uniques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes passées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Revenue total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageOrderValue.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Valeur moyenne</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Clients</CardTitle>
          <CardDescription>Classés par montant dépensé</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topCustomers.map((customer, index) => (
              <div key={customer.email} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{customer.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.orderCount} commande{customer.orderCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{customer.totalSpent.toFixed(2)} €</p>
                  <p className="text-sm text-muted-foreground">
                    Moy: {(customer.totalSpent / customer.orderCount).toFixed(2)} €
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
