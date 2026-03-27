import { useState, memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, ChevronLeft, ChevronRight, Eye, X, Package } from "lucide-react";
import { useEmballageProducts, useEmballageBrands } from "@/hooks/useEmballageProducts";
import { useCart } from "@/contexts/CartContext";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import { toast } from "sonner";

const SUBCATEGORY_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Emballage", value: "EMBALLAGE" },
  { label: "Expédition", value: "EMBALLAGE EXPEDITION" },
  { label: "Adhésifs", value: "ADHESIFS D'EMBALLAGE" },
];

const PRICE_RANGES = [
  { label: "Tous les prix", value: "all" },
  { label: "0€ – 5€", value: "0-5", min: 0, max: 5 },
  { label: "5€ – 10€", value: "5-10", min: 5, max: 10 },
  { label: "10€ – 20€", value: "10-20", min: 10, max: 20 },
  { label: "20€ – 50€", value: "20-50", min: 20, max: 50 },
  { label: "50€ et +", value: "50+", min: 50, max: 99999 },
];

export const EmballageProductGrid = memo(function EmballageProductGrid() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc" | "newest">("name");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { mode: priceMode } = usePriceModeStore();

  const priceFilter = PRICE_RANGES.find((r) => r.value === priceRange);
  const priceRangeObj = priceFilter && "min" in priceFilter ? { min: priceFilter.min!, max: priceFilter.max! } : null;

  const { data, isLoading } = useEmballageProducts({
    page,
    search: search || undefined,
    subcategoryFilter,
    priceRange: priceRangeObj,
    sortBy,
  });

  useEmballageBrands();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSearchInput("");
    setSubcategoryFilter("all");
    setPriceRange("all");
    setSortBy("name");
    setPage(1);
  }

  const hasFilters = search || subcategoryFilter !== "all" || priceRange !== "all";

  function handleAddToCart(product: any) {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || "/placeholder.svg",
      category: product.category || '',
      stock_quantity: product.stock_quantity ?? 0,
    });
    toast.success(`${product.name} ajouté au panier`);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Subcategory badges */}
        <div className="flex flex-wrap gap-2">
          {SUBCATEGORY_FILTERS.map((f) => (
            <Badge
              key={f.value}
              variant={subcategoryFilter === f.value ? "default" : "outline"}
              className="cursor-pointer text-sm px-4 py-1.5 hover:bg-primary/10 transition-colors"
              onClick={() => {
                setSubcategoryFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un produit..."
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">
              Chercher
            </Button>
          </form>

          <Select value={priceRange} onValueChange={(v) => { setPriceRange(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prix" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom (A→Z)</SelectItem>
              <SelectItem value="price_asc">Prix croissant</SelectItem>
              <SelectItem value="price_desc">Prix décroissant</SelectItem>
              <SelectItem value="newest">Nouveautés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {data?.total ?? 0} produit{(data?.total ?? 0) > 1 ? "s" : ""} trouvé{(data?.total ?? 0) > 1 ? "s" : ""}
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Réinitialiser
            </Button>
          </div>
        )}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-[300px]" />
          ))}
        </div>
      ) : data && data.products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.products.map((product) => {
            const displayPrice = getPriceValue(product.price_ht ?? null, product.price ?? null, priceMode);
            return (
              <div
                key={product.id}
                className="group bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-square bg-muted/30">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  {product.badge && (
                    <Badge className="absolute top-2 left-2 text-xs">{product.badge}</Badge>
                  )}
                  {product.eco && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-green-100 text-green-800">
                      Éco
                    </Badge>
                  )}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 space-y-2">
                  {product.brand && (
                    <span className="text-xs text-muted-foreground uppercase">{product.brand}</span>
                  )}
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-primary">
                        {displayPrice.toFixed(2)}€
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{priceLabel(priceMode)}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock_quantity !== null && product.stock_quantity <= 0}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                  {product.stock_quantity !== null && product.stock_quantity <= 0 && (
                    <span className="text-xs text-destructive">Rupture de stock</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Aucun produit trouvé</p>
          {hasFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductId && (
        <ProductDetailModal
          product={data?.products.find(p => p.id === selectedProductId) as any ?? null}
          isOpen={!!selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
});
