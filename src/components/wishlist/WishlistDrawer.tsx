import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Heart, Trash2, ShoppingCart, X } from "lucide-react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { toast } from "sonner";

export const WishlistDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addToCart = useCartStore(state => state.addItem);
  
  const totalItems = items.length;

  const handleAddToCart = (product: typeof items[0]) => {
    const firstVariant = product.node.variants.edges[0]?.node;
    if (!firstVariant) return;

    addToCart({
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    });

    toast.success("Produit ajouté au panier", {
      description: product.node.title,
      position: "top-center"
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Heart className="h-5 w-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            Mes Favoris
          </SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "Aucun produit dans vos favoris" : `${totalItems} produit${totalItems !== 1 ? 's' : ''} sauvegardé${totalItems !== 1 ? 's' : ''}`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Votre liste de favoris est vide</p>
                <Button variant="outline" onClick={() => setIsOpen(false)} asChild>
                  <Link to="/shop">Découvrir nos produits</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map((product) => {
                    const firstImage = product.node.images.edges[0]?.node;
                    const price = product.node.priceRange.minVariantPrice;
                    const firstVariant = product.node.variants.edges[0]?.node;
                    
                    return (
                      <div key={product.node.id} className="flex gap-4 p-3 rounded-lg border bg-card">
                        <Link 
                          to={`/product/${product.node.handle}`} 
                          onClick={() => setIsOpen(false)}
                          className="w-20 h-20 bg-muted/30 rounded-md overflow-hidden flex-shrink-0"
                        >
                          {firstImage ? (
                            <img
                              src={firstImage.url}
                              alt={product.node.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">Pas d'image</span>
                            </div>
                          )}
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`/product/${product.node.handle}`}
                            onClick={() => setIsOpen(false)}
                          >
                            <h4 className="font-medium truncate hover:text-primary transition-colors">
                              {product.node.title}
                            </h4>
                          </Link>
                          <p className="text-lg font-semibold text-primary mt-1">
                            {formatPrice(price.amount, price.currencyCode)}
                          </p>
                          
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAddToCart(product)}
                              disabled={!firstVariant?.availableForSale}
                              className="flex-1"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Ajouter
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(product.node.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex-shrink-0 pt-4 border-t bg-background">
                <Button 
                  variant="outline"
                  onClick={clearWishlist}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Vider la liste
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
