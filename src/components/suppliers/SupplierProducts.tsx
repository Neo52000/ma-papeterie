import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit, ExternalLink, Package, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_reference: string | null;
  supplier_price: number;
  stock_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  notes: string | null;
  products?: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface SupplierOffer {
  id: string;
  supplier: string;
  supplier_product_id: string | null;
  product_id: string | null;
  purchase_price_ht: number | null;
  pvp_ttc: number | null;
  stock_qty: number | null;
  is_active: boolean;
  last_seen_at: string | null;
  products?: {
    id: string;
    name: string;
    sku_interne: string | null;
  } | null;
}

function getSupplierEnum(name: string): 'ALKOR' | 'COMLANDI' | 'SOFT' | null {
  const n = name.toUpperCase();
  if (n.includes('ALKOR') || n.includes('BUROLIKE')) return 'ALKOR';
  if (n.includes('COMLANDI') || n.includes('CS GROUP') || n.includes('LIDERPAPEL')) return 'COMLANDI';
  if (n.includes('SOFT')) return 'SOFT';
  return null;
}

const supplierBadgeColor: Record<string, string> = {
  ALKOR: 'bg-blue-100 text-blue-800',
  COMLANDI: 'bg-purple-100 text-purple-800',
  SOFT: 'bg-orange-100 text-orange-800',
};

interface SupplierProductsProps {
  supplierId: string;
  supplierName?: string;
}

export const SupplierProducts = ({ supplierId, supplierName = '' }: SupplierProductsProps) => {
  const navigate = useNavigate();
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [supplierOffers, setSupplierOffers] = useState<SupplierOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  
  const supplierEnum = getSupplierEnum(supplierName);

  const [formData, setFormData] = useState({
    product_id: '',
    supplier_reference: '',
    supplier_price: '',
    stock_quantity: '',
    lead_time_days: '',
    is_preferred: false,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [supplierId, supplierName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [spResult, pResult] = await Promise.all([
        supabase
          .from('supplier_products')
          .select('*, products(id, name, image_url)')
          .eq('supplier_id', supplierId),
        supabase
          .from('products')
          .select('id, name, price, image_url')
          .order('name'),
      ]);

      if (spResult.error) throw spResult.error;
      if (pResult.error) throw pResult.error;
      setSupplierProducts(spResult.data || []);
      setProducts(pResult.data || []);

      // Also fetch supplier_offers if we can resolve the enum
      if (supplierEnum) {
        const offersResult = await supabase
          .from('supplier_offers')
          .select('id, supplier, supplier_product_id, product_id, purchase_price_ht, pvp_ttc, stock_qty, is_active, last_seen_at, products(id, name, sku_interne)')
          .eq('supplier', supplierEnum)
          .order('last_seen_at', { ascending: false })
          .limit(500);
        if (!offersResult.error) {
          setSupplierOffers((offersResult.data as any) || []);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        supplier_id: supplierId,
        product_id: formData.product_id,
        supplier_reference: formData.supplier_reference || null,
        supplier_price: parseFloat(formData.supplier_price),
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        lead_time_days: parseInt(formData.lead_time_days) || 0,
        is_preferred: formData.is_preferred,
        notes: formData.notes || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('supplier_products')
          .update(data)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Produit fournisseur mis à jour');
      } else {
        const { error } = await supabase
          .from('supplier_products')
          .insert([data]);
        if (error) throw error;
        toast.success('Produit fournisseur ajouté');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving supplier product:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit fournisseur ?')) return;
    try {
      const { error } = await supabase
        .from('supplier_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Produit fournisseur supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting supplier product:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (sp: SupplierProduct) => {
    setEditingProduct(sp);
    setFormData({
      product_id: sp.product_id,
      supplier_reference: sp.supplier_reference || '',
      supplier_price: sp.supplier_price.toString(),
      stock_quantity: sp.stock_quantity.toString(),
      lead_time_days: sp.lead_time_days.toString(),
      is_preferred: sp.is_preferred,
      notes: sp.notes || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      supplier_reference: '',
      supplier_price: '',
      stock_quantity: '',
      lead_time_days: '',
      is_preferred: false,
      notes: '',
    });
    setEditingProduct(null);
  };

  const activeOffers = supplierOffers.filter(o => o.is_active);
  const inactiveOffers = supplierOffers.filter(o => !o.is_active);

  if (loading) {
    return <div className="text-muted-foreground p-4">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={supplierEnum ? 'offers' : 'catalogue'}>
        <TabsList>
          {supplierEnum && (
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Offres importées
              <Badge variant="secondary" className="ml-1">{activeOffers.length}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="catalogue" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Mapping catalogue
            <Badge variant="secondary" className="ml-1">{supplierProducts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── OFFRES IMPORTÉES (supplier_offers) ── */}
        {supplierEnum && (
          <TabsContent value="offers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${supplierBadgeColor[supplierEnum] ?? 'bg-muted text-muted-foreground'}`}>
                  {supplierEnum}
                </span>
                <span className="text-sm text-muted-foreground">
                  {activeOffers.length} offres actives · {inactiveOffers.length} inactives
                </span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf. fournisseur</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Prix achat HT</TableHead>
                  <TableHead>PVP TTC</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Vu le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierOffers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Aucune offre importée pour ce fournisseur
                    </TableCell>
                  </TableRow>
                ) : (
                  supplierOffers.map((offer) => (
                    <TableRow key={offer.id} className={!offer.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{offer.supplier_product_id || '—'}</TableCell>
                      <TableCell>
                        {offer.products?.name ?? (
                          <span className="text-muted-foreground italic text-xs">Produit non lié</span>
                        )}
                        {offer.products?.sku_interne && (
                          <div className="text-xs text-muted-foreground">{offer.products.sku_interne}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {offer.purchase_price_ht != null
                          ? `${Number(offer.purchase_price_ht).toFixed(2)} €`
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {offer.pvp_ttc != null
                          ? `${Number(offer.pvp_ttc).toFixed(2)} €`
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{offer.stock_qty ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                          {offer.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {offer.last_seen_at
                          ? new Date(offer.last_seen_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {offer.product_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/products?id=${offer.product_id}`)}
                            title="Voir la fiche produit"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        )}

        {/* ── MAPPING CATALOGUE (supplier_products) ── */}
        <TabsContent value="catalogue" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Associations manuelles produit ↔ fournisseur avec tarifs et délais
            </p>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un produit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Modifier' : 'Ajouter'} un produit fournisseur
                  </DialogTitle>
                  <DialogDescription>
                    Associez un produit à ce fournisseur avec ses conditions tarifaires
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="product_id">Produit</Label>
                    <select
                      id="product_id"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                      disabled={!!editingProduct}
                    >
                      <option value="">Sélectionner un produit</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier_reference">Référence fournisseur</Label>
                      <Input
                        id="supplier_reference"
                        value={formData.supplier_reference}
                        onChange={(e) => setFormData({ ...formData, supplier_reference: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier_price">Prix fournisseur (€)</Label>
                      <Input
                        id="supplier_price"
                        type="number"
                        step="0.01"
                        value={formData.supplier_price}
                        onChange={(e) => setFormData({ ...formData, supplier_price: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock_quantity">Stock fournisseur</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead_time_days">Délai (jours)</Label>
                      <Input
                        id="lead_time_days"
                        type="number"
                        value={formData.lead_time_days}
                        onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_preferred"
                      checked={formData.is_preferred}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_preferred: checked as boolean })
                      }
                    />
                    <Label htmlFor="is_preferred">Fournisseur préféré pour ce produit</Label>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingProduct ? 'Mettre à jour' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Délai</TableHead>
                <TableHead>Préféré</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun produit associé manuellement à ce fournisseur
                  </TableCell>
                </TableRow>
              ) : (
                supplierProducts.map((sp) => (
                  <TableRow key={sp.id}>
                    <TableCell>{sp.products?.name || 'N/A'}</TableCell>
                    <TableCell>{sp.supplier_reference || '-'}</TableCell>
                    <TableCell>{sp.supplier_price.toFixed(2)} €</TableCell>
                    <TableCell>{sp.stock_quantity}</TableCell>
                    <TableCell>{sp.lead_time_days}j</TableCell>
                    <TableCell>{sp.is_preferred ? '⭐' : '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(sp)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(sp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
};
