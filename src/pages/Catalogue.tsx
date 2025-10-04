import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Grid, List, X } from "lucide-react";
import { useProductFilters, type Product } from "@/hooks/useProductFilters";
import { useCart } from "@/contexts/CartContext";
import { CatalogueSeoContent } from "@/components/sections/SeoContent";

export default function Catalogue() {
  const { addToCart } = useCart();
  
  const mockProducts: Product[] = [
    {
      id: 1,
      name: "Cahier 24x32 96 pages",
      category: "Scolaire",
      price: "2.45",
      originalPrice: "2.90",
      image: "/src/assets/category-scolaire.jpg",
      badge: "Promo",
      eco: false,
      stock: 50
    },
    {
      id: 2,
      name: "Stylos BIC Cristal x10",
      category: "Bureau",
      price: "4.20",
      originalPrice: null,
      image: "/src/assets/category-bureau.jpg",
      badge: null,
      eco: true,
      stock: 100
    },
    {
      id: 3,
      name: "Classeur vintage A4",
      category: "Vintage",
      price: "8.90",
      originalPrice: null,
      image: "/src/assets/category-vintage.jpg",
      badge: "Vintage",
      eco: false,
      stock: 20
    },
    {
      id: 4,
      name: "Cahier recyclé 21x29.7",
      category: "Écoresponsable",
      price: "3.15",
      originalPrice: null,
      image: "/src/assets/category-eco.jpg",
      badge: "Éco",
      eco: true,
      stock: 75
    },
    {
      id: 5,
      name: "Trousse scolaire bleue",
      category: "Scolaire",
      price: "12.90",
      originalPrice: null,
      image: "/src/assets/category-scolaire.jpg",
      badge: null,
      eco: false,
      stock: 30
    },
    {
      id: 6,
      name: "Agenda recyclé A5",
      category: "Écoresponsable",
      price: "15.50",
      originalPrice: "18.90",
      image: "/src/assets/category-eco.jpg",
      badge: "Promo",
      eco: true,
      stock: 40
    }
  ];

  const { 
    filters, 
    filteredProducts, 
    updateFilter, 
    clearFilters, 
    resultCount, 
    totalCount 
  } = useProductFilters(mockProducts);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Notre Catalogue</h1>
          <p className="text-lg text-muted-foreground">
            Découvrez notre large gamme de fournitures scolaires et de bureau
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-secondary/20 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un produit..." 
                className="pl-10"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            
            <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="scolaire">Scolaire</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="écoresponsable">Écoresponsable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priceRange} onValueChange={(value) => updateFilter('priceRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Prix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les prix</SelectItem>
                <SelectItem value="0-5">0€ - 5€</SelectItem>
                <SelectItem value="5-10">5€ - 10€</SelectItem>
                <SelectItem value="10-20">10€ - 20€</SelectItem>
                <SelectItem value="20+">20€ et plus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="price-asc">Prix croissant</SelectItem>
                <SelectItem value="price-desc">Prix décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="eco-filter"
                checked={filters.showEcoOnly}
                onCheckedChange={(checked) => updateFilter('showEcoOnly', checked as boolean)}
              />
              <label htmlFor="eco-filter" className="text-sm font-medium">
                Produits écoresponsables uniquement
              </label>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {resultCount} sur {totalCount} produits
              </span>
              {(filters.search || filters.category !== 'all' || filters.priceRange !== 'all' || filters.showEcoOnly) && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="group hover:shadow-soft transition-all duration-300">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.badge && (
                    <Badge 
                      className={`absolute top-2 left-2 ${
                        product.badge === 'Promo' ? 'bg-accent text-accent-foreground' :
                        product.badge === 'Vintage' ? 'bg-vintage-brown text-vintage-cream' :
                        'bg-eco-green text-white'
                      }`}
                    >
                      {product.badge}
                    </Badge>
                  )}
                  {product.eco && (
                    <Badge className="absolute top-2 right-2 bg-eco-green text-white">
                      Éco
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                  {product.name}
                </CardTitle>
                <CardDescription className="mb-3">
                  {product.category}
                </CardDescription>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      {product.price}€
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.originalPrice}€
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="cta"
                    onClick={() => handleAddToCart(product)}
                  >
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              Aucun produit ne correspond à vos critères
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Voir tous les produits
            </Button>
          </div>
        )}

        {/* Load More */}
        {filteredProducts.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Voir plus de produits
            </Button>
          </div>
        )}
        
        <CatalogueSeoContent />
      </main>

      <Footer />
    </div>
  );
}