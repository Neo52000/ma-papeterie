import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { ProductThumbnail } from './ProductThumbnail';

interface SupplierProductRow {
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
    sku_interne?: string | null;
    category?: string | null;
    brand?: string | null;
    ean?: string | null;
  };
}

interface SupplierCatalogueTableProps {
  items: SupplierProductRow[];
  hasSearchFilter: boolean;
  onEdit: (item: SupplierProductRow) => void;
  onDelete: (id: string) => void;
}

function renderProductRef(ean?: string | null, supplierRef?: string | null) {
  if (ean) {
    return (
      <div>
        <div className="font-mono text-sm">{ean}</div>
        {supplierRef && (
          <div className="text-xs text-muted-foreground">Ref: {supplierRef}</div>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="font-mono text-sm text-amber-700">{supplierRef || '—'}</div>
      <div className="text-xs text-muted-foreground italic">EAN manquant</div>
    </div>
  );
}

export type { SupplierProductRow };

export function SupplierCatalogueTable({
  items,
  hasSearchFilter,
  onEdit,
  onDelete,
}: SupplierCatalogueTableProps) {
  return (
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
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              {hasSearchFilter ? 'Aucun résultat pour ce filtre' : 'Aucun produit associé manuellement à ce fournisseur'}
            </TableCell>
          </TableRow>
        ) : (
          items.map((sp) => (
            <TableRow key={sp.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <ProductThumbnail imageUrl={sp.products?.image_url} name={sp.products?.name} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium line-clamp-2">{sp.products?.name || 'N/A'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {renderProductRef(sp.products?.ean, sp.supplier_reference)}
              </TableCell>
              <TableCell>{sp.supplier_price.toFixed(2)} €</TableCell>
              <TableCell>{sp.stock_quantity}</TableCell>
              <TableCell>{sp.lead_time_days}j</TableCell>
              <TableCell>{sp.is_preferred ? '⭐' : '-'}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(sp)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(sp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
