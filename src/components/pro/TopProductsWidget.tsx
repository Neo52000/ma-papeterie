import { Link } from 'react-router-dom';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TopProduct {
  product_id: string;
  product_name: string;
  total_qty: number;
}

interface TopProductsWidgetProps {
  products: TopProduct[] | undefined;
  isLoading: boolean;
}

export function TopProductsWidget({ products, isLoading }: TopProductsWidgetProps) {
  const top5 = products?.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Produits les plus commandés
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/pro/reassort">Voir tout</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-muted rounded-lg" />
            ))}
          </div>
        ) : top5.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <TrendingUp className="h-6 w-6 opacity-50" />
            <p className="text-sm">Aucune donnée sur les 90 derniers jours</p>
          </div>
        ) : (
          <div className="space-y-1">
            {top5.map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium truncate">{product.product_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {product.total_qty} unités
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <Link to={`/produit/${product.product_id}`} title="Voir le produit">
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
