import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompetitorPrices, useScrapePrices, useCompetitorStats } from "@/hooks/useCompetitorPrices";
import { useProducts } from "@/hooks/useProducts";
import { Loader2, RefreshCw, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminCompetitors = () => {
  const { products } = useProducts();
  const { data: competitorPrices, isLoading } = useCompetitorPrices();
  const { data: stats } = useCompetitorStats();
  const scrapePrices = useScrapePrices();

  const handleScrapeAll = () => {
    if (!products?.length) return;
    const productIds = products.map(p => p.id);
    scrapePrices.mutate(productIds);
  };

  // Grouper par produit
  const groupedByProduct = competitorPrices?.reduce((acc, price) => {
    if (!acc[price.product_id]) {
      acc[price.product_id] = [];
    }
    acc[price.product_id].push(price);
    return acc;
  }, {} as Record<string, typeof competitorPrices>);

  // Top 20 produits les plus compétitifs
  const topCompetitive = Object.entries(groupedByProduct || {})
    .map(([productId, prices]) => {
      const product = products?.find(p => p.id === productId);
      const avgDiff = prices.reduce((sum, p) => sum + (p.price_difference_percent || 0), 0) / prices.length;
      return { product, avgDiff, prices };
    })
    .sort((a, b) => a.avgDiff - b.avgDiff)
    .slice(0, 20);

  // Produits à réajuster (plus chers que la moyenne)
  const toAdjust = Object.entries(groupedByProduct || {})
    .map(([productId, prices]) => {
      const product = products?.find(p => p.id === productId);
      const avgDiff = prices.reduce((sum, p) => sum + (p.price_difference_percent || 0), 0) / prices.length;
      return { product, avgDiff, prices };
    })
    .filter(item => item.avgDiff > 5)
    .sort((a, b) => b.avgDiff - a.avgDiff);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analyse Concurrentielle</h1>
              <p className="text-muted-foreground">
                Suivi automatisé des prix du marché
              </p>
            </div>
            <Button 
              onClick={handleScrapeAll}
              disabled={scrapePrices.isPending}
              size="lg"
            >
              {scrapePrices.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Mettre à jour les prix</>
              )}
            </Button>
          </div>

          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {stats?.cheaperPercent || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                De nos prix inférieurs à la moyenne
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {stats?.avgDifference || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                Écart moyen avec le marché
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {stats?.totalProducts || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Produits analysés
              </p>
            </Card>
            <Card className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">
                {toAdjust.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Produits à réajuster
              </p>
            </Card>
          </div>

          {/* Top 20 produits compétitifs */}
          <Card className="mb-8">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingDown className="h-6 w-6 text-green-600" />
                Top 20 Produits Les Plus Compétitifs
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Notre Prix</TableHead>
                  <TableHead>Prix Moyen Marché</TableHead>
                  <TableHead>Écart</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  topCompetitive.map((item) => {
                    const avgMarketPrice = item.prices.reduce((sum, p) => sum + p.competitor_price, 0) / item.prices.length;
                    return (
                      <TableRow key={item.product?.id}>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell>{item.product?.price} €</TableCell>
                        <TableCell>{avgMarketPrice.toFixed(2)} €</TableCell>
                        <TableCell>
                          <span className={item.avgDiff < 0 ? "text-green-600" : "text-red-600"}>
                            {item.avgDiff.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            🟢 Très compétitif
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Produits à réajuster */}
          {toAdjust.length > 0 && (
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  Produits à Réajuster
                </h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Notre Prix</TableHead>
                    <TableHead>Prix Moyen Marché</TableHead>
                    <TableHead>Écart</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toAdjust.map((item) => {
                    const avgMarketPrice = item.prices.reduce((sum, p) => sum + p.competitor_price, 0) / item.prices.length;
                    return (
                      <TableRow key={item.product?.id}>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell>{item.product?.price} €</TableCell>
                        <TableCell>{avgMarketPrice.toFixed(2)} €</TableCell>
                        <TableCell>
                          <span className="text-red-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            +{item.avgDiff.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Ajuster le prix
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminCompetitors;
