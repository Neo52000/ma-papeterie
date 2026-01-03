import { ShoppingCart, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { useCartStore, ShopifyProduct } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageLoadingSpinner } from "@/components/ui/loading-states";

const ShopifyFeaturedProducts = () => {
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

  if (loading) {
    return <PageLoadingSpinner />;
  }

  if (error) {
    return null;
  }

  // Prendre les 4 premiers produits comme "vedettes"
  const featuredProducts = products.slice(0, 4);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Sélection du moment
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-poppins">
            Produits Vedettes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez notre sélection de produits de qualité professionnelle
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => {
            const imageUrl = product.node.images.edges[0]?.node.url;
            const price = product.node.priceRange.minVariantPrice;
            
            return (
              <Link
                key={product.node.id}
                to={`/product/${product.node.handle}`}
                className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-vintage transition-smooth"
              >
                {/* Image Container */}
                <div className="relative overflow-hidden aspect-square">
                  <img 
                    src={imageUrl || '/placeholder.svg'}
                    alt={product.node.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Vedette
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="bg-background/90 hover:bg-background shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
                    {product.node.productType || 'Papeterie'}
                  </div>
                  
                  <h3 className="font-semibold text-card-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {product.node.title}
                  </h3>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(price.amount, price.currencyCode)}
                    </span>
                    
                    <Button 
                      size="sm"
                      variant="outline"
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

        {/* CTA */}
        <div className="text-center mt-12">
          <Button asChild variant="secondary" size="lg">
            <Link to="/shop">Voir tous les produits</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ShopifyFeaturedProducts;
