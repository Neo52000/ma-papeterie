import { memo } from "react";
import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

const BestSellers = memo(function BestSellers() {
  const { products, loading, error } = useProducts();
  const { addToCart } = useCart();

  const bestSellers = products.filter(p => p.stock_quantity > 0).slice(0, 4);

  if (loading || error || bestSellers.length === 0) return null;

  const handleAddToCart = (product: typeof bestSellers[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      image: product.image_url || "/placeholder.svg",
      category: product.category,
      stock_quantity: product.stock_quantity || 0,
    });
  };

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-poppins">
            Meilleures Ventes
          </h2>
          <p className="text-muted-foreground mt-1">
            Les produits préférés de nos clients
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bestSellers.map((product) => (
            <Link
              key={product.id}
              to="/catalogue"
              className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
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
              </div>

              <div className="p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {product.category}
                </p>
                <h3 className="font-semibold text-sm text-card-foreground line-clamp-2 mb-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{product.description}</p>
                )}

                <span className={`inline-flex items-center gap-1 text-xs mb-2 ${(product.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                  {(product.stock_quantity ?? 0) > 0 ? 'En stock' : 'Rupture'}
                </span>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    {product.price.toFixed(2)} €
                  </span>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={(e) => handleAddToCart(product, e)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline">Ajouter</span>
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

export default BestSellers;
