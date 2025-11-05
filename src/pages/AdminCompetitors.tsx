import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useScrapePrices, useCompetitorStats } from "@/hooks/useCompetitorPrices";
import { RefreshCw, TrendingUp, TrendingDown, Search, DollarSign, Package } from "lucide-react";
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
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const scrapePrices = useScrapePrices();
  const { data: competitorStats } = useCompetitorStats();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin && !isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchAnalysis();
  }, [user, isAdmin, isSuperAdmin, navigate]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les produits avec leurs fournisseurs préférés
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

      // Récupérer les prix concurrents pour tous les produits
      const { data: competitorData, error: competitorError } = await supabase
        .from('competitor_prices')
        .select('product_id, competitor_price, scraped_at')
        .order('scraped_at', { ascending: false });

      if (competitorError) throw competitorError;

      // Grouper les prix concurrents par produit (garder les plus récents)
      const competitorByProduct = new Map<string, number[]>();
      competitorData?.forEach(comp => {
        if (!competitorByProduct.has(comp.product_id)) {
          competitorByProduct.set(comp.product_id, []);
        }
        competitorByProduct.get(comp.product_id)!.push(Number(comp.competitor_price));
      });

      // Construire l'analyse
      const analysis: ProductAnalysis[] = productsData?.map(product => {
        const supplierProduct = product.supplier_products[0];
        const competitorPrices = competitorByProduct.get(product.id) || [];
        
        const avgCompPrice = competitorPrices.length > 0
          ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
          : null;
        
        const minCompPrice = competitorPrices.length > 0
          ? Math.min(...competitorPrices)
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

  // Statistiques globales
  const avgMargin = products.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / (products.length || 1);
  const productsWithData = products.filter(p => p.competitor_avg_price !== null).length;
  const cheaperCount = products.filter(p => p.price_position === 'cheaper').length;
  const expensiveCount = products.filter(p => p.price_position === 'expensive').length;

  // Données pour graphique de répartition des marges
  const marginRanges = [
    { range: '< 10%', count: products.filter(p => (p.margin_percent || 0) < 10).length },
    { range: '10-20%', count: products.filter(p => (p.margin_percent || 0) >= 10 && (p.margin_percent || 0) < 20).length },
    { range: '20-30%', count: products.filter(p => (p.margin_percent || 0) >= 20 && (p.margin_percent || 0) < 30).length },
    { range: '30-40%', count: products.filter(p => (p.margin_percent || 0) >= 30 && (p.margin_percent || 0) < 40).length },
    { range: '> 40%', count: products.filter(p => (p.margin_percent || 0) >= 40).length },
  ];

  // Données pour graphique de position prix
  const pricePositionData = [
    { name: 'Moins chers', value: cheaperCount, color: '#22c55e' },
    { name: 'Similaires', value: products.filter(p => p.price_position === 'similar').length, color: '#eab308' },
    { name: 'Plus chers', value: expensiveCount, color: '#ef4444' },
    { name: 'Sans données', value: products.filter(p => p.price_position === 'no_data').length, color: '#94a3b8' },
  ];

  // Top 10 marges par catégorie
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
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analyse Concurrentielle & Marges</h1>
          <Button onClick={handleRefreshAll} disabled={scrapePrices.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${scrapePrices.isPending ? 'animate-spin' : ''}`} />
            Actualiser tous les prix
          </Button>
        </div>

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
      </main>
      <Footer />
    </div>
  );
}
