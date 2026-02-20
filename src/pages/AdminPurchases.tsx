import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StockReceptions } from '@/components/admin/StockReceptions';

export default function AdminPurchases() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) {
      fetchData();
    }
  }, [user, isAdmin, isSuperAdmin]);

  const fetchData = async () => {
    try {
      const ordersRes = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .order('created_at', { ascending: false });

      if (ordersRes.error) throw ordersRes.error;
      setPurchaseOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const createPurchaseOrder = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_purchase_order_number');
      if (error) throw error;

      const { error: insertError } = await supabase.from('purchase_orders').insert({
        order_number: data,
        created_by: user?.id,
        status: 'draft'
      });

      if (insertError) throw insertError;

      toast.success('Bon de commande créé avec succès');
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création du bon de commande');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      draft: { label: 'Brouillon', variant: 'outline' },
      sent: { label: 'Envoyée', variant: 'secondary' },
      confirmed: { label: 'Confirmée', variant: 'default' },
      partially_received: { label: 'Partiellement reçue', variant: 'secondary' },
      received: { label: 'Reçue', variant: 'default' },
      cancelled: { label: 'Annulée', variant: 'destructive' },
    };
    const cfg = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  if (!user || (!isAdmin && !isSuperAdmin)) {
    return null;
  }

  return (
    <AdminLayout title="Gestion des Achats" description="Commandes fournisseurs et réceptions de stock">
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Bons de commande
          </TabsTrigger>
          <TabsTrigger value="receptions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Réceptions de stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={createPurchaseOrder}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau bon de commande
            </Button>
          </div>

          {purchaseOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun bon de commande</p>
              </CardContent>
            </Card>
          ) : (
            (purchaseOrders as any[]).map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{order.order_number}</CardTitle>
                      <CardDescription>
                        {order.suppliers?.name || 'Fournisseur non défini'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status || 'draft')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total HT</p>
                      <p className="font-semibold">{order.total_ht || 0} €</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total TTC</p>
                      <p className="font-semibold">{order.total_ttc || 0} €</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Livraison prévue</p>
                      <p className="font-semibold">
                        {order.expected_delivery_date
                          ? new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')
                          : 'Non définie'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="receptions">
          <StockReceptions />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
