import { useState, memo } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, ShoppingBag, Backpack, Shield,
  Phone, Search, ShoppingCart, ChevronLeft, ChevronRight,
  Eye, X, Package
} from "lucide-react";
import { useMaroquinerieProducts } from "@/hooks/useMaroquinerieProducts";
import { FlipbookViewer } from "@/components/emballage/FlipbookViewer";
import { useCart } from "@/stores/mainCartStore";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import { toast } from "sonner";

const CATEGORY_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Bagagerie & Maroquinerie", value: "BAGAGERIE ET MAROQUINERIE" },
  { label: "Bagagerie", value: "BAGAGERIE" },
];

const PRICE_RANGES = [
  { label: "Tous les prix", value: "all" },
  { label: "0€ – 10€", value: "0-10", min: 0, max: 10 },
  { label: "10€ – 25€", value: "10-25", min: 10, max: 25 },
  { label: "25€ – 50€", value: "25-50", min: 25, max: 50 },
  { label: "50€ – 100€", value: "50-100", min: 50, max: 100 },
  { label: "100€ et +", value: "100+", min: 100, max: 99999 },
];

const ProductGrid = memo(function ProductGrid() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "price_asc" | "price_desc" | "newest">("name");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { mode: priceMode } = usePriceModeStore();

  const priceFilter = PRICE_RANGES.find((r) => r.value === priceRange);
  const priceRangeObj = priceFilter && "min" in priceFilter ? { min: priceFilter.min!, max: priceFilter.max! } : null;

  const { data, isLoading } = useMaroquinerieProducts({
    page,
    search: search || undefined,
    typeFilter: categoryFilter as any,
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
    setCategoryFilter("all");
    setPriceRange("all");
    setSortBy("name");
    setPage(1);
  }

  const hasFilters = search || categoryFilter !== "all" || priceRange !== "all";

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
          {CATEGORY_FILTERS.map((f) => (
            <Badge
              key={f.value}
              variant={categoryFilter === f.value ? "default" : "outline"}
              className="cursor-pointer text-sm px-4 py-1.5 hover:bg-primary/10 transition-colors"
              onClick={() => { setCategoryFilter(f.value); setPage(1); }}
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
                placeholder="Rechercher un produit..."
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

const MaroquinerieBagagerie = () => {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Maroquinerie, Bagagerie & Accessoires — Ma Papeterie Chaumont",
    "description": "Plus de 860 articles de maroquinerie, bagagerie et accessoires : sacs, cartables, trousses, porte-documents, valises. Livraison rapide.",
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
    "serviceType": "Maroquinerie et bagagerie",
  };

  return (
    <>
      <Helmet>
        <title>Maroquinerie, Bagagerie & Accessoires | Ma Papeterie Chaumont</title>
        <meta
          name="description"
          content="Découvrez notre sélection de maroquinerie et bagagerie : sacs à dos, cartables, trousses, porte-documents, sacoches, valises. Plus de 860 références à Chaumont."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://ma-papeterie.fr/maroquinerie-bagagerie-accessoires" />
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
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  860+ références
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Maroquinerie, Bagagerie & Accessoires
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Sacs à dos, cartables, trousses, porte-documents, sacoches et valises —
                  tout pour le bureau, l'école et les déplacements professionnels.
                </p>
              </div>
            </div>
          </section>

          {/* Avantages */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <ShoppingBag className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Large choix</h3>
                  <p className="text-sm text-muted-foreground">Plus de 860 articles</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Backpack className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Scolaire & Pro</h3>
                  <p className="text-sm text-muted-foreground">Cartables, sacs, sacoches</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Marques fiables</h3>
                  <p className="text-sm text-muted-foreground">Qualité garantie</p>
                </Card>
                <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                  <Briefcase className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Pro & Éducation</h3>
                  <p className="text-sm text-muted-foreground">Tarifs B2B disponibles</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Catalogue Flipbook */}
          <section id="catalogue-flipbook" className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Feuilletez notre catalogue Antartik
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Découvrez notre sélection maroquinerie et accessoires dans notre catalogue interactif.
                </p>
              </div>
              <div className="max-w-4xl mx-auto">
                <FlipbookViewer
                  pdfUrl="https://mgojmkzovqgpipybelrr.supabase.co/storage/v1/object/public/catalogues/Catalogue%20Maroquinerie%20et%20Accessoires%20Antartik.pdf"
                  title="Catalogue Maroquinerie et Accessoires Antartik"
                />
              </div>
            </div>
          </section>

          {/* Grille Produits */}
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  Nos articles de maroquinerie et bagagerie
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Parcourez notre sélection complète, filtrez par catégorie et ajoutez directement au panier.
                </p>
              </div>
              <ProductGrid />
            </div>
          </section>

          {/* CTA B2B */}
          <section className="py-12 md:py-16 bg-primary text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-90" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Besoin de fournitures pour votre école ou entreprise ?
                </h2>
                <p className="text-lg mb-8 opacity-90">
                  Cartables, sacs, trousses en quantité — tarifs dégressifs et accompagnement personnalisé.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <a href="/contact">
                      <Phone className="h-4 w-4 mr-2" />
                      Demander un devis
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <a href="/catalogue?category=BAGAGERIE%20ET%20MAROQUINERIE">
                      Voir dans le catalogue
                    </a>
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

export default MaroquinerieBagagerie;
