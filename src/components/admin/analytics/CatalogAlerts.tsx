import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { useCatalogueAlerts } from "@/hooks/useCatalogueAlerts";
import type { CatalogueProduct } from "@/types/analytics";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n)
    : "—";

function alertBadgeVariant(count: number): "destructive" | "secondary" | "outline" {
  if (count > 10) return "destructive";
  if (count > 0) return "secondary";
  return "outline";
}

// ── Product List ─────────────────────────────────────────────────────────────

function ProductAlertList({
  products,
  showStock,
  showPrice,
}: {
  products: CatalogueProduct[];
  showStock?: boolean;
  showPrice?: boolean;
}) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm">Aucune alerte sur ce point</span>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-2">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{product.name}</p>
            <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
              {showStock && (
                <span>Stock : {product.stock_quantity ?? 0}</span>
              )}
              {showPrice && product.price_ttc != null && (
                <span>Prix TTC : {fmtPrice(product.price_ttc)}</span>
              )}
            </div>
          </div>
          <a
            href={`/admin/produits/${product.slug ?? product.id}`}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline whitespace-nowrap ml-3"
          >
            Voir fiche
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ))}
    </div>
  );
}

// ── Widget ───────────────────────────────────────────────────────────────────

export default function CatalogAlerts() {
  const { data, isLoading, error, refetch } = useCatalogueAlerts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const tabs = [
    {
      value: "ruptures",
      label: "Ruptures",
      count: data?.stats.ruptures ?? 0,
      products: data?.ruptures ?? [],
      showStock: true,
      showPrice: true,
    },
    {
      value: "stock_bas",
      label: "Stock bas",
      count: data?.stats.stock_bas ?? 0,
      products: data?.stock_bas ?? [],
      showStock: true,
      showPrice: true,
    },
    {
      value: "sans_image",
      label: "Sans image",
      count: data?.stats.sans_image ?? 0,
      products: data?.sans_image ?? [],
      showStock: false,
      showPrice: false,
    },
    {
      value: "sans_description",
      label: "Sans description",
      count: data?.stats.sans_description ?? 0,
      products: data?.sans_description ?? [],
      showStock: false,
      showPrice: false,
    },
  ];

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold">Alertes Catalogue</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          aria-label="Actualiser les alertes catalogue"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4" role="status" aria-label="Chargement des alertes catalogue">
          <div className="flex gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            aria-label="Réessayer le chargement"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Data */}
      {!isLoading && !error && data && (
        <div className="space-y-4">
          {/* Stats résumé */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="font-normal">
              Total actifs : {data.stats.actifs}
            </Badge>
            <Badge variant={data.stats.ruptures > 0 ? "destructive" : "outline"} className="font-normal">
              Ruptures : {data.stats.ruptures}
            </Badge>
            <Badge variant={data.stats.stock_bas > 0 ? "secondary" : "outline"} className="font-normal">
              Stock bas : {data.stats.stock_bas}
            </Badge>
            <Badge variant={data.stats.sans_image > 0 ? "secondary" : "outline"} className="font-normal">
              Sans image : {data.stats.sans_image}
            </Badge>
            <Badge variant={data.stats.sans_description > 0 ? "secondary" : "outline"} className="font-normal">
              Sans description : {data.stats.sans_description}
            </Badge>
          </div>

          {/* Onglets */}
          <Tabs defaultValue="ruptures">
            <TabsList className="h-auto flex-wrap">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
                  {tab.label}
                  <Badge
                    variant={alertBadgeVariant(tab.count)}
                    className="ml-1 text-[10px] px-1.5 py-0 h-4 min-w-4 justify-center"
                  >
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-3">
                <ProductAlertList
                  products={tab.products}
                  showStock={tab.showStock}
                  showPrice={tab.showPrice}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
