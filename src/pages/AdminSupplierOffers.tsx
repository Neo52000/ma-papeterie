import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ExternalLink, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Package } from 'lucide-react';
import { ProductThumbnail } from '@/components/suppliers/ProductThumbnail';
import { SupplierOfferCell, type OfferData } from '@/components/suppliers/SupplierOfferCell';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ── Types ───────────────────────────────────────────────────────────────────────

type SupplierCode = 'ALKOR' | 'COMLANDI' | 'SOFT';

const SUPPLIERS: SupplierCode[] = ['ALKOR', 'COMLANDI', 'SOFT'];

const SUPPLIER_COLORS: Record<SupplierCode, string> = {
  ALKOR: 'border-green-300 bg-green-100 text-green-800',
  COMLANDI: 'border-blue-300 bg-blue-100 text-blue-800',
  SOFT: 'border-purple-300 bg-purple-100 text-purple-800',
};

const SUPPLIER_HEADER_BG: Record<SupplierCode, string> = {
  ALKOR: 'bg-green-50/50',
  COMLANDI: 'bg-blue-50/50',
  SOFT: 'bg-purple-50/50',
};

interface RawSupplierOffer {
  id: string;
  product_id: string;
  supplier: SupplierCode;
  supplier_product_id: string;
  pvp_ttc: number | null;
  purchase_price_ht: number | null;
  stock_qty: number;
  is_active: boolean;
  last_seen_at: string;
  products?: {
    name: string;
    sku_interne?: string;
    ean?: string;
    image_url?: string | null;
  } | null;
}

interface ProductRow {
  product_id: string;
  product_name: string;
  sku_interne: string | null;
  ean: string | null;
  image_url: string | null;
  offers: Partial<Record<SupplierCode, OfferData>>;
  best_purchase_price_ht: number | null;
  best_price_supplier: SupplierCode | null;
  total_stock: number;
  latest_seen_at: string | null;
  active_offer_count: number;
}

type SortOption = 'name_asc' | 'name_desc' | 'best_price_asc' | 'total_stock_desc' | 'last_seen_desc';

const PAGE_SIZE = 50;

// ── Component ───────────────────────────────────────────────────────────────────

export default function AdminSupplierOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<'all' | SupplierCode>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(0);

  // ── Fetch all offers ────────────────────────────────────────────────────────

  const { data: rawOffers, isLoading } = useQuery({
    queryKey: ['supplier-offers-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers' as any)
        .select(`
          id, product_id, supplier, supplier_product_id,
          pvp_ttc, purchase_price_ht, stock_qty, is_active, last_seen_at,
          products (name, sku_interne, ean, image_url)
        `)
        .order('product_id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RawSupplierOffer[];
    },
    staleTime: 30_000,
  });

  // ── Stats ───────────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['supplier-offers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers' as any)
        .select('supplier, is_active');
      if (error) throw error;
      const rows = (data as unknown) as { supplier: SupplierCode; is_active: boolean }[];
      const active = rows.filter((r) => r.is_active).length;
      const inactive = rows.filter((r) => !r.is_active).length;
      const bySupplier: Record<string, number> = {};
      rows.forEach((r) => { bySupplier[r.supplier] = (bySupplier[r.supplier] || 0) + 1; });
      return { active, inactive, total: rows.length, bySupplier };
    },
  });

  // ── Toggle mutation ─────────────────────────────────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('supplier_offers' as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-offers-stats'] });
      toast({ title: 'Offre mise à jour' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  // ── Group offers by product ─────────────────────────────────────────────────

  const productRows = useMemo<ProductRow[]>(() => {
    if (!rawOffers?.length) return [];

    const byProduct = new Map<string, {
      product: RawSupplierOffer['products'];
      offers: Map<SupplierCode, OfferData>;
    }>();

    for (const offer of rawOffers) {
      let entry = byProduct.get(offer.product_id);
      if (!entry) {
        entry = { product: offer.products, offers: new Map() };
        byProduct.set(offer.product_id, entry);
      }
      // Keep most relevant offer per (product, supplier): prefer active, then most recent
      const existing = entry.offers.get(offer.supplier);
      if (
        !existing ||
        (!existing.is_active && offer.is_active) ||
        (existing.is_active === offer.is_active &&
          new Date(offer.last_seen_at) > new Date(existing.last_seen_at))
      ) {
        entry.offers.set(offer.supplier, {
          id: offer.id,
          supplier_product_id: offer.supplier_product_id,
          purchase_price_ht: offer.purchase_price_ht,
          pvp_ttc: offer.pvp_ttc,
          stock_qty: offer.stock_qty,
          is_active: offer.is_active,
          last_seen_at: offer.last_seen_at,
        });
      }
    }

    const rows: ProductRow[] = [];
    byProduct.forEach((entry, productId) => {
      const offersRecord: Partial<Record<SupplierCode, OfferData>> = {};
      let bestPrice: number | null = null;
      let bestSupplier: SupplierCode | null = null;
      let totalStock = 0;
      let latestSeen: string | null = null;
      let activeCount = 0;

      entry.offers.forEach((offerData, supplier) => {
        offersRecord[supplier] = offerData;
        totalStock += offerData.stock_qty;
        if (offerData.is_active) activeCount++;

        if (
          offerData.is_active &&
          offerData.purchase_price_ht != null &&
          (bestPrice === null || offerData.purchase_price_ht < bestPrice)
        ) {
          bestPrice = offerData.purchase_price_ht;
          bestSupplier = supplier;
        }

        if (!latestSeen || offerData.last_seen_at > latestSeen) {
          latestSeen = offerData.last_seen_at;
        }
      });

      rows.push({
        product_id: productId,
        product_name: entry.product?.name ?? '',
        sku_interne: entry.product?.sku_interne ?? null,
        ean: entry.product?.ean ?? null,
        image_url: entry.product?.image_url ?? null,
        offers: offersRecord,
        best_purchase_price_ht: bestPrice,
        best_price_supplier: bestSupplier,
        total_stock: totalStock,
        latest_seen_at: latestSeen,
        active_offer_count: activeCount,
      });
    });

    return rows;
  }, [rawOffers]);

  // ── Filter & sort ───────────────────────────────────────────────────────────

  const { filtered, totalFiltered } = useMemo(() => {
    let rows = productRows;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => {
        if (r.product_name.toLowerCase().includes(q)) return true;
        if (r.ean?.toLowerCase().includes(q)) return true;
        if (r.sku_interne?.toLowerCase().includes(q)) return true;
        return SUPPLIERS.some((s) =>
          r.offers[s]?.supplier_product_id?.toLowerCase().includes(q)
        );
      });
    }

    // Supplier filter: products that have an offer from this supplier
    if (filterSupplier !== 'all') {
      rows = rows.filter((r) => r.offers[filterSupplier] != null);
    }

    // Status filter
    if (filterStatus === 'active') {
      rows = rows.filter((r) => r.active_offer_count > 0);
    } else if (filterStatus === 'inactive') {
      rows = rows.filter((r) =>
        SUPPLIERS.some((s) => r.offers[s] && !r.offers[s]!.is_active)
      );
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.product_name.localeCompare(b.product_name, 'fr');
        case 'name_desc':
          return b.product_name.localeCompare(a.product_name, 'fr');
        case 'best_price_asc':
          return (a.best_purchase_price_ht ?? Infinity) - (b.best_purchase_price_ht ?? Infinity);
        case 'total_stock_desc':
          return b.total_stock - a.total_stock;
        case 'last_seen_desc':
          return (b.latest_seen_at ?? '').localeCompare(a.latest_seen_at ?? '');
        default:
          return 0;
      }
    });

    return { filtered: rows, totalFiltered: rows.length };
  }, [productRows, search, filterSupplier, filterStatus, sortBy]);

  // ── Pagination ──────────────────────────────────────────────────────────────

  const pagedRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout title="Offres fournisseurs">
      <div className="p-6 space-y-6">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{stats?.total ?? '…'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total offres</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{stats?.active ?? '…'}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Actives</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats?.inactive ?? '…'}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Inactives</p>
            </CardContent>
          </Card>
          {SUPPLIERS.map((s) => (
            <Card key={s}>
              <CardContent className="pt-4 pb-3">
                <p className="text-2xl font-bold">{stats?.bySupplier[s] ?? 0}</p>
                <Badge className={`text-xs mt-0.5 border ${SUPPLIER_COLORS[s]}`} variant="outline">{s}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, EAN, réf. fournisseur, SKU…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={filterSupplier} onValueChange={(v) => { setFilterSupplier(v as 'all' | SupplierCode); setPage(0); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Fournisseur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              <SelectItem value="ALKOR">ALKOR</SelectItem>
              <SelectItem value="COMLANDI">COMLANDI</SelectItem>
              <SelectItem value="SOFT">SOFT</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as 'all' | 'active' | 'inactive'); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Nom A → Z</SelectItem>
              <SelectItem value="name_desc">Nom Z → A</SelectItem>
              <SelectItem value="best_price_asc">Meilleur PA HT ↑</SelectItem>
              <SelectItem value="total_stock_desc">Stock total ↓</SelectItem>
              <SelectItem value="last_seen_desc">Vu récemment ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Comparison table */}
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
                ) : pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Aucun produit trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => (
                    <TableRow key={row.product_id}>
                      {/* Thumbnail */}
                      <TableCell className="sticky left-0 bg-card z-10 p-2">
                        <ProductThumbnail imageUrl={row.image_url} name={row.product_name} />
                      </TableCell>

                      {/* Product name */}
                      <TableCell className="sticky left-12 bg-card z-10 max-w-[220px]">
                        <span className="line-clamp-2 text-sm font-medium">
                          {row.product_name || (
                            <span className="text-muted-foreground italic">Sans nom</span>
                          )}
                        </span>
                      </TableCell>

                      {/* EAN / SKU */}
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

                      {/* Supplier columns */}
                      {SUPPLIERS.map((s) => (
                        <TableCell key={s} className="border-l p-2 align-top">
                          <SupplierOfferCell
                            offer={row.offers[s]}
                            isBestPrice={
                              row.best_price_supplier === s &&
                              row.offers[s]?.purchase_price_ht != null
                            }
                            onToggle={(id, isActive) =>
                              toggleMutation.mutate({ id, isActive })
                            }
                            isToggling={toggleMutation.isPending}
                          />
                        </TableCell>
                      ))}

                      {/* Total stock */}
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

                      {/* Link to detail */}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} / {totalPages} — {totalFiltered} produits au total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
