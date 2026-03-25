import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Package } from 'lucide-react';
import { ProductThumbnail } from './ProductThumbnail';
import { SupplierOfferCell, type OfferData } from './SupplierOfferCell';
import { cn } from '@/lib/utils';
import {
  type SupplierCode,
  SUPPLIER_CODES as SUPPLIERS,
  SUPPLIER_BADGE_COLORS as SUPPLIER_COLORS,
  SUPPLIER_HEADER_BG,
} from '@/types/supplier';

export interface ProductRow {
  product_id: string;
  product_name: string;
  sku_interne: string | null;
  ean: string | null;
  image_url: string | null;
  offers: Partial<Record<SupplierCode, OfferData>>;
  best_purchase_price_ht: number | null;
  best_price_supplier: SupplierCode | null;
  total_stock: number;
}

interface SupplierComparisonTableProps {
  rows: ProductRow[];
  isLoading: boolean;
  onToggleOffer: (id: string, isActive: boolean) => void;
  isToggling: boolean;
}

export function SupplierComparisonTable({
  rows,
  isLoading,
  onToggleOffer,
  isToggling,
}: SupplierComparisonTableProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sticky left-0 bg-card z-10" />
              <TableHead className="min-w-[180px] sticky left-12 bg-card z-10">Produit</TableHead>
              <TableHead className="w-[110px]">Référence</TableHead>
              {SUPPLIERS.map((s) => (
                <TableHead key={s} className={cn('text-center min-w-[155px] border-l', SUPPLIER_HEADER_BG[s])}>
                  <Badge variant="outline" className={`text-xs border ${SUPPLIER_COLORS[s]}`}>
                    {s}
                  </Badge>
                </TableHead>
              ))}
              <TableHead className="text-right border-l w-[80px]">Stock total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-20 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.product_id}>
                  <TableCell className="sticky left-0 bg-card z-10 p-2">
                    <ProductThumbnail imageUrl={row.image_url} name={row.product_name} />
                  </TableCell>

                  <TableCell className="sticky left-12 bg-card z-10 max-w-[220px]">
                    <span className="line-clamp-2 text-sm font-medium">
                      {row.product_name || (
                        <span className="text-muted-foreground italic">Sans nom</span>
                      )}
                    </span>
                  </TableCell>

                  <TableCell>
                    {row.ean ? (
                      <div>
                        <div className="font-mono text-xs">{row.ean}</div>
                        {row.sku_interne && (
                          <div className="text-[10px] text-muted-foreground">{row.sku_interne}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">EAN manquant</div>
                    )}
                  </TableCell>

                  {SUPPLIERS.map((s) => (
                    <TableCell key={s} className="border-l p-2 align-top">
                      <SupplierOfferCell
                        offer={row.offers[s]}
                        isBestPrice={
                          row.best_price_supplier === s &&
                          row.offers[s]?.purchase_price_ht != null
                        }
                        onToggle={onToggleOffer}
                        isToggling={isToggling}
                      />
                    </TableCell>
                  ))}

                  <TableCell className="text-right border-l">
                    <Badge
                      variant="outline"
                      className={cn(
                        row.total_stock > 0
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-muted text-muted-foreground',
                      )}
                    >
                      {row.total_stock}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Link
                      to={`/admin/products/${row.product_id}/offers`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Voir la fiche produit"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
