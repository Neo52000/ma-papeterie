import { TrendingUp, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { useCartStore, ShopifyProduct } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const BestSellers = () => {
  const { products, loading, error } = useShopifyProducts();
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (product: ShopifyProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;

    addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    
    toast.success("Produit ajouté au panier", {
      description: product.node.title,
    });
  };

  if (loading || error || products.length === 0) {
    return null;
  }

  // Prendre les produits 4-8 comme "best-sellers"
  const bestSellers = products.slice(4, 8);
  
  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
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

        {/* Products List - Horizontal cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {bestSellers.map((product, index) => {
            const imageUrl = product.node.images.edges[0]?.node.url;
            const price = product.node.priceRange.minVariantPrice;
            
            return (
              <Link
                key={product.node.id}
                to={`/product/${product.node.handle}`}
                className="group flex bg-card rounded-xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth"
              >
                {/* Ranking Badge */}
                <div className="relative">
                  <div className="absolute top-3 left-3 z-10 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                    #{index + 1}
                  </div>
                  
                  {/* Image */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden">
                    <img 
                      src={imageUrl || '/placeholder.svg'}
                      alt={product.node.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {product.node.productType || 'Papeterie'}
                      </Badge>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <h3 className="font-semibold text-card-foreground line-clamp-2 mb-1">
                      {product.node.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {product.node.description?.slice(0, 60)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(price.amount, price.currencyCode)}
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
