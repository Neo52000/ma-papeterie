import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useLatestCompetitorPrices, useScrapePrices } from "@/hooks/useCompetitorPrices";
import { Skeleton } from "@/components/ui/skeleton";

interface CompetitorPricesProps {
  productId: string;
  currentPrice: number;
}

export function CompetitorPrices({ productId, currentPrice }: CompetitorPricesProps) {
  const { data: competitorPrices, isLoading } = useLatestCompetitorPrices(productId);
  const scrapePrices = useScrapePrices();

  const handleRefresh = () => {
    scrapePrices.mutate([productId]);
  };

  const getPriceDifferenceColor = (difference: number | null) => {
    if (!difference) return "text-muted-foreground";
    return difference > 0 ? "text-green-600" : "text-red-600";
  };

  const getPriceDifferenceIcon = (difference: number | null) => {
    if (!difference) return null;
    return difference > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prix concurrents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Prix concurrents</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={scrapePrices.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scrapePrices.isPending ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!competitorPrices || competitorPrices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucune donnée concurrentielle disponible</p>
            <Button onClick={handleRefresh} disabled={scrapePrices.isPending}>
              Lancer l'analyse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitorPrices.map((competitor) => (
              <div
                key={competitor.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{competitor.competitor_name}</h4>
                      {competitor.competitor_url && (
                        <a
                          href={competitor.competitor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Prix concurrent:</span>
                        <p className="font-semibold text-lg">
                          {Number(competitor.competitor_price).toFixed(2)} €
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">Notre prix:</span>
                        <p className="font-semibold text-lg">{currentPrice.toFixed(2)} €</p>
                      </div>
                      
                      {competitor.price_difference !== null && (
                        <div>
                          <span className="text-muted-foreground">Différence:</span>
                          <p
                            className={`font-semibold text-lg flex items-center gap-1 ${getPriceDifferenceColor(
                              competitor.price_difference
                            )}`}
                          >
                            {getPriceDifferenceIcon(competitor.price_difference)}
                            {Number(competitor.price_difference).toFixed(2)} €
                            {competitor.price_difference_percent && (
                              <span className="text-sm">
                                ({Number(competitor.price_difference_percent).toFixed(1)}%)
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {competitor.price_difference !== null && (
                      <div className="mt-2">
                        {Number(competitor.price_difference) > 0 ? (
                          <Badge className="bg-green-100 text-green-800">
                            Nous sommes moins chers
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Concurrent moins cher
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {competitor.scraped_at && (
                  <p className="text-xs text-muted-foreground">
                    Dernière mise à jour: {new Date(competitor.scraped_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
