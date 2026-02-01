import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ExternalLink, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { useProductBestPrices, useProductPriceSnapshots } from '@/hooks/usePriceComparison';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

interface CompetitorPricesBlockProps {
  productId: string;
  ourPrice: number;
  packSizes?: number[];
}

export function CompetitorPricesBlock({ 
  productId, 
  ourPrice, 
  packSizes = [1] 
}: CompetitorPricesBlockProps) {
  const [selectedPackSize, setSelectedPackSize] = useState<number>(packSizes[0] || 1);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: bestPrices, isLoading: loadingBest } = useProductBestPrices(productId);
  const { data: snapshots, isLoading: loadingSnapshots } = useProductPriceSnapshots(productId, selectedPackSize);

  // Filtrer pour le pack size sélectionné
  const currentBestPrice = bestPrices?.find(p => p.pack_size === selectedPackSize);

  // Grouper les snapshots par concurrent (garder le plus récent)
  const latestByCompetitor = snapshots?.reduce((acc, snapshot) => {
    const existingIndex = acc.findIndex(s => s.competitor_id === snapshot.competitor_id);
    if (existingIndex === -1) {
      acc.push(snapshot);
    }
    return acc;
  }, [] as typeof snapshots) || [];

  // Calculer le temps depuis la dernière mise à jour
  const lastUpdate = currentBestPrice?.updated_at 
    ? formatDistanceToNow(new Date(currentBestPrice.updated_at), { 
        addSuffix: true, 
        locale: fr 
      })
    : null;

  // Calcul de la différence de prix
  const priceDifference = currentBestPrice?.best_price 
    ? ourPrice - currentBestPrice.best_price 
    : null;
  const percentDifference = priceDifference && currentBestPrice?.best_price
    ? (priceDifference / currentBestPrice.best_price) * 100
    : null;

  if (loadingBest) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Prix concurrents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Pas de données
  if (!bestPrices || bestPrices.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Prix concurrents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Aucune donnée de prix concurrent disponible</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Prix concurrents
          </CardTitle>
          
          {/* Toggle pack sizes si plusieurs */}
          {packSizes.length > 1 && (
            <ToggleGroup 
              type="single" 
              value={String(selectedPackSize)}
              onValueChange={(value) => value && setSelectedPackSize(parseInt(value))}
              size="sm"
            >
              {packSizes.map(size => (
                <ToggleGroupItem key={size} value={String(size)} className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  {size === 1 ? 'Unité' : `x${size}`}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Meilleur prix concurrent */}
        {currentBestPrice?.best_price && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Meilleur prix relevé</span>
              {lastUpdate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastUpdate}
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">
                {currentBestPrice.best_price.toFixed(2)} €
              </span>
              
              {currentBestPrice.competitor && (
                <span className="text-sm text-muted-foreground">
                  chez {currentBestPrice.competitor.name}
                </span>
              )}
            </div>

            {/* Comparaison avec notre prix */}
            {priceDifference !== null && (
              <div className="mt-3 flex items-center gap-2">
                {priceDifference > 0 ? (
                  <>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Nous sommes {Math.abs(priceDifference).toFixed(2)}€ plus cher
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      (+{percentDifference?.toFixed(1)}%)
                    </span>
                  </>
                ) : priceDifference < 0 ? (
                  <>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Nous sommes {Math.abs(priceDifference).toFixed(2)}€ moins cher
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({percentDifference?.toFixed(1)}%)
                    </span>
                  </>
                ) : (
                  <Badge variant="secondary">Prix identique</Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Liste des offres (collapsible) */}
        {latestByCompetitor.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="text-sm font-medium">
                  Voir toutes les offres ({latestByCompetitor.length})
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-3 space-y-2">
              {loadingSnapshots ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                latestByCompetitor.map((snapshot) => {
                  const diff = ourPrice - snapshot.price;
                  const isOursCheaper = diff < 0;
                  
                  return (
                    <div 
                      key={snapshot.id}
                      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {snapshot.competitor?.name || 'Concurrent'}
                            </span>
                            {snapshot.source_url && (
                              <a
                                href={snapshot.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Relevé {formatDistanceToNow(new Date(snapshot.scraped_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-lg font-semibold">
                            {snapshot.price.toFixed(2)} €
                          </span>
                          <div className={`text-xs ${isOursCheaper ? 'text-blue-600' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)} €
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Mention légale */}
        <p className="text-xs text-muted-foreground text-center border-t pt-3">
          Prix relevés automatiquement – susceptibles d'évoluer
        </p>
      </CardContent>
    </Card>
  );
}
