import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { usePriceEvolution, useCompetitorPriceEvolution, useMarginEvolution, usePriceEvolutionStats } from "@/hooks/usePriceEvolution";

export default function AdminPriceEvolution() {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  const { products } = useProducts();
  const { data: priceHistory, isLoading: priceLoading } = usePriceEvolution(selectedProductId || undefined);
  const { data: competitorHistory, isLoading: competitorLoading } = useCompetitorPriceEvolution(selectedProductId);
  const { data: marginHistory, isLoading: marginLoading } = useMarginEvolution(selectedProductId || undefined);
  const { data: stats } = usePriceEvolutionStats();

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Récupérer les noms des concurrents pour les légendes
  const competitorNames = competitorHistory && competitorHistory.length > 0
    ? Object.keys(competitorHistory[0]).filter(key => key !== 'date')
    : [];

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Évolution des prix et marges</h1>
          <p className="text-muted-foreground">
            Analysez l'historique des prix et comparez avec la concurrence
          </p>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustements totaux</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAdjustments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variation moy. prix</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgPriceChange ? `${parseFloat(stats.avgPriceChange) > 0 ? '+' : ''}${stats.avgPriceChange}%` : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hausses de prix</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.priceIncreases || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baisses de prix</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.priceDecreases || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sélection de produit */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un produit</CardTitle>
          <CardDescription>
            Visualisez l'évolution détaillée des prix et marges pour un produit spécifique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un produit..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} - {product.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProductId && (
        <>
          {/* Évolution des prix */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution du prix - {selectedProduct?.name}</CardTitle>
              <CardDescription>
                Historique des ajustements de prix appliqués
              </CardDescription>
            </CardHeader>
            <CardContent>
              {priceLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : !priceHistory || priceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun historique de prix disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      name="Prix HT (€)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Évolution des marges */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution de la marge - {selectedProduct?.name}</CardTitle>
              <CardDescription>
                Historique des marges après ajustements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marginLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : !marginHistory || marginHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun historique de marge disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={marginHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="margin" 
                      stroke="hsl(var(--accent))" 
                      name="Marge (%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Comparaison avec les concurrents */}
          <Card>
            <CardHeader>
              <CardTitle>Comparaison avec les concurrents - {selectedProduct?.name}</CardTitle>
              <CardDescription>
                Évolution des prix concurrents dans le temps
              </CardDescription>
            </CardHeader>
            <CardContent>
              {competitorLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : !competitorHistory || competitorHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun historique de prix concurrent disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={competitorHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {competitorNames.map((name, index) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={colors[index % colors.length]}
                        name={name}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedProductId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              Sélectionnez un produit pour visualiser les graphiques d'évolution détaillés
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
