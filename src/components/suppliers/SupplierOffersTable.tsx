import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductThumbnail } from './ProductThumbnail';
import type { SupplierCode } from '@/types/supplier';

export interface DisplayOffer {
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
    category?: string | null;
    brand?: string | null;
    ean?: string | null;
    image_url?: string | null;
  } | null;
}

interface SupplierOffersTableProps {
  supplierEnum: SupplierCode;
  offers: DisplayOffer[];
  activeCount: number;
  inactiveCount: number;
  usingFallback: boolean;
  fetchError: string | null;
  hasSearchFilter: boolean;
}

const supplierBadgeColor: Record<string, string> = {
  ALKOR: 'bg-blue-100 text-blue-800',
  COMLANDI: 'bg-purple-100 text-purple-800',
  SOFT: 'bg-orange-100 text-orange-800',
};

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

export function SupplierOffersTable({
  supplierEnum,
  offers,
  activeCount,
  inactiveCount,
  usingFallback,
  fetchError,
  hasSearchFilter,
}: SupplierOffersTableProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded ${supplierBadgeColor[supplierEnum] ?? 'bg-muted text-muted-foreground'}`}>
            {supplierEnum}
          </span>
          <Badge variant="outline" className="text-xs">
            {usingFallback ? 'Fallback mapping' : 'Offres reelles'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {activeCount} offres actives · {inactiveCount} inactives
          </span>
        </div>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          <AlertTriangle className="h-4 w-4" />
          Impossible de lire `supplier_offers`: {fetchError}. Affichage en fallback depuis `supplier_products`.
        </div>
      )}
      {!fetchError && usingFallback && (
        <div className="text-xs text-muted-foreground">
          Aucune offre importee trouvee: affichage automatique du mapping catalogue.
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead className="text-xs">Réf. fournisseur</TableHead>
            <TableHead>Prix achat HT</TableHead>
            <TableHead>PVP TTC</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Vu le</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                {hasSearchFilter ? 'Aucun résultat pour ce filtre' : 'Aucune offre importée pour ce fournisseur'}
              </TableCell>
            </TableRow>
          ) : (
            offers.map((offer) => (
              <TableRow key={offer.id} className={!offer.is_active ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProductThumbnail imageUrl={offer.products?.image_url} name={offer.products?.name} />
                    <div className="min-w-0">
                      {offer.product_id ? (
                        <button
                          onClick={() => navigate(`/admin/products?id=${offer.product_id}`)}
                          className="text-left text-sm font-medium hover:underline hover:text-primary transition-colors line-clamp-2"
                        >
                          {offer.products?.name ?? 'Produit non lié'}
                        </button>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Produit non lié</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {renderProductRef(offer.products?.ean, offer.supplier_product_id)}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {offer.supplier_product_id || '—'}
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
                      onClick={() => navigate(`/admin/products/${offer.product_id}/offers`)}
                      title="Voir les offres produit"
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
    </div>
  );
}
