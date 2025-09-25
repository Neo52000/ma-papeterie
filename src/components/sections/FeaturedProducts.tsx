import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Heart, Eye } from "lucide-react";
import { useState } from "react";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/hooks/useProductFilters";

const featuredProducts: Product[] = [
  {
    id: 1,
    name: "Cahier Oxford Classic A4",
    price: "3.99",
    originalPrice: "4.99",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    badge: "Bestseller",
    category: "Scolaire",
    eco: false
  },
  {
    id: 2,
    name: "Stylo Bic 4 Couleurs Vintage",
    price: "2.49",
    originalPrice: null,
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    badge: "Vintage",
    category: "Licences",
    eco: false
  },
  {
    id: 3,
    name: "Trousse Eastpak Années 90",
    price: "24.99",
    originalPrice: "29.99",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    badge: "-17%",
    category: "Vintage",
    eco: false
  },
  {
    id: 4,
    name: "Agenda Recyclé 2024",
    price: "12.99",
    originalPrice: null,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
    badge: "Éco",
    category: "Écoresponsable",
    eco: true
  }
];

const FeaturedProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Produits Vedettes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nos coups de cœur et bestsellers, plébiscités par notre communauté
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div 
              key={product.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Image Container */}
              <div className="relative overflow-hidden">
                <img 
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-110"
                />
                
                {/* Badge */}
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                  product.badge === 'Bestseller' ? 'bg-primary text-primary-foreground' :
                  product.badge === 'Vintage' ? 'bg-vintage-cream text-vintage-brown' :
                  product.badge === 'Éco' ? 'bg-accent text-accent-foreground' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {product.badge}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Add to favorites');
                    }}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {product.category}
                </div>
                
                <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${
                          i < 4 ? 'text-vintage-yellow fill-current' : 'text-muted-foreground'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    (127)
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {product.price}€
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.originalPrice}€
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button 
                  className="w-full" 
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleAddToCart(product, e)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="secondary" size="lg">
            Voir tous les produits
          </Button>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};

export default FeaturedProducts;