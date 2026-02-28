import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, ShoppingCart, Filter, Star, Truck, Shield, Clock, X, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  badge: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  brand: string | null;
}

interface CategoryOption {
  slug: string;
  name: string;
  level: string;
  parent_id: string | null;
  id: string;
}

const SORT_OPTIONS = [
  { value: "name", label: "Nom A → Z" },
  { value: "name-desc", label: "Nom Z → A" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "newest", label: "Nouveautés" },
];

const Shop = () => {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [showEcoOnly, setShowEcoOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name, level, parent_id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Build hierarchical category options
  const categoryTree = useMemo(() => {
    const families = categories.filter(c => c.level === "famille");
    const subFamilies = categories.filter(c => c.level === "sous_famille");
    const cats = categories.filter(c => c.level === "categorie");
    const subCats = categories.filter(c => c.level === "sous_categorie");

    const options: { value: string; label: string; depth: number }[] = [];

    families.forEach(fam => {
      options.push({ value: fam.slug, label: fam.name, depth: 0 });
      const children = subFamilies.filter(sf => sf.parent_id === fam.id);
      children.forEach(sf => {
        options.push({ value: sf.slug, label: sf.name, depth: 1 });
        const grandChildren = cats.filter(c => c.parent_id === sf.id);
        grandChildren.forEach(c => {
          options.push({ value: c.slug, label: c.name, depth: 2 });
          const greatGrandChildren = subCats.filter(sc => sc.parent_id === c.id);
          greatGrandChildren.forEach(sc => {
            options.push({ value: sc.slug, label: sc.name, depth: 3 });
          });
        });
      });
    });

    // Also add categories that have no parent (orphans at categorie level)
    const usedIds = new Set([
      ...families.map(f => f.id),
      ...subFamilies.map(sf => sf.id),
      ...cats.filter(c => c.parent_id && categories.some(p => p.id === c.parent_id)).map(c => c.id),
      ...subCats.filter(sc => sc.parent_id && categories.some(p => p.id === sc.parent_id)).map(sc => sc.id),
    ]);
    const orphans = categories.filter(c => !usedIds.has(c.id) && !options.some(o => o.value === c.slug));
    orphans.forEach(o => options.push({ value: o.slug, label: o.name, depth: 0 }));

    return options;
  }, [categories]);

  // Fetch products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("products")
          .select("id, name, description, category, price, price_ttc, image_url, badge, eco, stock_quantity, is_active, brand")
          .eq("is_active", true)
          .order("name", { ascending: true })
          .limit(300);

        if (selectedCategory !== "all") {
          const match = categories.find(c => c.slug === selectedCategory);
          if (match) {
            query = query.ilike("category", match.name);
          }
        }

        if (searchQuery.trim()) {
          query = query.ilike("name", `%${searchQuery.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, searchQuery, categories]);

  // Sync URL
  useEffect(() => {
    if (selectedCategory === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", selectedCategory);
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedCategory]);

  // Price bounds
  const { minPrice, maxPrice } = useMemo(() => {
    if (products.length === 0) return { minPrice: 0, maxPrice: 500 };
    const prices = products.map(p => p.price_ttc ?? p.price);
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices))
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const price = p.price_ttc ?? p.price;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (showInStockOnly && (p.stock_quantity ?? 0) <= 0) return false;
      if (showEcoOnly && !p.eco) return false;
      return true;
    });
  }, [products, priceRange, showInStockOnly, showEcoOnly]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const pa = a.price_ttc ?? a.price;
      const pb = b.price_ttc ?? b.price;
      switch (sortBy) {
        case "price-asc": return pa - pb;
        case "price-desc": return pb - pa;
        case "name-desc": return b.name.localeCompare(a.name);
        case "newest": return 0;
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [filteredProducts, sortBy]);

  const handleAddToCart = (product: ShopProduct) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: (product.price_ttc ?? product.price).toFixed(2),
      image: product.image_url || "/placeholder.svg",
      category: product.category,
      stock_quantity: product.stock_quantity || 0,
    });
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setPriceRange([minPrice, maxPrice]);
    setShowInStockOnly(false);
    setShowEcoOnly(false);
    setSortBy("name");
    setSearchQuery("");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (priceRange[0] > minPrice || priceRange[1] < maxPrice) count++;
    if (showInStockOnly) count++;
    if (showEcoOnly) count++;
    return count;
  }, [selectedCategory, priceRange, showInStockOnly, showEcoOnly, minPrice, maxPrice]);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="font-medium mb-3">Catégorie</h4>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          <label className="flex items-center gap-2 cursor-pointer py-1">
            <Checkbox checked={selectedCategory === "all"} onCheckedChange={() => setSelectedCategory("all")} />
            <span className="text-sm font-medium">Toutes les catégories</span>
          </label>
          {categoryTree.map(cat => (
            <label key={cat.value} className="flex items-center gap-2 cursor-pointer py-1" style={{ paddingLeft: `${cat.depth * 16}px` }}>
              <Checkbox checked={selectedCategory === cat.value} onCheckedChange={() => setSelectedCategory(cat.value)} />
              <span className={`text-sm ${cat.depth === 0 ? "font-medium" : ""}`}>{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-medium mb-3">Prix</h4>
        <div className="px-2">
          <Slider
            value={priceRange}
            min={minPrice}
            max={maxPrice}
            step={1}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mb-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{priceRange[0]}€</span>
            <span>{priceRange[1]}€</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={showInStockOnly} onCheckedChange={(v) => setShowInStockOnly(v as boolean)} />
          <span className="text-sm">En stock uniquement</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={showEcoOnly} onCheckedChange={(v) => setShowEcoOnly(v as boolean)} />
          <span className="text-sm">🌱 Écoresponsable</span>
        </label>
      </div>

      {activeFiltersCount > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Boutique en ligne – Papeterie & fournitures de bureau | Ma Papeterie Chaumont</title>
        <meta name="description" content="Achetez en ligne vos fournitures de bureau, papeterie et matériel professionnel. Livraison rapide, paiement sécurisé. Papeterie Reine & Fils, Chaumont." />
        <link rel="canonical" href="https://ma-papeterie.fr/shop" />
        <meta property="og:title" content="Boutique en ligne – Papeterie & fournitures de bureau" />
        <meta property="og:description" content="Fournitures de bureau, papeterie et matériel professionnel en ligne. Livraison rapide depuis Chaumont." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ma-papeterie.fr/shop" />
      </Helmet>
      <Header />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Boutique Ma Papeterie Pro
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Découvrez notre sélection de papeterie premium pour professionnels et particuliers exigeants.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Reassurance Bar */}
        <section className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" />
                <span>Livraison rapide</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Service client réactif</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 text-primary" />
                <span>Qualité garantie</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters & Products */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="md:hidden relative">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtres
                      {activeFiltersCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Filtres</SheetTitle>
                      <SheetDescription>Affinez votre recherche</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {sortedProducts.length} produit{sortedProducts.length > 1 ? "s" : ""}
                    {activeFiltersCount > 0 && ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""})`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex bg-muted rounded-lg p-0.5">
                  <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-8">
              {/* Desktop Sidebar Filters */}
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-32 bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtres
                  </h3>
                  <FilterContent />
                </div>
              </aside>

              {/* Products Grid */}
              <div className="flex-1">
                {loading && (
                  <div className="flex flex-col justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Chargement des produits...</p>
                  </div>
                )}

                {!loading && sortedProducts.length === 0 && (
                  <div className="text-center py-20 bg-muted/30 rounded-2xl">
                    <div className="max-w-md mx-auto">
                      <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
                      <p className="text-muted-foreground mb-6">
                        Essayez de modifier vos filtres pour voir plus de résultats.
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  </div>
                )}

                {!loading && sortedProducts.length > 0 && viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedProducts.map((product) => {
                      const displayPrice = product.price_ttc ?? product.price;
                      return (
                        <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                          <div className="relative aspect-square overflow-hidden bg-muted/30">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute top-3 left-3 flex gap-1.5">
                              {product.badge && (
                                <Badge className={`text-xs ${
                                  product.badge === "Promo" ? "bg-destructive text-destructive-foreground" :
                                  product.badge === "Nouveau" ? "bg-primary text-primary-foreground" :
                                  "bg-accent text-accent-foreground"
                                }`}>
                                  {product.badge}
                                </Badge>
                              )}
                              {product.eco && <Badge className="text-xs bg-accent text-accent-foreground">🌱 Éco</Badge>}
                            </div>
                            {(product.stock_quantity ?? 0) <= 0 && (
                              <Badge className="absolute top-3 right-3 bg-destructive">Rupture</Badge>
                            )}
                          </div>

                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                              <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                {product.name}
                              </h3>
                              {product.brand && (
                                <p className="text-xs text-muted-foreground mb-2">{product.brand}</p>
                              )}
                            </div>

                            <div className="mt-auto">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xl font-bold text-primary">
                                  {displayPrice.toFixed(2)}€
                                </span>
                                {(product.stock_quantity ?? 0) > 0 && (
                                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    En stock
                                  </Badge>
                                )}
                              </div>

                              <Button
                                onClick={() => handleAddToCart(product)}
                                className="w-full"
                                disabled={(product.stock_quantity ?? 0) <= 0}
                              >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                {(product.stock_quantity ?? 0) > 0 ? "Ajouter au panier" : "Indisponible"}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {!loading && sortedProducts.length > 0 && viewMode === "list" && (
                  <div className="space-y-3">
                    {sortedProducts.map((product) => {
                      const displayPrice = product.price_ttc ?? product.price;
                      return (
                        <div key={product.id} className="flex gap-4 bg-card rounded-xl border border-border/50 p-4 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                          <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-24 h-24 object-cover rounded-lg shrink-0" loading="lazy" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">{product.category}</p>
                                <h3 className="font-semibold text-foreground">{product.name}</h3>
                                <div className="flex gap-1.5 mt-1">
                                  {product.badge && <Badge variant="outline" className="text-xs">{product.badge}</Badge>}
                                  {product.eco && <Badge variant="outline" className="text-xs">🌱 Éco</Badge>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-lg font-bold text-primary">{displayPrice.toFixed(2)}€</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-sm text-muted-foreground">{product.stock_quantity ?? 0} en stock</span>
                              <Button size="sm" onClick={() => handleAddToCart(product)} className="gap-1.5" disabled={(product.stock_quantity ?? 0) <= 0}>
                                <ShoppingCart className="h-3.5 w-3.5" /> Ajouter au panier
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
