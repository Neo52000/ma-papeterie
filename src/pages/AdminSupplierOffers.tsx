import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ExternalLink, Search, ChevronLeft, ChevronRight, Package, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type SupplierCode = 'ALKOR' | 'COMLANDI' | 'SOFT';

const SUPPLIER_COLORS: Record<SupplierCode, string> = {
  ALKOR: 'border-primary/30 bg-primary/10 text-primary',
  COMLANDI: 'border-secondary/30 bg-secondary/10 text-secondary-foreground',
  SOFT: 'border-accent/30 bg-accent/10 text-accent-foreground',
};

const PAGE_SIZE = 100;

interface SupplierOffer {
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
  } | null;
}

export default function AdminSupplierOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState<'all' | SupplierCode>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'last_seen_desc' | 'last_seen_asc' | 'purchase_price' | 'stock'>('last_seen_desc');
  const [page, setPage] = useState(0);

  const queryKey = ['supplier-offers-global', filterSupplier, filterStatus, sortBy, page];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('supplier_offers' as any)
        .select(`
          id, product_id, supplier, supplier_product_id,
          pvp_ttc, purchase_price_ht, stock_qty, is_active, last_seen_at,
          products (name, sku_interne, ean)
        `, { count: 'exact' });

      if (filterSupplier !== 'all') q = q.eq('supplier', filterSupplier);
      if (filterStatus === 'active') q = q.eq('is_active', true);
      if (filterStatus === 'inactive') q = q.eq('is_active', false);

      // Sorting
      if (sortBy === 'last_seen_desc') q = q.order('last_seen_at', { ascending: false });
      else if (sortBy === 'last_seen_asc') q = q.order('last_seen_at', { ascending: true });
      else if (sortBy === 'purchase_price') q = q.order('purchase_price_ht', { ascending: true });
      else if (sortBy === 'stock') q = q.order('stock_qty', { ascending: false });

      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { offers: (data ?? []) as unknown as SupplierOffer[], total: count ?? 0 };
    },
  });

  // Stats query (no pagination)
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('supplier_offers' as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-offers-global'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-offers-stats'] });
      toast({ title: 'Offre mise à jour' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  // Client-side search filter (name / SKU / supplier_product_id)
  const offers = (data?.offers ?? []).filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.supplier_product_id?.toLowerCase().includes(q) ||
      o.products?.name?.toLowerCase().includes(q) ||
      o.products?.sku_interne?.toLowerCase().includes(q) ||
      o.products?.ean?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

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
          {(['ALKOR', 'COMLANDI', 'SOFT'] as SupplierCode[]).map((s) => (
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
              placeholder="Rechercher produit, SKU, réf. fournisseur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterSupplier} onValueChange={(v) => { setFilterSupplier(v as any); setPage(0); }}>
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
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as any); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(0); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_seen_desc">Vu récemment ↓</SelectItem>
              <SelectItem value="last_seen_asc">Vu récemment ↑</SelectItem>
              <SelectItem value="purchase_price">Prix achat ↑</SelectItem>
              <SelectItem value="stock">Stock ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Fournisseur</TableHead>
                <TableHead>Réf. fournisseur</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>SKU / EAN</TableHead>
                <TableHead className="text-right">Prix achat HT</TableHead>
                <TableHead className="text-right">PVP TTC</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Vu le</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : offers.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Aucune offre trouvée
                    </TableCell>
                  </TableRow>
                )
                : offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs border ${SUPPLIER_COLORS[offer.supplier] ?? ''}`}
                      >
                        {offer.supplier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {offer.supplier_product_id}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="line-clamp-2 text-sm font-medium">
                        {offer.products?.name ?? <span className="text-muted-foreground italic">Produit introuvable</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{offer.products?.sku_interne || '—'}</div>
                      <div className="font-mono">{offer.products?.ean || ''}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {offer.purchase_price_ht != null
                        ? `${offer.purchase_price_ht.toFixed(2)} €`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {offer.pvp_ttc != null
                        ? `${offer.pvp_ttc.toFixed(2)} €`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={offer.stock_qty > 0
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-muted text-muted-foreground'}
                      >
                        {offer.stock_qty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={offer.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: offer.id, isActive: checked })
                        }
                        disabled={toggleMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {offer.last_seen_at
                        ? format(new Date(offer.last_seen_at), 'dd MMM yy', { locale: fr })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {offer.product_id && (
                        <Link
                          to={`/admin/products/${offer.product_id}/offers`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Voir la fiche produit"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} / {totalPages} — {data?.total ?? 0} offres au total
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
