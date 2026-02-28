import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useScrapePrices, useCompetitorStats, useDiscoverCompetitorUrls, type DiscoverResult } from "@/hooks/useCompetitorPrices";
import { RefreshCw, TrendingUp, TrendingDown, Search, DollarSign, Package, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProductAnalysis {
  id: string;
  name: string;
  category: string;
  price: number;
  margin_percent: number | null;
  supplier_price: number | null;
  supplier_name: string | null;
  competitor_avg_price: number | null;
  competitor_min_price: number | null;
  price_position: 'cheaper' | 'similar' | 'expensive' | 'no_data';
}

export default function AdminCompetitors() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const scrapePrices = useScrapePrices();
  const { data: competitorStats } = useCompetitorStats();
  const discoverUrls = useDiscoverCompetitorUrls();

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          price,
          margin_percent,
          supplier_products!inner (
            supplier_price,
            is_preferred,
            suppliers (name)
          )
        `)
        .eq('supplier_products.is_preferred', true)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Meilleur prix par produit (pack_size=1) depuis price_current
      const { data: bestPrices, error: bestError } = await supabase
        .from('price_current')
        .select('product_id, best_price, pack_size')
        .eq('pack_size', 1);

      if (bestError) throw bestError;

      // Prix moyens depuis price_snapshots (72h, non suspects, pack_size=1)
      const seventyTwoHoursAgo = new Date();
      seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

      const { data: snapshots, error: snapshotsError } = await supabase
        .from('price_snapshots')
        .select('product_id, price, pack_size')
        .gte('scraped_at', seventyTwoHoursAgo.toISOString())
        .eq('is_suspect', false)
        .eq('pack_size', 1);

      if (snapshotsError) throw snapshotsError;

      const bestByProduct = new Map<string, number>();
      bestPrices?.forEach(p => {
        if (p.best_price !== null) {
          bestByProduct.set(p.product_id, Number(p.best_price));
        }
      });

      const snapshotsByProduct = new Map<string, number[]>();
      snapshots?.forEach(s => {
        if (!snapshotsByProduct.has(s.product_id)) {
          snapshotsByProduct.set(s.product_id, []);
        }
        snapshotsByProduct.get(s.product_id)!.push(Number(s.price));
      });

      const analysis: ProductAnalysis[] = productsData?.map(product => {
        const supplierProduct = product.supplier_products[0];
        const minCompPrice = bestByProduct.get(product.id) ?? null;
        const pricesArr = snapshotsByProduct.get(product.id) || [];
        const avgCompPrice = pricesArr.length > 0
          ? pricesArr.reduce((a, b) => a + b, 0) / pricesArr.length
          : null;

        let pricePosition: 'cheaper' | 'similar' | 'expensive' | 'no_data' = 'no_data';
        if (avgCompPrice) {
          const diff = ((product.price - avgCompPrice) / avgCompPrice) * 100;
          if (diff < -5) pricePosition = 'cheaper';
          else if (diff > 5) pricePosition = 'expensive';
          else pricePosition = 'similar';
        }

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          margin_percent: product.margin_percent,
          supplier_price: supplierProduct?.supplier_price || null,
          supplier_name: supplierProduct?.suppliers?.name || null,
          competitor_avg_price: avgCompPrice,
          competitor_min_price: minCompPrice,
          price_position: pricePosition,
        };
      }) || [];

      setProducts(analysis);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'analyse",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = () => {
    const productIds = products.map(p => p.id);
    scrapePrices.mutate(productIds, {
      onSuccess: () => {
        fetchAnalysis();
      }
    });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgMargin = products.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / (products.length || 1);
  const productsWithData = products.filter(p => p.competitor_avg_price !== null).length;
  const cheaperCount = products.filter(p => p.price_position === 'cheaper').length;
  const expensiveCount = products.filter(p => p.price_position === 'expensive').length;

  const marginRanges = [
    { range: '< 10%', count: products.filter(p => (p.margin_percent || 0) < 10).length },
    { range: '10-20%', count: products.filter(p => (p.margin_percent || 0) >= 10 && (p.margin_percent || 0) < 20).length },
    { range: '20-30%', count: products.filter(p => (p.margin_percent || 0) >= 20 && (p.margin_percent || 0) < 30).length },
    { range: '30-40%', count: products.filter(p => (p.margin_percent || 0) >= 30 && (p.margin_percent || 0) < 40).length },
    { range: '> 40%', count: products.filter(p => (p.margin_percent || 0) >= 40).length },
  ];

  const pricePositionData = [
    { name: 'Moins chers', value: cheaperCount, color: '#22c55e' },
    { name: 'Similaires', value: products.filter(p => p.price_position === 'similar').length, color: '#eab308' },
    { name: 'Plus chers', value: expensiveCount, color: '#ef4444' },
    { name: 'Sans données', value: products.filter(p => p.price_position === 'no_data').length, color: '#94a3b8' },
  ];

  const categoryMargins = products.reduce((acc, p) => {
    if (!acc[p.category]) {
      acc[p.category] = { total: 0, count: 0 };
    }
    acc[p.category].total += p.margin_percent || 0;
    acc[p.category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const categoryData = Object.entries(categoryMargins)
    .map(([category, data]) => ({
      category,
      margin: (data.total / data.count).toFixed(1),
    }))
    .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin))
    .slice(0, 10);

  if (loading) {
    return (
      <AdminLayout title="Analyse Concurrentielle" description="Comparaison des prix et marges">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analyse Concurrentielle" description="Comparaison des prix et marges">
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              discoverUrls.mutate({ batchSize: 20 }, {
                onSuccess: (data) => setDiscoverResult(data),
              })
            }
            disabled={discoverUrls.isPending}
          >
            <Link2 className={`h-4 w-4 mr-2 ${discoverUrls.isPending ? 'animate-pulse' : ''}`} />
            {discoverUrls.isPending ? 'Découverte en cours…' : 'Auto-découverte URLs (20 produits)'}
          </Button>
          <Button onClick={handleRefreshAll} disabled={scrapePrices.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${scrapePrices.isPending ? 'animate-spin' : ''}`} />
            Actualiser tous les prix
          </Button>
        </div>

        <Dialog open={!!discoverResult} onOpenChange={() => setDiscoverResult(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Résultats de l'auto-découverte</DialogTitle>
            </DialogHeader>
            {discoverResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-green-600">{discoverResult.stats.found}</div>
                    <div className="text-xs text-muted-foreground">Trouvées</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-blue-600">{discoverResult.stats.skipped}</div>
                    <div className="text-xs text-muted-foreground">Déjà mappées</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-yellow-600">{discoverResult.stats.not_found}</div>
                    <div className="text-xs text-muted-foreground">Introuvables</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-2xl font-bold text-red-600">{discoverResult.stats.errors}</div>
                    <div className="text-xs text-muted-foreground">Erreurs</div>
                  </div>
                </div>
                <div className="text-sm space-y-1 max-h-80 overflow-y-auto">
                  {discoverResult.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 py-1 border-b last:border-0">
                      <span className={`text-xs font-mono mt-0.5 shrink-0 ${
                        d.status === 'mapped' ? 'text-green-600' :
                        d.status === 'not_found' || d.status === 'no_match' ? 'text-yellow-600' :
                        d.status.startsWith('error') ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {d.status === 'mapped' ? '✓' :
                         d.status === 'not_found' || d.status === 'no_match' ? '–' :
                         d.status.startsWith('error') ? '✗' : '↷'}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium">{d.product}</span>
                        <span className="text-muted-foreground"> — {d.competitor}</span>
                        {d.url && (
                          <div className="truncate text-xs text-blue-600">
                            <a href={d.url} target="_blank" rel="noopener noreferrer">{d.url}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Marge Moyenne</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produits Analysés</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productsWithData}/{products.length}</div>
              <p className="text-xs text-muted-foreground">avec données concurrents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Position Prix</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{cheaperCount}</div>
              <p className="text-xs text-muted-foreground">produits moins chers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunités</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expensiveCount}</div>
              <p className="text-xs text-muted-foreground">produits à optimiser</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Répartition des Marges</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={marginRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Nombre de produits" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Position Prix vs Concurrents</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pricePositionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pricePositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Marge Moyenne par Catégorie (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="margin" fill="hsl(var(--primary))" name="Marge moyenne %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tableau détaillé */}
        <Card>
          <CardHeader>
            <CardTitle>Analyse Détaillée par Produit</CardTitle>
            <div className="flex items-center gap-2 mt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Produit</th>
                    <th className="text-left p-2">Catégorie</th>
                    <th className="text-right p-2">Prix Public</th>
                    <th className="text-right p-2">Prix Fournisseur</th>
                    <th className="text-right p-2">Marge</th>
                    <th className="text-right p-2">Moy. Concurrent</th>
                    <th className="text-right p-2">Min. Concurrent</th>
                    <th className="text-center p-2">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{product.name}</td>
                      <td className="p-2">
                        <Badge variant="outline">{product.category}</Badge>
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {product.price.toFixed(2)} €
                      </td>
                      <td className="p-2 text-right">
                        {product.supplier_price ? `${product.supplier_price.toFixed(2)} €` : '-'}
                        {product.supplier_name && (
                          <div className="text-xs text-muted-foreground">{product.supplier_name}</div>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {product.margin_percent ? (
                          <span className={product.margin_percent < 15 ? 'text-red-600' : product.margin_percent > 30 ? 'text-green-600' : ''}>
                            {product.margin_percent.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-right">
                        {product.competitor_avg_price ? `${product.competitor_avg_price.toFixed(2)} €` : '-'}
                      </td>
                      <td className="p-2 text-right">
                        {product.competitor_min_price ? `${product.competitor_min_price.toFixed(2)} €` : '-'}
                      </td>
                      <td className="p-2 text-center">
                        {product.price_position === 'cheaper' && (
                          <Badge className="bg-green-100 text-green-800">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Moins cher
                          </Badge>
                        )}
                        {product.price_position === 'expensive' && (
                          <Badge variant="destructive">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Plus cher
                          </Badge>
                        )}
                        {product.price_position === 'similar' && (
                          <Badge variant="secondary">Similaire</Badge>
                        )}
                        {product.price_position === 'no_data' && (
                          <Badge variant="outline">Pas de données</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
