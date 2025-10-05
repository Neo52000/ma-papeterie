import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

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

export const SupplierProducts = ({ supplierId }: { supplierId: string }) => {
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  
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
  }, [supplierId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch supplier products
      const { data: spData, error: spError } = await supabase
        .from('supplier_products')
        .select(`
          *,
          products (
            id,
            name,
            image_url
          )
        `)
        .eq('supplier_id', supplierId);

      if (spError) throw spError;
      setSupplierProducts(spData || []);

      // Fetch all products
      const { data: pData, error: pError } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .order('name');

      if (pError) throw pError;
      setProducts(pData || []);
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

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Produits du fournisseur</h3>
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
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Aucun produit associé à ce fournisseur
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(sp)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(sp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
