import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface SupplierProductEntry {
  id: string;
  product_id: string;
  supplier_reference: string | null;
  supplier_price: number;
  stock_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  notes: string | null;
}

interface SupplierProductFormDialogProps {
  products: Product[];
  editingProduct: SupplierProductEntry | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    product_id: string;
    supplier_reference: string | null;
    supplier_price: number;
    stock_quantity: number;
    lead_time_days: number;
    is_preferred: boolean;
    notes: string | null;
  }) => void;
  onReset: () => void;
}

export function SupplierProductFormDialog({
  products,
  editingProduct,
  isOpen,
  onOpenChange,
  onSubmit,
  onReset,
}: SupplierProductFormDialogProps) {
  const [formData, setFormData] = useState({
    product_id: editingProduct?.product_id || '',
    supplier_reference: editingProduct?.supplier_reference || '',
    supplier_price: editingProduct?.supplier_price?.toString() || '',
    stock_quantity: editingProduct?.stock_quantity?.toString() || '',
    lead_time_days: editingProduct?.lead_time_days?.toString() || '',
    is_preferred: editingProduct?.is_preferred || false,
    notes: editingProduct?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      product_id: formData.product_id,
      supplier_reference: formData.supplier_reference || null,
      supplier_price: parseFloat(formData.supplier_price),
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      lead_time_days: parseInt(formData.lead_time_days) || 0,
      is_preferred: formData.is_preferred,
      notes: formData.notes || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) onReset();
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingProduct ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
