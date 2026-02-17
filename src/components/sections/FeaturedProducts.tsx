import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Heart, Eye, Package } from "lucide-react";
import { useState } from "react";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { useCart } from "@/contexts/CartContext";
import { useProducts, type Product } from "@/hooks/useProducts";
import { PageLoadingSpinner } from "@/components/ui/loading-states";

const FeaturedProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { products, loading, error } = useProducts(true);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      image: product.image_url || '/placeholder.svg',
      category: product.category,
      stock_quantity: product.stock_quantity || 0,
    });
  };

  if (loading) return <PageLoadingSpinner />;
  if (error) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">Erreur lors du chargement des produits</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Produits Vedettes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nos coups de cœur et bestsellers, plébiscités par notre communauté
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.id}
              className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Image */}
              <div className="relative overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {product.badge && (
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
                    product.badge === 'Bestseller' ? 'bg-primary text-primary-foreground' :
                    product.badge === 'Éco' ? 'bg-accent text-accent-foreground' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {product.badge}
                  </div>
                )}

                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="bg-background/80 hover:bg-background" onClick={(e) => { e.stopPropagation(); }}>
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="bg-background/80 hover:bg-background" onClick={(e) => { e.stopPropagation(); handleProductClick(product); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {product.category}
                  {product.subcategory && <span className="ml-1">· {product.subcategory}</span>}
                </div>
                
                <h3 className="font-semibold text-card-foreground mb-1 line-clamp-2">
                  {product.name}
                </h3>

                {product.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                )}

                {/* Stock */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${(product.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                    {(product.stock_quantity ?? 0) > 0 ? 'En stock' : 'Rupture'}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-primary">
                    {(product.price_ttc ?? product.price).toFixed(2)}€
                  </span>
                </div>

                <Button 
                  className="w-full" 
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleAddToCart(product, e)}
                  disabled={(product.stock_quantity ?? 0) <= 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="secondary" size="lg">
            Voir tous les produits
          </Button>
        </div>
      </div>

      <ProductDetailModal 
        product={selectedProduct ? {
          ...selectedProduct,
          id: parseInt(selectedProduct.id.replace(/\D/g, '').slice(0, 8)) || 1,
          image: selectedProduct.image_url || '/placeholder.svg',
          price: selectedProduct.price.toString(),
          description: selectedProduct.description,
        } : null}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
};

export default FeaturedProducts;
