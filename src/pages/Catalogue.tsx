import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, ShoppingCart, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { useProductFilters, type Product } from "@/hooks/useProductFilters";
import { useCart } from "@/contexts/CartContext";
import { CatalogueSeoContent } from "@/components/sections/SeoContent";
import { useState } from "react";

export default function Catalogue() {
  const { addToCart } = useCart();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const mockProducts: Product[] = [
    { id: 1, name: "Cahier 24x32 96 pages", category: "Scolaire", price: "2.45", originalPrice: "2.90", image: "/src/assets/category-scolaire.jpg", badge: "Promo", eco: false, stock: 50 },
    { id: 2, name: "Stylos BIC Cristal x10", category: "Bureau", price: "4.20", originalPrice: null, image: "/src/assets/category-bureau.jpg", badge: null, eco: true, stock: 100 },
    { id: 3, name: "Classeur vintage A4", category: "Vintage", price: "8.90", originalPrice: null, image: "/src/assets/category-vintage.jpg", badge: "Vintage", eco: false, stock: 20 },
    { id: 4, name: "Cahier recyclé 21x29.7", category: "Écoresponsable", price: "3.15", originalPrice: null, image: "/src/assets/category-eco.jpg", badge: "Éco", eco: true, stock: 75 },
    { id: 5, name: "Trousse scolaire bleue", category: "Scolaire", price: "12.90", originalPrice: null, image: "/src/assets/category-scolaire.jpg", badge: null, eco: false, stock: 30 },
    { id: 6, name: "Agenda recyclé A5", category: "Écoresponsable", price: "15.50", originalPrice: "18.90", image: "/src/assets/category-eco.jpg", badge: "Promo", eco: true, stock: 40 }
  ];

  const { filters, filteredProducts, updateFilter, clearFilters, resultCount, totalCount } = useProductFilters(mockProducts);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      stock_quantity: product.stock || 0
    });
  };

  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.priceRange !== 'all' || filters.showEcoOnly;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
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
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            
            <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="scolaire">Scolaire</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="écoresponsable">Écoresponsable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priceRange} onValueChange={(value) => updateFilter('priceRange', value)}>
              <SelectTrigger><SelectValue placeholder="Prix" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tous les prix</SelectItem>
                <SelectItem value="0-5">0€ - 5€</SelectItem>
                <SelectItem value="5-10">5€ - 10€</SelectItem>
                <SelectItem value="10-20">10€ - 20€</SelectItem>
                <SelectItem value="20+">20€ et plus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
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
                  checked={filters.showEcoOnly}
                  onCheckedChange={(checked) => updateFilter('showEcoOnly', checked as boolean)}
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
                {resultCount} sur {totalCount}
              </span>
              <div className="hidden sm:flex bg-muted rounded-lg p-0.5">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">Aucun produit trouvé</p>
            <p className="text-muted-foreground mb-4">Essayez de modifier vos critères de recherche</p>
            <Button variant="outline" onClick={clearFilters}>Voir tous les produits</Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <div key={product.id} className="group bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <div className="relative overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {product.badge && (
                      <Badge className={`text-xs ${
                        product.badge === 'Promo' ? 'bg-destructive text-destructive-foreground' :
                        product.badge === 'Vintage' ? 'bg-primary text-primary-foreground' :
                        'bg-accent text-accent-foreground'
                      }`}>
                        {product.badge}
                      </Badge>
                    )}
                    {product.eco && <Badge className="text-xs bg-accent text-accent-foreground">🌱 Éco</Badge>}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 className="font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{product.price}€</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">{product.originalPrice}€</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAddToCart(product)} className="h-8 gap-1.5">
                      <ShoppingCart className="h-3.5 w-3.5" /> Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="flex gap-4 bg-card rounded-xl border border-border/50 p-4 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded-lg shrink-0" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <div className="flex gap-1.5 mt-1">
                        {product.badge && <Badge variant="outline" className="text-xs">{product.badge}</Badge>}
                        {product.eco && <Badge variant="outline" className="text-xs text-accent-dark">🌱 Éco</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-primary">{product.price}€</span>
                      {product.originalPrice && <p className="text-sm text-muted-foreground line-through">{product.originalPrice}€</p>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-muted-foreground">{product.stock} en stock</span>
                    <Button size="sm" onClick={() => handleAddToCart(product)} className="gap-1.5">
                      <ShoppingCart className="h-3.5 w-3.5" /> Ajouter au panier
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">Voir plus de produits</Button>
          </div>
        )}
        
        <CatalogueSeoContent />
      </main>

      <Footer />
    </div>
  );
}
