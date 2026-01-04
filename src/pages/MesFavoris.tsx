import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Heart, Trash2, ShoppingCart, Bell, BellOff, ArrowLeft, Search, Grid3X3, List } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

export default function MesFavoris() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addToCart = useCartStore(state => state.addItem);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("wishlist_notifications") === "true"
  );

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

  const handleAddAllToCart = () => {
    let addedCount = 0;
    items.forEach(product => {
      const firstVariant = product.node.variants.edges[0]?.node;
      if (firstVariant?.availableForSale) {
        addToCart({
          product,
          variantId: firstVariant.id,
          variantTitle: firstVariant.title,
          price: firstVariant.price,
          quantity: 1,
          selectedOptions: firstVariant.selectedOptions || []
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast.success(`${addedCount} produit${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier`);
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem("wishlist_notifications", enabled.toString());
    
    if (enabled) {
      if (!user) {
        toast.info("Connectez-vous pour activer les notifications email", {
          action: {
            label: "Se connecter",
            onClick: () => navigate("/auth")
          }
        });
        setNotificationsEnabled(false);
        localStorage.setItem("wishlist_notifications", "false");
        return;
      }
      toast.success("Notifications activées", {
        description: "Vous serez notifié par email des promotions et retours en stock"
      });
    } else {
      toast.info("Notifications désactivées");
    }
  };

  const filteredItems = items.filter(item => 
    item.node.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableItems = filteredItems.filter(
    item => item.node.variants.edges[0]?.node.availableForSale
  );
  const unavailableItems = filteredItems.filter(
    item => !item.node.variants.edges[0]?.node.availableForSale
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="pl-0">
            <Link to="/mon-compte" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Retour à Mon Compte
            </Link>
          </Button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
              <Heart className="h-8 w-8 text-accent" />
              Mes Favoris
            </h1>
            <p className="text-lg text-muted-foreground">
              {items.length === 0 
                ? "Aucun produit dans vos favoris" 
                : `${items.length} produit${items.length > 1 ? 's' : ''} sauvegardé${items.length > 1 ? 's' : ''}`
              }
            </p>
          </div>

          {/* Actions */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="default"
                onClick={handleAddAllToCart}
                disabled={availableItems.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Tout ajouter au panier
              </Button>
              <Button 
                variant="outline"
                onClick={clearWishlist}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider la liste
              </Button>
            </div>
          )}
        </div>

        {/* Notifications Card */}
        <Card className="mb-8">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {notificationsEnabled ? (
                  <Bell className="h-5 w-5 text-accent" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h4 className="font-medium">Notifications de favoris</h4>
                  <p className="text-sm text-muted-foreground">
                    Recevez un email quand un produit est en promotion ou de retour en stock
                  </p>
                </div>
              </div>
              <Switch 
                checked={notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
            </div>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-2">Votre liste de favoris est vide</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Parcourez notre catalogue et cliquez sur le cœur pour sauvegarder vos produits préférés
              </p>
              <Button asChild size="lg">
                <Link to="/shop">Découvrir nos produits</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters & View */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher dans vos favoris..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Available Products */}
            {availableItems.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Disponibles ({availableItems.length})
                </h3>
                
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {availableItems.map((product) => (
                      <ProductCard 
                        key={product.node.id} 
                        product={product} 
                        onAddToCart={handleAddToCart}
                        onRemove={() => removeItem(product.node.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableItems.map((product) => (
                      <ProductListItem
                        key={product.node.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        onRemove={() => removeItem(product.node.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Unavailable Products */}
            {unavailableItems.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Rupture de stock ({unavailableItems.length})
                </h3>
                
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-75">
                    {unavailableItems.map((product) => (
                      <ProductCard 
                        key={product.node.id} 
                        product={product} 
                        onAddToCart={handleAddToCart}
                        onRemove={() => removeItem(product.node.id)}
                        unavailable
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 opacity-75">
                    {unavailableItems.map((product) => (
                      <ProductListItem
                        key={product.node.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        onRemove={() => removeItem(product.node.id)}
                        unavailable
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {filteredItems.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun produit trouvé pour "{searchQuery}"</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  onAddToCart, 
  onRemove,
  unavailable = false 
}: { 
  product: any; 
  onAddToCart: (p: any) => void; 
  onRemove: () => void;
  unavailable?: boolean;
}) {
  const firstImage = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-square">
        <Link to={`/product/${product.node.handle}`}>
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={product.node.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">Pas d'image</span>
            </div>
          )}
        </Link>
        
        {unavailable && (
          <Badge className="absolute top-2 left-2 bg-destructive">
            Rupture de stock
          </Badge>
        )}
        
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <Link to={`/product/${product.node.handle}`}>
          <h4 className="font-medium line-clamp-2 hover:text-primary transition-colors mb-2">
            {product.node.title}
          </h4>
        </Link>
        <p className="text-lg font-bold text-primary mb-3">
          {formatPrice(price.amount, price.currencyCode)}
        </p>
        <Button 
          className="w-full" 
          onClick={() => onAddToCart(product)}
          disabled={unavailable}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {unavailable ? "Indisponible" : "Ajouter au panier"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Product List Item Component
function ProductListItem({ 
  product, 
  onAddToCart, 
  onRemove,
  unavailable = false 
}: { 
  product: any; 
  onAddToCart: (p: any) => void; 
  onRemove: () => void;
  unavailable?: boolean;
}) {
  const firstImage = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <Link 
          to={`/product/${product.node.handle}`}
          className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden"
        >
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={product.node.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Pas d'image</span>
            </div>
          )}
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={`/product/${product.node.handle}`}>
                <h4 className="font-medium hover:text-primary transition-colors">
                  {product.node.title}
                </h4>
              </Link>
              {unavailable && (
                <Badge variant="destructive" className="mt-1">
                  Rupture de stock
                </Badge>
              )}
              <p className="text-lg font-bold text-primary mt-1">
                {formatPrice(price.amount, price.currencyCode)}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={() => onAddToCart(product)}
                disabled={unavailable}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
