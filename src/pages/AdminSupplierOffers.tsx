import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { OfferStatsCards } from '@/components/suppliers/OfferStatsCards';
import { SupplierComparisonTable, type ProductRow } from '@/components/suppliers/SupplierComparisonTable';
import { useToast } from '@/hooks/use-toast';
import {
  type SupplierCode,
  SUPPLIER_CODES as SUPPLIERS,
} from '@/types/supplier';
import type { OfferData } from '@/components/suppliers/SupplierOfferCell';

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

type SortOption = 'name_asc' | 'name_desc' | 'best_price_asc' | 'total_stock_desc' | 'last_seen_desc';

const PAGE_SIZE = 50;

export default function AdminSupplierOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<'all' | SupplierCode>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(0);

  const { data: rawOffers, isLoading } = useQuery({
    queryKey: ['supplier-offers-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers' as string)
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

  const { data: stats } = useQuery({
    queryKey: ['supplier-offers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_offers' as string)
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('supplier_offers' as string)
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

  // Group offers by product
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
        _active_offer_count: activeCount,
      } as ProductRow & { _active_offer_count: number });
    });

    return rows;
  }, [rawOffers]);

  // Filter & sort
  const { filtered, totalFiltered } = useMemo(() => {
    let rows = productRows;

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

    if (filterSupplier !== 'all') {
      rows = rows.filter((r) => r.offers[filterSupplier] != null);
    }

    if (filterStatus === 'active') {
      rows = rows.filter((r) => (r as ProductRow & { _active_offer_count: number })._active_offer_count > 0);
    } else if (filterStatus === 'inactive') {
      rows = rows.filter((r) =>
        SUPPLIERS.some((s) => r.offers[s] && !r.offers[s]!.is_active)
      );
    }

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
          return 0; // kept for API compat
        default:
          return 0;
      }
    });

    return { filtered: rows, totalFiltered: rows.length };
  }, [productRows, search, filterSupplier, filterStatus, sortBy]);

  const pagedRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  return (
    <AdminLayout title="Offres fournisseurs">
      <div className="p-6 space-y-6">
        <OfferStatsCards stats={stats} />

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
              {SUPPLIERS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
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

        <SupplierComparisonTable
          rows={pagedRows}
          isLoading={isLoading}
          onToggleOffer={(id, isActive) => toggleMutation.mutate({ id, isActive })}
          isToggling={toggleMutation.isPending}
        />

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
