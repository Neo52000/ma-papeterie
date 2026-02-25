import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { useState, memo, useCallback } from "react";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { useCart } from "@/contexts/CartContext";
import { useProducts, type Product } from "@/hooks/useProducts";
import { PageLoadingSpinner } from "@/components/ui/loading-states";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const FeaturedProducts = memo(function FeaturedProducts() {
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
  if (error) return null;

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-poppins">
            Produits Vedettes
          </h2>
          <p className="text-muted-foreground mt-1">
            Nos coups de cœur et bestsellers
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div 
              key={product.id}
              className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Image on white bg */}
              <div className="relative bg-white aspect-square flex items-center justify-center p-4">
                {product.image_url ? (
                  <OptimizedImage
                    src={product.image_url}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Package className="w-16 h-16 text-muted-foreground/20" />
                )}
                {product.badge && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-semibold">
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {product.category}
                </p>
                <h3 className="font-semibold text-sm text-card-foreground line-clamp-2 mb-1">
                  {product.name}
                </h3>

                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                )}

                {/* Stock */}
                <span className={`inline-flex items-center gap-1 text-xs mb-2 ${(product.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                  {(product.stock_quantity ?? 0) > 0 ? 'En stock' : 'Rupture'}
                </span>

                {/* Price */}
                <div className="text-lg font-bold text-primary mb-2">
                  {(product.price_ttc ?? product.price).toFixed(2)} € <span className="text-xs font-normal text-muted-foreground">TTC</span>
                </div>

                <Button 
                  className="w-full gap-2" 
                  size="sm"
                  onClick={(e) => handleAddToCart(product, e)}
                  disabled={(product.stock_quantity ?? 0) <= 0}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ajouter au panier
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg" onClick={() => window.location.href = '/catalogue'}>
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
});

export default FeaturedProducts;
