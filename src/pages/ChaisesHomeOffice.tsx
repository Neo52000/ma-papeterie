import { useState, memo } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import {
  Armchair, Truck, BadgePercent, Wrench,
  Phone, Search, ShoppingCart, ChevronLeft, ChevronRight,
  Eye, X, Package
} from "lucide-react";
import { useChaisesProducts } from "@/hooks/useChaisesProducts";
import { useCart } from "@/contexts/CartContext";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import { FlipbookViewer } from "@/components/emballage/FlipbookViewer";
import { toast } from "sonner";

const SUBCATEGORY_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Sièges", value: "SIEGES" },
  { label: "Ergonomie", value: "ERGONOMIE" },
];

const PRICE_RANGES = [
  { label: "Tous les prix", value: "all" },
  { label: "0€ – 100€", value: "0-100", min: 0, max: 100 },
  { label: "100€ – 250€", value: "100-250", min: 100, max: 250 },
  { label: "250€ – 500€", value: "250-500", min: 250, max: 500 },
  { label: "500€ et +", value: "500+", min: 500, max: 99999 },
];

const ProductGrid = memo(function ProductGrid() {
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

  const { data, isLoading } = useChaisesProducts({
    page,
    search: search || undefined,
    subcategoryFilter,
    priceRange: priceRangeObj,
    sortBy,
  });

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
    } as any);
    toast.success(`${product.name} ajouté au panier`);
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {SUBCATEGORY_FILTERS.map((f) => (
            <Badge
              key={f.value}
              variant={subcategoryFilter === f.value ? "default" : "outline"}
              className="cursor-pointer text-sm px-4 py-1.5 hover:bg-primary/10 transition-colors"
              onClick={() => { setSubcategoryFilter(f.value); setPage(1); }}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher un siège, fauteuil..."
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">Chercher</Button>
          </form>

          <Select value={priceRange} onValueChange={(v) => { setPriceRange(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prix" />
            </SelectTrigger>
            <SelectContent>
              {PRICE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
            const displayPrice = getPriceValue((product as any).price_ht ?? null, (product as any).price_ttc ?? (product as any).price ?? null, priceMode);
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
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {selectedProductId && (
        <ProductDetailModal
          product={{ id: selectedProductId } as any}
          isOpen={!!selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
});

const ChaisesHomeOffice = () => {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Chaises Home & Office — Ma Papeterie Chaumont",
    "description": "Plus de 400 sièges de bureau, fauteuils ergonomiques et chaises pour la maison et le bureau. Livraison et montage disponibles à Chaumont.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Ma Papeterie",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Chaumont",
        "addressRegion": "Haute-Marne",
        "postalCode": "52000",
        "addressCountry": "FR",
      },
    },
    "serviceType": "Mobilier de bureau et sièges ergonomiques",
  };

  return (
    <>
      <Helmet>
        <title>Chaises Home & Office — Sièges et fauteuils de bureau | Ma Papeterie Chaumont</title>
        <meta
          name="description"
          content="Découvrez nos chaises et fauteuils pour la maison et le bureau : sièges ergonomiques, fauteuils de direction, chaises visiteurs. Plus de 400 références à Chaumont."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/chaises-home-office" />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <main id="main-content">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <Badge variant="secondary" className="mb-4 text-sm">
                  <Armchair className="h-3.5 w-3.5 mr-1.5" />
                  400+ références
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Chaises Home & Office
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Fauteuils de direction, sièges ergonomiques, chaises de bureau et visiteurs —
                  le confort au quotidien pour la maison et le bureau.
                </p>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Armchair className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Large gamme</h3>
                  <p className="text-sm text-muted-foreground">Sièges, fauteuils, ergonomie</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Wrench className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Ergonomie certifiée</h3>
                  <p className="text-sm text-muted-foreground">Confort et santé au travail</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Truck className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Livraison & montage</h3>
                  <p className="text-sm text-muted-foreground">Service disponible à Chaumont</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <BadgePercent className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Prix pro</h3>
                  <p className="text-sm text-muted-foreground">Tarifs dégressifs B2B</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Catalogue Flipbook */}
          <section id="catalogue-flipbook" className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Feuilletez notre catalogue Home & Office
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Découvrez notre gamme complète de sièges et fauteuils dans notre catalogue interactif 2025-2026.
                </p>
              </div>
              <div className="max-w-4xl mx-auto">
                <FlipbookViewer
                  pdfUrl="https://mgojmkzovqgpipybelrr.supabase.co/storage/v1/object/public/catalogues/Catalogue%20Chaises%20Home%20%26%20Office%202025-2026.pdf"
                  title="Catalogue Chaises Home & Office 2025-2026"
                />
              </div>
            </div>
          </section>

          {/* Grille Produits */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Nos sièges et fauteuils
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre sélection, filtrez par catégorie et ajoutez directement au panier.
                </p>
              </div>
              <ProductGrid />
            </div>
          </section>

          {/* CTA B2B */}
          <section className="py-12 md:py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Armchair className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Aménagement de bureaux sur mesure ?
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Équipez vos locaux avec nos solutions de mobilier professionnel. Devis gratuit, livraison et montage inclus.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link to="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Demander un devis
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link to="/leasing-mobilier-bureau">
                      Leasing mobilier
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ChaisesHomeOffice;
