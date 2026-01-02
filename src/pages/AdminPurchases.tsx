import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminPurchases() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
      const [ordersRes, suppliersRes] = await Promise.all([
        supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('is_active', true)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setPurchaseOrders(ordersRes.data || []);
      setSuppliers(suppliersRes.data || []);
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

      toast.success('Commande créée avec succès');
      fetchData();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande');
    }
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
      <div className="flex justify-end mb-6">
        <Button onClick={createPurchaseOrder}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle commande
        </Button>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="receptions">
            <TrendingUp className="h-4 w-4 mr-2" />
            Réceptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {purchaseOrders.map((order: any) => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle>{order.order_number}</CardTitle>
                <CardDescription>
                  {order.suppliers?.name || 'Fournisseur non défini'} • {order.status}
                </CardDescription>
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
          ))}
        </TabsContent>

        <TabsContent value="receptions">
          <Card>
            <CardHeader>
              <CardTitle>Réceptions de stock</CardTitle>
              <CardDescription>Enregistrez les réceptions de marchandises</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Fonctionnalité en cours de développement</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
