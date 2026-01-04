import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, ShoppingCart, Filter, Star, Truck, Shield, Clock, X, SlidersHorizontal } from "lucide-react";
import { useCartStore, ShopifyProduct } from "@/stores/cartStore";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { formatPrice } from "@/lib/shopify";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CATEGORIES = [
  { value: "all", label: "Toutes les catégories" },
  { value: "carnets", label: "Carnets & Cahiers" },
  { value: "stylos", label: "Stylos & Écriture" },
  { value: "agendas", label: "Agendas & Planners" },
  { value: "accessoires", label: "Accessoires" },
  { value: "papeterie-pro", label: "Papeterie Pro" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "En vedette" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "title-asc", label: "A → Z" },
  { value: "title-desc", label: "Z → A" },
  { value: "newest", label: "Nouveautés" },
];

const ProductCard = ({ product }: { product: ShopifyProduct }) => {
  const addItem = useCartStore(state => state.addItem);
  const firstImage = product.node.images.edges[0]?.node;
  const firstVariant = product.node.variants.edges[0]?.node;
  const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
  const currencyCode = product.node.priceRange.minVariantPrice.currencyCode;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!firstVariant) return;

    const cartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Produit ajouté au panier", {
      description: product.node.title,
      position: "top-center"
    });
  };

  return (
    <Link to={`/product/${product.node.handle}`}>
      <Card className="group overflow-hidden hover:shadow-elegant transition-all duration-300 h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={firstImage.altText || product.node.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Pas d'image</span>
            </div>
          )}
          
          {/* Wishlist Button */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton product={product} />
          </div>
          
          {!firstVariant?.availableForSale && (
            <Badge className="absolute top-3 left-3 bg-destructive">
              Rupture
            </Badge>
          )}
          {product.node.tags?.includes('nouveau') && (
            <Badge className="absolute bottom-3 left-3 bg-primary">
              Nouveau
            </Badge>
          )}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {product.node.title}
            </h3>
            {product.node.vendor && (
              <p className="text-xs text-muted-foreground mb-2">{product.node.vendor}</p>
            )}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.node.description || "Description à venir"}
            </p>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-primary">
                {formatPrice(price.toString(), currencyCode)}
              </span>
              {firstVariant?.availableForSale && (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  En stock
                </Badge>
              )}
            </div>
            
            <Button 
              onClick={handleAddToCart}
              className="w-full"
              variant="default"
              disabled={!firstVariant?.availableForSale}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {firstVariant?.availableForSale ? "Ajouter au panier" : "Indisponible"}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const Shop = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const { products, loading, error, searchProducts } = useShopifyProducts();

  // Calculate min/max prices from products
  const { minPrice, maxPrice } = useMemo(() => {
    if (products.length === 0) return { minPrice: 0, maxPrice: 100 };
    const prices = products.map(p => parseFloat(p.node.priceRange.minVariantPrice.amount));
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices))
    };
  }, [products]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchProducts(searchQuery);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceRange([minPrice, maxPrice]);
    setShowInStockOnly(false);
    setSortBy('featured');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (priceRange[0] > minPrice || priceRange[1] < maxPrice) count++;
    if (showInStockOnly) count++;
    return count;
  }, [selectedCategory, priceRange, showInStockOnly, minPrice, maxPrice]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (selectedCategory !== 'all') {
        const productType = product.node.productType?.toLowerCase() || '';
        const productTags = product.node.tags?.map(t => t.toLowerCase()) || [];
        if (!productType.includes(selectedCategory) && !productTags.some(t => t.includes(selectedCategory))) {
          return false;
        }
      }
      
      // Price filter
      const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
      if (price < priceRange[0] || price > priceRange[1]) return false;
      
      // Stock filter
      if (showInStockOnly) {
        const isAvailable = product.node.variants.edges.some(v => v.node.availableForSale);
        if (!isAvailable) return false;
      }
      
      return true;
    });
  }, [products, selectedCategory, priceRange, showInStockOnly]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return parseFloat(a.node.priceRange.minVariantPrice.amount) - parseFloat(b.node.priceRange.minVariantPrice.amount);
        case 'price-desc':
          return parseFloat(b.node.priceRange.minVariantPrice.amount) - parseFloat(a.node.priceRange.minVariantPrice.amount);
        case 'title-asc':
          return a.node.title.localeCompare(b.node.title);
        case 'title-desc':
          return b.node.title.localeCompare(a.node.title);
        case 'newest':
          return 0; // Could use createdAt if available
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  // Filter panel content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h4 className="font-medium mb-3">Catégorie</h4>
        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedCategory === cat.value}
                onCheckedChange={() => setSelectedCategory(cat.value)}
              />
              <span className="text-sm">{cat.label}</span>
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
      
      {/* Stock Filter */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={showInStockOnly}
            onCheckedChange={(checked) => setShowInStockOnly(checked as boolean)}
          />
          <span className="text-sm">En stock uniquement</span>
        </label>
      </div>
      
      {/* Clear Filters */}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Rechercher
              </Button>
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
                      <SheetDescription>
                        Affinez votre recherche
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {sortedProducts.length} produit{sortedProducts.length > 1 ? 's' : ''}
                    {activeFiltersCount > 0 && ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? 's' : ''})`}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Desktop Quick Filters */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px] hidden md:flex">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
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

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Chargement des produits...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && sortedProducts.length === 0 && (
              <div className="text-center py-20 bg-muted/30 rounded-2xl">
                <div className="max-w-md mx-auto">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucun produit trouvé</h3>
                  <p className="text-muted-foreground mb-6">
                    Notre catalogue est en cours de préparation. Créez votre premier produit en indiquant ce que vous souhaitez vendre !
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              </div>
            )}

              {/* Products Grid */}
              <div className="flex-1">
                {/* Loading State */}
                {loading && (
                  <div className="flex flex-col justify-center items-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Chargement des produits...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-20">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && sortedProducts.length === 0 && (
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

                {/* Products */}
                {!loading && !error && sortedProducts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedProducts.map((product) => (
                      <ProductCard key={product.node.id} product={product} />
                    ))}
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
