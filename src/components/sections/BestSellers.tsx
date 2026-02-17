import { TrendingUp, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";
import { Link } from "react-router-dom";

const BestSellers = () => {
  const { products, loading, error } = useProducts();
  const { addToCart } = useCart();

  // Take the first 4 active products as "best-sellers"
  const bestSellers = products.filter(p => p.stock_quantity > 0).slice(0, 4);

  if (loading || error || bestSellers.length === 0) {
    return null;
  }

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
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            Les plus populaires
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Meilleures Ventes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Les produits préférés de nos clients professionnels
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {bestSellers.map((product, index) => {
            const displayPrice = product.price;
            return (
              <Link
                key={product.id}
                to={`/catalogue`}
                className="group flex bg-card rounded-xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth"
              >
                <div className="relative">
                  <div className="absolute top-3 left-3 z-10 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                    #{index + 1}
                  </div>
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden">
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                      {product.subcategory && (
                        <span className="text-xs text-muted-foreground">{product.subcategory}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-card-foreground line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${(product.stock_quantity ?? 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? 'bg-green-500' : 'bg-destructive'}`} />
                      {(product.stock_quantity ?? 0) > 0 ? 'En stock' : 'Rupture'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-primary">
                      {displayPrice.toFixed(2)}€
                    </span>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BestSellers;
