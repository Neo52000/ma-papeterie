import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import {
  Search, X, ShoppingCart, SlidersHorizontal, LayoutGrid, List,
  Loader2, ChevronLeft, ChevronRight, Filter, Package
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CatalogueSeoContent } from "@/components/sections/SeoContent";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { track } from "@/hooks/useAnalytics";

interface CatalogueProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  badge: string | null;
  eco: boolean | null;
  stock_quantity: number | null;
  is_active: boolean | null;
}

const PAGE_SIZE = 40;

const PRICE_RANGES = [
  { label: "Tous les prix", value: "all" },
  { label: "0€ – 5€", value: "0-5", min: 0, max: 5 },
  { label: "5€ – 10€", value: "5-10", min: 5, max: 10 },
  { label: "10€ – 20€", value: "10-20", min: 10, max: 20 },
  { label: "20€ – 50€", value: "20-50", min: 20, max: 50 },
  { label: "50€ et +", value: "50+", min: 50, max: 99999 },
];

const TOP_BRANDS = [
  "Q-CONNECT", "CLAIREFONTAINE", "EXACOMPTA", "OXFORD", "PILOT",
  "BIC", "STABILO", "MAPED", "STAEDTLER", "HP", "EPSON",
  "BROTHER", "CANON", "APLI", "FELLOWES", "AVERY", "TRODAT"
];

export default function Catalogue() {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Categories from DB
  const [categoryOptions, setCategoryOptions] = useState<{ name: string; count: number }[]>([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get("subcategory") || "all");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [showEcoOnly, setShowEcoOnly] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(0);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  // Fetch category stats
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          counts[p.category] = (counts[p.category] || 0) + 1;
        });
        const sorted = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setCategoryOptions(sorted);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products with server-side pagination & filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select("id, name, description, category, subcategory, brand, price, price_ttc, image_url, badge, eco, stock_quantity, is_active", { count: "exact" })
        .eq("is_active", true);

      // Category filter
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      // Subcategory filter
      if (selectedSubcategory !== "all") {
        query = query.eq("subcategory", selectedSubcategory);
      }

      // Search
      if (debouncedSearch.trim()) {
        query = query.ilike("name", `%${debouncedSearch.trim()}%`);
      }

      // Brand filter
      if (selectedBrands.length > 0) {
        query = query.in("brand", selectedBrands);
      }

      // Price range
      const range = PRICE_RANGES.find((r) => r.value === priceRange);
      if (range && range.value !== "all") {
        query = query.gte("price", range.min!).lte("price", range.max!);
      }

      // Stock filter
      if (stockFilter === "in-stock") {
        query = query.gt("stock_quantity", 0);
      } else if (stockFilter === "out-of-stock") {
        query = query.or("stock_quantity.eq.0,stock_quantity.is.null");
      }

      // Eco filter
      if (showEcoOnly) {
        query = query.eq("eco", true);
      }

      // Sorting
      switch (sortBy) {
        case "price-asc":
          query = query.order("price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("price", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("name", { ascending: true });
      }

      // Pagination
      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
      if (debouncedSearch.trim()) {
        track('search_performed', { query: debouncedSearch.trim(), result_count: count ?? 0 });
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubcategory, debouncedSearch, selectedBrands, priceRange, stockFilter, showEcoOnly, sortBy, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedSubcategory !== "all") params.set("subcategory", selectedSubcategory);
    if (debouncedSearch) params.set("q", debouncedSearch);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedSubcategory, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedBrands([]);
    setPriceRange("all");
    setStockFilter("all");
    setSortBy("name");
    setShowEcoOnly(false);
    setPage(0);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setPage(0);
  };

  const hasActiveFilters =
    debouncedSearch || selectedCategory !== "all" || selectedSubcategory !== "all" ||
    selectedBrands.length > 0 || priceRange !== "all" || stockFilter !== "all" || showEcoOnly;

  // Subcategories for selected category
  const [subcategoryOptions, setSubcategoryOptions] = useState<{ name: string; count: number }[]>([]);
  useEffect(() => {
    if (selectedCategory === "all") {
      setSubcategoryOptions([]);
      return;
    }
    const fetchSubs = async () => {
      const { data } = await supabase
        .from("products")
        .select("subcategory")
        .eq("is_active", true)
        .eq("category", selectedCategory)
        .not("subcategory", "is", null);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p) => {
          if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
        });
        setSubcategoryOptions(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    };
    fetchSubs();
  }, [selectedCategory]);

  const SidebarFilters = () => (
    <div className="space-y-1">
      {/* Categories */}
      <Accordion type="multiple" defaultValue={["categories", "price", "brands", "stock"]}>
        <AccordionItem value="categories">
          <AccordionTrigger className="text-sm font-semibold py-3">Catégories</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
              <button
                onClick={() => { setSelectedCategory("all"); setSelectedSubcategory("all"); setPage(0); }}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  selectedCategory === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Toutes ({categoryOptions.reduce((s, c) => s + c.count, 0)})
              </button>
              {categoryOptions.slice(0, 25).map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategory("all"); setPage(0); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    selectedCategory === cat.name ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {cat.name.charAt(0) + cat.name.slice(1).toLowerCase()} ({cat.count})
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Subcategories */}
        {subcategoryOptions.length > 0 && (
          <AccordionItem value="subcategories">
            <AccordionTrigger className="text-sm font-semibold py-3">Sous-catégories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                <button
                  onClick={() => { setSelectedSubcategory("all"); setPage(0); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    selectedSubcategory === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Toutes
                </button>
                {subcategoryOptions.map((sub) => (
                  <button
                    key={sub.name}
                    onClick={() => { setSelectedSubcategory(sub.name); setPage(0); }}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                      selectedSubcategory === sub.name ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {sub.name.charAt(0) + sub.name.slice(1).toLowerCase()} ({sub.count})
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Price */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-semibold py-3">Prix</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-0.5">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setPriceRange(r.value); setPage(0); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    priceRange === r.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Brands */}
        <AccordionItem value="brands">
          <AccordionTrigger className="text-sm font-semibold py-3">Marques</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {TOP_BRANDS.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={selectedBrands.includes(brand)}
                    onCheckedChange={() => toggleBrand(brand)}
                  />
                  <label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                    {brand}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Stock */}
        <AccordionItem value="stock">
          <AccordionTrigger className="text-sm font-semibold py-3">Disponibilité</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-0.5">
              {[
                { value: "all" as const, label: "Tous" },
                { value: "in-stock" as const, label: "En stock" },
                { value: "out-of-stock" as const, label: "Rupture de stock" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setStockFilter(opt.value); setPage(0); }}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    stockFilter === opt.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Eco toggle */}
      <div className="flex items-center space-x-2 px-2 py-3 border-t border-border">
        <Checkbox
          id="eco-sidebar"
          checked={showEcoOnly}
          onCheckedChange={(checked) => { setShowEcoOnly(checked as boolean); setPage(0); }}
        />
        <label htmlFor="eco-sidebar" className="text-sm font-medium cursor-pointer">
          🌱 Écoresponsable
        </label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs gap-1 text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" /> Effacer tous les filtres
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Catalogue complet — 40 000+ fournitures scolaires & bureau</title>
        <meta name="description" content="Parcourez notre catalogue de plus de 40 000 fournitures scolaires et de bureau. Filtrez par catégorie, marque, prix. Livraison rapide." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Catalogue</span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 mb-1 font-poppins">Notre Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} produits disponibles
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32 bg-card rounded-xl border border-border p-4 max-h-[calc(100vh-9rem)] overflow-y-auto">
              <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtres
              </h2>
              <SidebarFilters />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="bg-card rounded-xl border border-border p-3 mb-5 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  className="pl-10 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="name">Nom A→Z</SelectItem>
                  <SelectItem value="price-asc">Prix ↑</SelectItem>
                  <SelectItem value="price-desc">Prix ↓</SelectItem>
                  <SelectItem value="newest">Nouveautés</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile filter trigger */}
              <Button variant="outline" size="sm" className="lg:hidden h-9 gap-1.5" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <Filter className="h-3.5 w-3.5" /> Filtres
              </Button>

              <div className="flex bg-muted rounded-lg p-0.5">
                <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Mobile filters overlay */}
            {sidebarOpen && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
                <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background p-5 overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-foreground flex items-center gap-2"><Filter className="w-4 h-4" /> Filtres</h2>
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <SidebarFilters />
                </div>
              </div>
            )}

            {/* Active filters badges */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setSelectedCategory("all"); setSelectedSubcategory("all"); setPage(0); }}>
                    {selectedCategory} <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedSubcategory !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setSelectedSubcategory("all"); setPage(0); }}>
                    {selectedSubcategory} <X className="h-3 w-3" />
                  </Badge>
                )}
                {selectedBrands.map((b) => (
                  <Badge key={b} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => toggleBrand(b)}>
                    {b} <X className="h-3 w-3" />
                  </Badge>
                ))}
                {priceRange !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setPriceRange("all"); setPage(0); }}>
                    {PRICE_RANGES.find((r) => r.value === priceRange)?.label} <X className="h-3 w-3" />
                  </Badge>
                )}
                {stockFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setStockFilter("all"); setPage(0); }}>
                    {stockFilter === "in-stock" ? "En stock" : "Rupture"} <X className="h-3 w-3" />
                  </Badge>
                )}
                {showEcoOnly && (
                  <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => { setShowEcoOnly(false); setPage(0); }}>
                    🌱 Éco <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            )}

            {/* Empty */}
            {!loading && products.length === 0 && (
              <div className="text-center py-20">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-foreground mb-2">Aucun produit trouvé</p>
                <p className="text-muted-foreground mb-4">Modifiez vos filtres pour trouver ce que vous cherchez</p>
                <Button variant="outline" onClick={clearFilters}>Effacer les filtres</Button>
              </div>
            )}

            {/* Grid View */}
            {!loading && products.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  const displayPrice = product.price_ttc ?? product.price;
                  const inStock = (product.stock_quantity ?? 0) > 0;
                  return (
                    <div key={product.id} className="group bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
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
                          {product.eco && <Badge className="text-xs bg-accent text-accent-foreground">🌱</Badge>}
                        </div>
                      </div>
                      <div className="p-3.5">
                        <p className="text-[11px] text-muted-foreground mb-0.5 truncate">
                          {product.category}
                          {product.subcategory && ` · ${product.subcategory}`}
                        </p>
                        <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                          {product.name}
                        </h3>
                        {product.brand && product.brand !== "N.C" && (
                          <p className="text-[11px] text-muted-foreground mb-1.5">{product.brand}</p>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${inStock ? "text-green-600" : "text-destructive"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-green-500" : "bg-destructive"}`} />
                            {inStock ? "En stock" : "Rupture"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">{displayPrice.toFixed(2)}€</span>
                          <Button size="sm" onClick={() => handleAddToCart(product)} className="h-8 gap-1" disabled={!inStock}>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ajouter</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {!loading && products.length > 0 && viewMode === "list" && (
              <div className="space-y-2">
                {products.map((product) => {
                  const displayPrice = product.price_ttc ?? product.price;
                  const inStock = (product.stock_quantity ?? 0) > 0;
                  return (
                    <div key={product.id} className="flex gap-4 bg-card rounded-xl border border-border/50 p-3 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg shrink-0"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{product.category}</p>
                            <h3 className="font-semibold text-sm text-foreground truncate">{product.name}</h3>
                            <div className="flex gap-1.5 mt-1">
                              {product.brand && product.brand !== "N.C" && <Badge variant="outline" className="text-[10px]">{product.brand}</Badge>}
                              {product.badge && <Badge variant="outline" className="text-[10px]">{product.badge}</Badge>}
                              {product.eco && <Badge variant="outline" className="text-[10px]">🌱 Éco</Badge>}
                            </div>
                          </div>
                          <span className="text-lg font-bold text-primary shrink-0">{displayPrice.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-xs font-medium ${inStock ? "text-green-600" : "text-destructive"}`}>
                            {inStock ? `${product.stock_quantity} en stock` : "Rupture"}
                          </span>
                          <Button size="sm" onClick={() => handleAddToCart(product)} className="h-7 text-xs gap-1" disabled={!inStock}>
                            <ShoppingCart className="h-3 w-3" /> Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => { setPage((p) => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9"
                        onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => { setPage((p) => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="gap-1"
                >
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page info */}
            {!loading && totalCount > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Page {page + 1} sur {totalPages} — {totalCount.toLocaleString()} produit{totalCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <CatalogueSeoContent />
      </main>

      <Footer />
    </div>
  );
}
