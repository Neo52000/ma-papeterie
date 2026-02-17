import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, ShoppingCart, SlidersHorizontal, LayoutGrid, List, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CatalogueSeoContent } from "@/components/sections/SeoContent";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

interface CatalogueProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  badge: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
  is_active: boolean | null;
}

interface CategoryOption {
  slug: string;
  name: string;
}

export default function Catalogue() {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");
  const [showEcoOnly, setShowEcoOnly] = useState(false);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("slug, name")
        .eq("is_active", true)
        .order("name");
      setCategoryOptions(data || []);
    };
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("products")
          .select("id, name, description, category, subcategory, price, price_ttc, image_url, badge, eco, stock_quantity, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true })
          .limit(200);

        // If a category is selected, find the matching category name and use broad ilike
        if (selectedCategory !== "all") {
          const match = categoryOptions.find((c) => c.slug === selectedCategory);
          if (match) {
            query = query.ilike("category", `%${match.name}%`);
          }
        }

        if (search.trim()) {
          query = query.ilike("name", `%${search.trim()}%`);
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
  }, [selectedCategory, search, categoryOptions]);

  // Update URL when category changes
  useEffect(() => {
    if (selectedCategory === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", selectedCategory);
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (showEcoOnly) {
      result = result.filter((p) => p.eco);
    }

    if (priceRange !== "all") {
      result = result.filter((p) => {
        const price = p.price_ttc ?? p.price;
        switch (priceRange) {
          case "0-5": return price <= 5;
          case "5-10": return price > 5 && price <= 10;
          case "10-20": return price > 10 && price <= 20;
          case "20+": return price > 20;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      const priceA = a.price_ttc ?? a.price;
      const priceB = b.price_ttc ?? b.price;
      switch (sortBy) {
        case "price-asc": return priceA - priceB;
        case "price-desc": return priceB - priceA;
        default: return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [products, showEcoOnly, priceRange, sortBy]);

  const handleAddToCart = (product: CatalogueProduct) => {
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
    setSearch("");
    setSelectedCategory("all");
    setPriceRange("all");
    setSortBy("name");
    setShowEcoOnly(false);
  };

  const hasActiveFilters = search || selectedCategory !== "all" || priceRange !== "all" || showEcoOnly;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Catalogue</span>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-1 mb-2 font-poppins">Notre Catalogue</h1>
          <p className="text-muted-foreground">
            Découvrez notre large gamme de fournitures scolaires et de bureau
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent className="bg-popover max-h-60">
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger><SelectValue placeholder="Prix" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tous les prix</SelectItem>
                <SelectItem value="0-5">0€ - 5€</SelectItem>
                <SelectItem value="5-10">5€ - 10€</SelectItem>
                <SelectItem value="10-20">10€ - 20€</SelectItem>
                <SelectItem value="20+">20€ et plus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger><SelectValue placeholder="Trier par" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="price-asc">Prix ↑</SelectItem>
                <SelectItem value="price-desc">Prix ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="eco-filter"
                  checked={showEcoOnly}
                  onCheckedChange={(checked) => setShowEcoOnly(checked as boolean)}
                />
                <label htmlFor="eco-filter" className="text-sm font-medium cursor-pointer">
                  🌱 Écoresponsable uniquement
                </label>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Effacer
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
              </span>
              <div className="hidden sm:flex bg-muted rounded-lg p-0.5">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des produits...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">Aucun produit trouvé</p>
            <p className="text-muted-foreground mb-4">Essayez de modifier vos critères de recherche</p>
            <Button variant="outline" onClick={clearFilters}>Voir tous les produits</Button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => {
              const displayPrice = product.price_ttc ?? product.price;
              return (
                <div key={product.id} className="group bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <div className="relative overflow-hidden">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
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
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      {product.category}
                      {product.subcategory && <span className="ml-1">· {product.subcategory}</span>}
                    </p>
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${(product.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                        {(product.stock_quantity ?? 0) > 0 ? 'En stock' : 'Rupture'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{displayPrice.toFixed(2)}€</span>
                      <Button size="sm" onClick={() => handleAddToCart(product)} className="h-8 gap-1.5" disabled={(product.stock_quantity ?? 0) <= 0}>
                        <ShoppingCart className="h-3.5 w-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Products List */}
        {!loading && filteredProducts.length > 0 && viewMode === "list" && (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
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
                      <Button size="sm" onClick={() => handleAddToCart(product)} className="gap-1.5">
                        <ShoppingCart className="h-3.5 w-3.5" /> Ajouter au panier
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CatalogueSeoContent />
      </main>

      <Footer />
    </div>
  );
}
