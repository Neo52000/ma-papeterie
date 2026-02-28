import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCw, Plus, Trash2, ExternalLink, AlertCircle, CheckCircle,
  Clock, Search, Package, Store, TrendingUp, TrendingDown, Minus,
  BarChart2, Activity, Globe,
} from 'lucide-react';
import {
  useCompetitors,
  useCompetitorProductMaps,
  useScrapeRuns,
  useTriggerScrape,
  useUpsertCompetitorMap,
  useDeleteCompetitorMap,
  useToggleCompetitor,
  useCreateCompetitor,
} from '@/hooks/usePriceComparison';
import { useCompetitorPrices, useCompetitorStats } from '@/hooks/useCompetitorPrices';
import { useProducts } from '@/hooks/useProducts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ── Badge différence de prix ───────────────────────────────────────────────

function PriceDiffBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge variant="secondary">N/A</Badge>;
  if (pct < -5)
    return (
      <Badge className="bg-red-100 text-red-700 gap-1 border-red-200">
        <TrendingDown className="h-3 w-3" />
        {pct.toFixed(1)}%
      </Badge>
    );
  if (pct > 5)
    return (
      <Badge className="bg-green-100 text-green-700 gap-1 border-green-200">
        <TrendingUp className="h-3 w-3" />
        +{pct.toFixed(1)}%
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 gap-1 border-yellow-200">
      <Minus className="h-3 w-3" />
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </Badge>
  );
}

function rowBg(pct: number | null) {
  if (pct === null) return '';
  if (pct < -5) return 'bg-red-50/60 hover:bg-red-50';
  if (pct > 5)  return 'bg-green-50/60 hover:bg-green-50';
  return 'bg-yellow-50/40 hover:bg-yellow-50';
}

// ── Composant principal ────────────────────────────────────────────────────

export default function AdminPriceComparison() {
  // ── Mapping form state
  const [isAddMappingOpen, setIsAddMappingOpen]     = useState(false);
  const [selectedProductId, setSelectedProductId]   = useState('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [productUrl, setProductUrl]                 = useState('');
  const [packSize, setPackSize]                     = useState('1');

  // ── Competitor form state
  const [isAddCompetitorOpen, setIsAddCompetitorOpen] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newBaseUrl, setNewBaseUrl]   = useState('');
  const [newSelector, setNewSelector] = useState('');
  const [newRateLimit, setNewRateLimit]       = useState('4000');
  const [newDeliveryCost, setNewDeliveryCost] = useState('');

  // ── Comparatif filter state
  const [searchTerm, setSearchTerm]   = useState('');
  const [compFilter, setCompFilter]   = useState<'all' | 'cheaper' | 'expensive'>('all');
  const [mappingSearch, setMappingSearch] = useState('');

  // ── Data
  const { data: competitorPrices, isLoading: loadingPrices } = useCompetitorPrices();
  const { data: stats } = useCompetitorStats();
  const { data: competitors, isLoading: loadingCompetitors } = useCompetitors();
  const { data: mappings, isLoading: loadingMappings }       = useCompetitorProductMaps();
  const { data: scrapeRuns, isLoading: loadingRuns }         = useScrapeRuns(20);
  const { products } = useProducts();

  // ── Mutations
  const triggerScrape    = useTriggerScrape();
  const upsertMapping    = useUpsertCompetitorMap();
  const deleteMapping    = useDeleteCompetitorMap();
  const toggleCompetitor = useToggleCompetitor();
  const createCompetitor = useCreateCompetitor();

  const lastRun = scrapeRuns?.[0];

  // ── Comparatif data aggregation ──────────────────────────────────────────

  const comparatifRows = useMemo(() => {
    if (!competitorPrices?.length) return [];

    // 1. Latest per (product_id, competitor_name) — data already ordered desc by hook
    const latestByKey = new Map<string, typeof competitorPrices[0]>();
    competitorPrices.forEach(cp => {
      const key = `${cp.product_id}:${cp.competitor_name}`;
      if (!latestByKey.has(key)) latestByKey.set(key, cp);
    });

    // 2. Best (lowest) price per product
    const bestByProduct = new Map<string, typeof competitorPrices[0]>();
    latestByKey.forEach(cp => {
      const cur = bestByProduct.get(cp.product_id);
      if (!cur || cp.competitor_price < cur.competitor_price) {
        bestByProduct.set(cp.product_id, cp);
      }
    });

    // 3. Enrich with product info & sort (most concerning first)
    return Array.from(bestByProduct.values())
      .map(cp => {
        const product = products?.find(p => p.id === cp.product_id);
        return {
          ...cp,
          product_name: product?.name ?? cp.product_ean ?? 'Produit inconnu',
          our_price: (product as { price?: number } | undefined)?.price ?? null,
        };
      })
      .sort((a, b) => (a.price_difference_percent ?? 0) - (b.price_difference_percent ?? 0));
  }, [competitorPrices, products]);

  const filteredComparisons = useMemo(() => {
    let rows = comparatifRows;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.product_name.toLowerCase().includes(q) ||
        r.competitor_name.toLowerCase().includes(q),
      );
    }
    if (compFilter === 'cheaper')   rows = rows.filter(r => (r.price_difference_percent ?? 0) < -2);
    if (compFilter === 'expensive') rows = rows.filter(r => (r.price_difference_percent ?? 0) > 2);
    return rows;
  }, [comparatifRows, searchTerm, compFilter]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleForceRefresh = () => triggerScrape.mutate({ force: true });

  const handleAddMapping = () => {
    if (!selectedProductId || !selectedCompetitorId || !productUrl) return;
    upsertMapping.mutate(
      { product_id: selectedProductId, competitor_id: selectedCompetitorId, product_url: productUrl, pack_size: parseInt(packSize), active: true },
      { onSuccess: () => { setIsAddMappingOpen(false); setSelectedProductId(''); setSelectedCompetitorId(''); setProductUrl(''); setPackSize('1'); } },
    );
  };

  const handleAddCompetitor = () => {
    if (!newName || !newBaseUrl) return;
    createCompetitor.mutate(
      {
        name: newName,
        base_url: newBaseUrl,
        price_selector: newSelector || null,
        rate_limit_ms: newRateLimit ? parseInt(newRateLimit) : null,
        delivery_cost: newDeliveryCost ? parseFloat(newDeliveryCost) : null,
      },
      {
        onSuccess: () => {
          setIsAddCompetitorOpen(false);
          setNewName(''); setNewBaseUrl(''); setNewSelector('');
          setNewRateLimit('4000'); setNewDeliveryCost('');
        },
      },
    );
  };

  const filteredMappings = mappings?.filter(m =>
    m.product?.name?.toLowerCase().includes(mappingSearch.toLowerCase()) ||
    m.competitor?.name?.toLowerCase().includes(mappingSearch.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800">Succès</Badge>;
      case 'partial': return <Badge className="bg-yellow-100 text-yellow-800">Partiel</Badge>;
      case 'fail':    return <Badge variant="destructive">Échec</Badge>;
      case 'running': return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      default:        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Comparateur de Prix"
      description="Analyse concurrentielle et suivi des prix en temps réel"
    >
      {/* ── Barre d'état + bouton scraping ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {lastRun && (
            <>
              {getStatusBadge(lastRun.status)}
              <span className="text-sm text-muted-foreground">
                Dernier scraping{' '}
                {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true, locale: fr })}
                {lastRun.offers_saved > 0 && ` · ${lastRun.offers_saved} prix`}
              </span>
            </>
          )}
          {!lastRun && !loadingRuns && (
            <span className="text-sm text-muted-foreground">Aucun scraping effectué</span>
          )}
        </div>
        <Button onClick={handleForceRefresh} disabled={triggerScrape.isPending}>
          <RefreshCw className={cn('h-4 w-4 mr-2', triggerScrape.isPending && 'animate-spin')} />
          Forcer le scraping
        </Button>
      </div>

      <Tabs defaultValue="comparatif" className="space-y-6">
        <TabsList>
          <TabsTrigger value="comparatif" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Comparatif
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">
            <Package className="h-4 w-4" />
            URLs Concurrents
          </TabsTrigger>
          <TabsTrigger value="competitors" className="gap-2">
            <Store className="h-4 w-4" />
            Concurrents
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2">
            <Clock className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            Tab 1 — COMPARATIF
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="comparatif" className="space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Produits suivis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.totalProducts ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardDescription>Concurrents moins chers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{stats?.cheaperCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.cheaperPercent ?? 0}% des produits
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Écart moyen</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  'text-3xl font-bold',
                  parseFloat(stats?.avgDifference ?? '0') < 0 ? 'text-red-600' : 'text-green-600',
                )}>
                  {stats?.avgDifference ?? '0'}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {parseFloat(stats?.avgDifference ?? '0') < 0 ? 'concurrents moins chers' : 'nous sommes moins chers'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Concurrents actifs</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{competitors?.filter(c => c.enabled).length ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {competitors?.length ?? 0} configurés
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table comparatif */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Analyse prix par produit</CardTitle>
                  <CardDescription>
                    Meilleur prix concurrent vs notre prix de vente — trié du plus concernant
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={compFilter} onValueChange={(v) => setCompFilter(v as typeof compFilter)}>
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les produits</SelectItem>
                      <SelectItem value="cheaper">Concurrents moins chers</SelectItem>
                      <SelectItem value="expensive">Nous moins chers</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Produit ou concurrent…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPrices ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
                </div>
              ) : filteredComparisons.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">Aucune donnée de comparaison</p>
                  <p className="text-sm mt-1">
                    Configurez des URLs dans l'onglet "URLs Concurrents" puis lancez un scraping
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Notre prix</TableHead>
                        <TableHead className="text-right">Meilleur concurrent</TableHead>
                        <TableHead>Concurrent</TableHead>
                        <TableHead className="text-right">Écart €</TableHead>
                        <TableHead className="text-right">Écart %</TableHead>
                        <TableHead>Màj</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComparisons.map((row) => {
                        const pct  = row.price_difference_percent;
                        const diff = row.price_difference;
                        return (
                          <TableRow key={row.product_id} className={rowBg(pct)}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {row.product_name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.our_price != null
                                ? `${(row.our_price as number).toFixed(2)} €`
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {row.competitor_price.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-sm">{row.competitor_name}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {diff != null ? (
                                <span className={diff < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                  {diff > 0 ? '+' : ''}{diff.toFixed(2)} €
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <PriceDiffBadge pct={pct} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(row.scraped_at), { addSuffix: true, locale: fr })}
                            </TableCell>
                            <TableCell>
                              {row.competitor_url && (
                                <a
                                  href={row.competitor_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Tab 2 — URLs CONCURRENTS (mappings)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>URLs des Produits Concurrents</CardTitle>
                  <CardDescription>Gérez les URLs à scraper pour chaque produit et concurrent</CardDescription>
                </div>

                <Dialog open={isAddMappingOpen} onOpenChange={setIsAddMappingOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une URL
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une URL concurrente</DialogTitle>
                      <DialogDescription>Liez un produit à une URL chez un concurrent pour le suivi des prix</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Produit</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Concurrent</Label>
                        <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un concurrent" />
                          </SelectTrigger>
                          <SelectContent>
                            {competitors?.filter(c => c.enabled).map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>URL du produit chez le concurrent</Label>
                        <Input
                          placeholder="https://concurrent.fr/produit/..."
                          value={productUrl}
                          onChange={(e) => setProductUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Conditionnement</Label>
                        <Select value={packSize} onValueChange={setPackSize}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Unité (×1)</SelectItem>
                            <SelectItem value="5">Carton (×5)</SelectItem>
                            <SelectItem value="10">Carton (×10)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMappingOpen(false)}>Annuler</Button>
                      <Button
                        onClick={handleAddMapping}
                        disabled={!selectedProductId || !selectedCompetitorId || !productUrl || upsertMapping.isPending}
                      >
                        {upsertMapping.isPending ? 'Ajout…' : 'Ajouter'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par produit ou concurrent…"
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground ml-2">
                  {filteredMappings?.length ?? 0} URL{(filteredMappings?.length ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>

            <CardContent>
              {loadingMappings ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Concurrent</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Pack</TableHead>
                      <TableHead>Dernier succès</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings?.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium max-w-[160px] truncate">
                          {mapping.product?.name || 'Produit inconnu'}
                        </TableCell>
                        <TableCell>{mapping.competitor?.name || 'Inconnu'}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <a
                            href={mapping.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{mapping.product_url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell><Badge variant="outline">×{mapping.pack_size}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mapping.last_success_at
                            ? formatDistanceToNow(new Date(mapping.last_success_at), { addSuffix: true, locale: fr })
                            : 'Jamais'}
                        </TableCell>
                        <TableCell>
                          {mapping.last_error ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />Erreur
                            </Badge>
                          ) : mapping.active ? (
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <CheckCircle className="h-3 w-3" />Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMapping.mutate(mapping.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {filteredMappings?.length === 0 && !loadingMappings && (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-25" />
                  Aucun mapping trouvé
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Tab 3 — CONCURRENTS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Concurrents</CardTitle>
                  <CardDescription>Configurez et activez les sites à surveiller</CardDescription>
                </div>

                <Dialog open={isAddCompetitorOpen} onOpenChange={setIsAddCompetitorOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un concurrent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un concurrent</DialogTitle>
                      <DialogDescription>
                        Le concurrent sera activé par défaut. Configurez le sélecteur CSS si l'auto-détection échoue.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label>Nom du concurrent <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="ex: Bureau Vallée"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>URL de base <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="https://www.concurrent.fr"
                            value={newBaseUrl}
                            onChange={(e) => setNewBaseUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Sélecteur CSS du prix <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                          <Input
                            placeholder=".price, [data-price], #product-price"
                            value={newSelector}
                            onChange={(e) => setNewSelector(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate limit (ms)</Label>
                          <Input
                            type="number"
                            placeholder="4000"
                            value={newRateLimit}
                            onChange={(e) => setNewRateLimit(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Livraison standard (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newDeliveryCost}
                            onChange={(e) => setNewDeliveryCost(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddCompetitorOpen(false)}>Annuler</Button>
                      <Button
                        onClick={handleAddCompetitor}
                        disabled={!newName || !newBaseUrl || createCompetitor.isPending}
                      >
                        {createCompetitor.isPending ? 'Ajout…' : 'Ajouter'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCompetitors ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>URL de base</TableHead>
                      <TableHead>Rate limit</TableHead>
                      <TableHead>Livraison</TableHead>
                      <TableHead>Sélecteur CSS</TableHead>
                      <TableHead className="text-right">Actif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitors?.map((competitor) => (
                      <TableRow key={competitor.id}>
                        <TableCell className="font-medium">{competitor.name}</TableCell>
                        <TableCell>
                          <a
                            href={competitor.base_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            {competitor.base_url.replace(/^https?:\/\//, '')}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {competitor.rate_limit_ms ? `${competitor.rate_limit_ms} ms` : '4 000 ms'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {competitor.delivery_cost != null ? `${competitor.delivery_cost.toFixed(2)} €` : '—'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                          {competitor.price_selector || 'Auto-détection'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={competitor.enabled}
                            onCheckedChange={(enabled) =>
                              toggleCompetitor.mutate({ id: competitor.id, enabled })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {competitors?.length === 0 && !loadingCompetitors && (
                <div className="text-center py-10 text-muted-foreground">
                  <Store className="h-8 w-8 mx-auto mb-2 opacity-25" />
                  Aucun concurrent configuré. Ajoutez-en un pour commencer.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            Tab 4 — HISTORIQUE SCRAPING
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Scrapings</CardTitle>
              <CardDescription>Suivi des exécutions automatiques et manuelles (20 derniers)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRuns ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Prix sauvegardés</TableHead>
                      <TableHead className="text-right">Erreurs</TableHead>
                      <TableHead className="text-right">Durée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapeRuns?.map((run) => {
                      const duration = run.finished_at
                        ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                        : null;
                      return (
                        <TableRow key={run.id}>
                          <TableCell className="text-sm">
                            {new Date(run.started_at).toLocaleString('fr-FR')}
                          </TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell className="text-right font-medium">{run.offers_saved}</TableCell>
                          <TableCell className="text-right">
                            {run.errors_count > 0
                              ? <Badge variant="destructive">{run.errors_count}</Badge>
                              : <span className="text-muted-foreground">0</span>
                            }
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {duration != null
                              ? duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {scrapeRuns?.length === 0 && !loadingRuns && (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-25" />
                  Aucun scraping effectué pour l'instant
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
