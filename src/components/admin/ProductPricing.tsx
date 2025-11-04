import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface VolumePricing {
  id: string;
  product_id: string;
  min_quantity: number;
  max_quantity: number | null;
  price_ht: number;
  price_ttc: number;
  discount_percent: number | null;
}

interface ProductPricingProps {
  productId: string;
  basePrice: number;
}

export const ProductPricing = ({ productId, basePrice }: ProductPricingProps) => {
  const [pricings, setPricings] = useState<VolumePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    min_quantity: '',
    max_quantity: '',
    price_ht: '',
    price_ttc: '',
    discount_percent: '',
  });

  useEffect(() => {
    fetchPricings();
  }, [productId]);

  const fetchPricings = async () => {
    try {
      const { data, error } = await supabase
        .from('product_volume_pricing')
        .select('*')
        .eq('product_id', productId)
        .order('min_quantity');

      if (error) throw error;
      setPricings(data || []);
    } catch (error) {
      console.error('Error fetching pricings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        product_id: productId,
        min_quantity: parseInt(formData.min_quantity),
        max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
        price_ht: parseFloat(formData.price_ht),
        price_ttc: parseFloat(formData.price_ttc),
        discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
      };

      const { error } = await supabase
        .from('product_volume_pricing')
        .insert([data]);

      if (error) throw error;

      toast.success('Tarif dégressif ajouté');
      setFormData({
        min_quantity: '',
        max_quantity: '',
        price_ht: '',
        price_ttc: '',
        discount_percent: '',
      });
      fetchPricings();
    } catch (error: any) {
      console.error('Error adding pricing:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_volume_pricing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tarif supprimé');
      fetchPricings();
    } catch (error) {
      console.error('Error deleting pricing:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Tarification dégressive
        </CardTitle>
        <CardDescription>
          Configurez des prix dégressifs selon les quantités commandées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="min_quantity">Qté min *</Label>
              <Input
                id="min_quantity"
                type="number"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="max_quantity">Qté max</Label>
              <Input
                id="max_quantity"
                type="number"
                value={formData.max_quantity}
                onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                placeholder="Illimité"
              />
            </div>
            <div>
              <Label htmlFor="price_ht">Prix HT (€) *</Label>
              <Input
                id="price_ht"
                type="number"
                step="0.01"
                value={formData.price_ht}
                onChange={(e) => setFormData({ ...formData, price_ht: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="price_ttc">Prix TTC (€) *</Label>
              <Input
                id="price_ttc"
                type="number"
                step="0.01"
                value={formData.price_ttc}
                onChange={(e) => setFormData({ ...formData, price_ttc: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="discount_percent">Remise (%)</Label>
              <Input
                id="discount_percent"
                type="number"
                step="0.1"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un palier
          </Button>
        </form>

        {pricings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quantité min</TableHead>
                <TableHead>Quantité max</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>Prix TTC</TableHead>
                <TableHead>Remise</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricings.map((pricing) => (
                <TableRow key={pricing.id}>
                  <TableCell>{pricing.min_quantity}</TableCell>
                  <TableCell>{pricing.max_quantity || 'Illimité'}</TableCell>
                  <TableCell>{pricing.price_ht.toFixed(2)} €</TableCell>
                  <TableCell>{pricing.price_ttc.toFixed(2)} €</TableCell>
                  <TableCell>{pricing.discount_percent ? `${pricing.discount_percent}%` : '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pricing.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {pricings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun tarif dégressif configuré. Le prix de base est {basePrice.toFixed(2)} €
          </p>
        )}
      </CardContent>
    </Card>
  );
};
