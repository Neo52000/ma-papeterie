import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, TrendingDown, Loader2 } from 'lucide-react';
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
  tvaRate?: number;
}

export const ProductPricing = ({ productId, basePrice, tvaRate = 20 }: ProductPricingProps) => {
  const [pricings, setPricings] = useState<VolumePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    min_quantity: '',
    max_quantity: '',
    price_ht: '',
    price_ttc: '',
    discount_percent: '',
  });
  const [_lastEdited, setLastEdited] = useState<string | null>(null);

  const fetchPricings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_volume_pricing')
        .select('*')
        .eq('product_id', productId)
        .order('min_quantity');

      if (error) throw error;
      setPricings(data || []);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchPricings();
  }, [fetchPricings]);

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const basePriceHT = round2(basePrice / (1 + tvaRate / 100));

  const updateFromHT = useCallback((htStr: string) => {
    const ht = parseFloat(htStr);
    if (!isNaN(ht)) {
      const ttc = round2(ht * (1 + tvaRate / 100));
      const discount = round2(((basePriceHT - ht) / basePriceHT) * 100);
      setFormData(prev => ({
        ...prev,
        price_ht: htStr,
        price_ttc: ttc.toFixed(2),
        discount_percent: discount > 0 ? discount.toFixed(1) : '',
      }));
    } else {
      setFormData(prev => ({ ...prev, price_ht: htStr }));
    }
  }, [tvaRate, basePriceHT]);

  const updateFromTTC = useCallback((ttcStr: string) => {
    const ttc = parseFloat(ttcStr);
    if (!isNaN(ttc)) {
      const ht = round2(ttc / (1 + tvaRate / 100));
      const discount = round2(((basePrice - ttc) / basePrice) * 100);
      setFormData(prev => ({
        ...prev,
        price_ttc: ttcStr,
        price_ht: ht.toFixed(2),
        discount_percent: discount > 0 ? discount.toFixed(1) : '',
      }));
    } else {
      setFormData(prev => ({ ...prev, price_ttc: ttcStr }));
    }
  }, [tvaRate, basePrice]);

  const updateFromDiscount = useCallback((discStr: string) => {
    const disc = parseFloat(discStr);
    if (!isNaN(disc) && disc >= 0 && disc < 100) {
      const ht = round2(basePriceHT * (1 - disc / 100));
      const ttc = round2(ht * (1 + tvaRate / 100));
      setFormData(prev => ({
        ...prev,
        discount_percent: discStr,
        price_ht: ht.toFixed(2),
        price_ttc: ttc.toFixed(2),
      }));
    } else {
      setFormData(prev => ({ ...prev, discount_percent: discStr }));
    }
  }, [tvaRate, basePriceHT]);

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'price_ht') {
      setLastEdited('ht');
      updateFromHT(value);
    } else if (field === 'price_ttc') {
      setLastEdited('ttc');
      updateFromTTC(value);
    } else if (field === 'discount_percent') {
      setLastEdited('discount');
      updateFromDiscount(value);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const minQty = parseInt(formData.min_quantity);
      const priceHT = parseFloat(formData.price_ht);
      const priceTTC = parseFloat(formData.price_ttc);

      if (minQty < 1) {
        toast.error('La quantité minimum doit être au moins 1');
        return;
      }
      if (priceHT <= 0 || priceTTC <= 0) {
        toast.error('Les prix doivent être positifs');
        return;
      }

      const data = {
        product_id: productId,
        min_quantity: minQty,
        max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
        price_ht: priceHT,
        price_ttc: priceTTC,
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
      setLastEdited(null);
      fetchPricings();
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || 'Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
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
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Tarification dégressive
          <Badge variant="secondary" className="text-xs">TVA {tvaRate}%</Badge>
        </CardTitle>
        <CardDescription>
          Configurez des prix dégressifs selon les quantités (photocopies, services, etc.).
          Les champs HT, TTC et remise se calculent automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          Prix de base : <span className="font-medium">{basePriceHT.toFixed(2)} € HT</span> / <span className="font-medium">{basePrice.toFixed(2)} € TTC</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="vp_min_quantity">Qté min *</Label>
              <Input
                id="vp_min_quantity"
                type="number"
                min="1"
                value={formData.min_quantity}
                onChange={(e) => handleFieldChange('min_quantity', e.target.value)}
                placeholder="ex: 10"
                required
              />
            </div>
            <div>
              <Label htmlFor="vp_max_quantity">Qté max</Label>
              <Input
                id="vp_max_quantity"
                type="number"
                min="1"
                value={formData.max_quantity}
                onChange={(e) => handleFieldChange('max_quantity', e.target.value)}
                placeholder="Illimité"
              />
            </div>
            <div>
              <Label htmlFor="vp_price_ht">Prix HT (€) *</Label>
              <Input
                id="vp_price_ht"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price_ht}
                onChange={(e) => handleFieldChange('price_ht', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="vp_price_ttc">Prix TTC (€) *</Label>
              <Input
                id="vp_price_ttc"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price_ttc}
                onChange={(e) => handleFieldChange('price_ttc', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="vp_discount_percent">Remise (%)</Label>
              <Input
                id="vp_discount_percent"
                type="number"
                step="0.1"
                min="0"
                max="99.9"
                value={formData.discount_percent}
                onChange={(e) => handleFieldChange('discount_percent', e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Ajouter un palier
          </Button>
        </form>

        {pricings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quantité</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>Prix TTC</TableHead>
                <TableHead>Remise</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricings.map((pricing) => (
                <TableRow key={pricing.id}>
                  <TableCell>
                    {pricing.min_quantity}{pricing.max_quantity ? ` – ${pricing.max_quantity}` : '+'}
                  </TableCell>
                  <TableCell>{pricing.price_ht.toFixed(2)} €</TableCell>
                  <TableCell className="font-medium">{pricing.price_ttc.toFixed(2)} €</TableCell>
                  <TableCell>
                    {pricing.discount_percent
                      ? <Badge variant="secondary">-{pricing.discount_percent}%</Badge>
                      : '-'}
                  </TableCell>
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
            Aucun tarif dégressif configuré.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
