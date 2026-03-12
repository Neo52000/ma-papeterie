import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useEnrichMissingData } from "@/hooks/useCrawlJobs";

const FIELD_LABELS: Record<string, string> = {
  image: "Image",
  description: "Description",
  weight: "Poids",
  dimensions: "Dimensions",
  brand: "Marque",
  ean: "EAN",
  price: "Prix",
  category: "Catégorie",
  color: "Couleur",
};

const FIELD_COLORS: Record<string, string> = {
  image: "bg-blue-100 text-blue-800",
  description: "bg-purple-100 text-purple-800",
  weight: "bg-orange-100 text-orange-800",
  dimensions: "bg-green-100 text-green-800",
  brand: "bg-pink-100 text-pink-800",
  ean: "bg-yellow-100 text-yellow-800",
  price: "bg-red-100 text-red-800",
  category: "bg-indigo-100 text-indigo-800",
  color: "bg-teal-100 text-teal-800",
};

export function MissingDataPanel() {
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "image", "description", "weight", "dimensions",
  ]);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useEnrichMissingData(
    selectedFields,
    limit,
    page * limit,
    selectedFields.length > 0,
  );

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
    setPage(0);
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Produits incomplets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field filters */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Filtrer par champ manquant :</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={selectedFields.includes(key)}
                  onCheckedChange={() => toggleField(key)}
                />
                <span className="text-sm">{label}</span>
                {data?.stats[key] !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {data.stats[key]}
                  </Badge>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Stats summary */}
        {data?.stats && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Object.entries(data.stats)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([field, count]) => (
                <div key={field} className="text-center p-2 rounded-md bg-muted/50">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">sans {FIELD_LABELS[field] || field}</div>
                </div>
              ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md">
            {(error as Error).message}
          </div>
        )}

        {/* Product list */}
        {data?.products && data.products.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {data.total} produit{data.total > 1 ? "s" : ""} avec données manquantes
            </p>
            <div className="divide-y">
              {data.products.map((product) => (
                <div key={product.id} className="py-2 flex items-center gap-3">
                  {/* Image thumbnail or placeholder */}
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">?</span>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{product.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {product.ean && (
                        <span className="text-xs text-muted-foreground font-mono">{product.ean}</span>
                      )}
                      {product.brand && (
                        <Badge variant="outline" className="text-xs py-0">
                          {product.brand}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Completeness */}
                  <div className="flex-shrink-0 w-20">
                    <Progress value={product.completeness} className="h-1.5" />
                    <span className="text-xs text-muted-foreground">{product.completeness}%</span>
                  </div>

                  {/* Missing fields */}
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {product.missing_fields.slice(0, 4).map((field) => (
                      <Badge
                        key={field}
                        className={`text-xs py-0 ${FIELD_COLORS[field] || "bg-gray-100 text-gray-800"}`}
                      >
                        {FIELD_LABELS[field] || field}
                      </Badge>
                    ))}
                    {product.missing_fields.length > 4 && (
                      <Badge variant="secondary" className="text-xs py-0">
                        +{product.missing_fields.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {data?.products && data.products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Tous les produits actifs sont complets pour les champs sélectionnés.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
