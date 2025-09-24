import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Grid, List } from "lucide-react";

export default function Catalogue() {
  const mockProducts = [
    {
      id: 1,
      name: "Cahier 24x32 96 pages",
      category: "Scolaire",
      price: "2.45",
      originalPrice: "2.90",
      image: "/src/assets/category-scolaire.jpg",
      badge: "Promo",
      eco: false
    },
    {
      id: 2,
      name: "Stylos BIC Cristal x10",
      category: "Bureau",
      price: "4.20",
      originalPrice: null,
      image: "/src/assets/category-bureau.jpg",
      badge: null,
      eco: true
    },
    {
      id: 3,
      name: "Classeur vintage A4",
      category: "Vintage",
      price: "8.90",
      originalPrice: null,
      image: "/src/assets/category-vintage.jpg",
      badge: "Vintage",
      eco: false
    },
    {
      id: 4,
      name: "Cahier recyclé 21x29.7",
      category: "Écoresponsable",
      price: "3.15",
      originalPrice: null,
      image: "/src/assets/category-eco.jpg",
      badge: "Éco",
      eco: true
    }
  ];

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
              />
            </div>
            
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="scolaire">Scolaire</SelectItem>
                <SelectItem value="bureau">Bureau</SelectItem>
                <SelectItem value="vintage">Vintage</SelectItem>
                <SelectItem value="eco">Écoresponsable</SelectItem>
              </SelectContent>
            </Select>

            <Select>
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

            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockProducts.map((product) => (
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
                  <Button size="sm" variant="cta">
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Voir plus de produits
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}