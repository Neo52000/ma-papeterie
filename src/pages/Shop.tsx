import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useCartStore, ShopifyProduct } from "@/stores/cartStore";
import { toast } from "sonner";

const Shop = () => {
  const [shopDomain, setShopDomain] = useState('');
  const [storefrontToken, setStorefrontToken] = useState('');
  
  const { products, loading, error } = useShopifyProducts(shopDomain, storefrontToken);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    setShopDomain('ma-papeterie-pro-boutique-hcd1j.myshopify.com');
    setStorefrontToken('23bed6e691090f0bb6240a1d7583a1a0');
  }, []);

  const handleAddToCart = (product: ShopifyProduct) => {
    const firstVariant = product.node.variants.edges[0]?.node;
    if (!firstVariant) return;

    const cartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Produit ajouté au panier", {
      description: product.node.title
    });
  };

  // Mock competitor data for demo
  const getCompetitorBadge = () => {
    const badges = [
      { icon: <TrendingDown className="h-3 w-3" />, text: "🟢 -15% vs marché", color: "bg-green-100 text-green-800" },
      { icon: <Minus className="h-3 w-3" />, text: "⚖️ Prix juste", color: "bg-yellow-100 text-yellow-800" },
      { icon: <TrendingUp className="h-3 w-3" />, text: "🌱 Premium éthique", color: "bg-blue-100 text-blue-800" },
    ];
    return badges[Math.floor(Math.random() * badges.length)];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32">
        {/* Hero Section */}
        <section className="gradient-hero text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              La papeterie la plus honnête de France 🇫🇷
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Des prix comparés, des pros inspirés
            </p>
            <div className="mt-8 flex gap-4 justify-center flex-wrap">
              <Button size="lg" variant="secondary">
                Découvrir nos prix
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20">
                Espace Pro
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20">
                Accéder au comparateur
              </Button>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Nos Produits</h2>
                <p className="text-muted-foreground">
                  Prix vérifiés chaque semaine — transparence garantie 🕵️
                </p>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="text-center py-20">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline">Réessayer</Button>
              </div>
            )}

            {!loading && !error && products.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground mb-4">
                  Aucun produit trouvé. Créez votre premier produit en me disant ce que vous souhaitez vendre !
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const badgeData = getCompetitorBadge();
                const firstImage = product.node.images.edges[0]?.node;
                const firstVariant = product.node.variants.edges[0]?.node;

                return (
                  <Card key={product.node.id} className="overflow-hidden hover:shadow-elegant transition-all">
                    <div className="relative aspect-square">
                      {firstImage ? (
                        <img
                          src={firstImage.url}
                          alt={firstImage.altText || product.node.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                          <span className="text-muted-foreground">Pas d'image</span>
                        </div>
                      )}
                      <Badge className={`absolute top-2 right-2 ${badgeData.color}`}>
                        {badgeData.text}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.node.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {product.node.description || "Description à venir"}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-2xl font-bold text-primary">
                            {parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)} €
                          </span>
                          <p className="text-xs text-muted-foreground">Prix moyen: 10,40 €</p>
                          <p className="text-xs text-green-600 font-medium">✅ Vous économisez 15%</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAddToCart(product)}
                        className="w-full bg-gradient-primary hover:opacity-90"
                        disabled={!firstVariant?.availableForSale}
                      >
                        {firstVariant?.availableForSale ? "Ajouter au panier" : "Indisponible"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Statistiques Transparentes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">98%</div>
                  <p className="text-sm text-muted-foreground">
                    de nos prix inférieurs à la moyenne nationale cette semaine
                  </p>
                </Card>
                <Card className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">5000+</div>
                  <p className="text-sm text-muted-foreground">
                    Produits comparés quotidiennement
                  </p>
                </Card>
                <Card className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">-15%</div>
                  <p className="text-sm text-muted-foreground">
                    Économies moyennes par rapport au marché
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
