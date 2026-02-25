import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PromotionsSeoContent } from "@/components/sections/SeoContent";
import { Timer, Percent, Gift, Star, Copy, Check, ShoppingCart, Tag, Loader2 } from "lucide-react";
import { useShopifyProducts } from "@/hooks/useShopifyProducts";
import { useCartStore, ShopifyProduct } from "@/stores/cartStore";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { formatPrice } from "@/lib/shopify";
import { toast } from "sonner";

interface PromoCode {
  code: string;
  discount: string;
  description: string;
  validUntil: string;
  type: 'percentage' | 'fixed' | 'shipping';
}

const PROMO_CODES: PromoCode[] = [
  {
    code: "BIENVENUE10",
    discount: "10%",
    description: "10% de réduction sur votre première commande",
    validUntil: "31 Décembre 2026",
    type: "percentage"
  }
];

const PromoCodeCard = ({ promo }: { promo: PromoCode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promo.code);
    setCopied(true);
    toast.success("Code copié !", {
      description: `Le code ${promo.code} a été copié dans votre presse-papier`,
      position: "top-center"
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-2 border-dashed border-accent/50 hover:border-accent transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-5 w-5 text-accent" />
              <Badge variant="secondary" className="bg-accent/10 text-accent font-semibold">
                -{promo.discount}
              </Badge>
            </div>
            <h3 className="font-bold text-lg mb-1">{promo.code}</h3>
            <p className="text-muted-foreground text-sm mb-2">{promo.description}</p>
            <p className="text-xs text-muted-foreground">Valide jusqu'au {promo.validUntil}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copier
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SaleProductCard = ({ product }: { product: ShopifyProduct }) => {
  const addItem = useCartStore(state => state.addItem);
  const firstImage = product.node.images.edges[0]?.node;
  const firstVariant = product.node.variants.edges[0]?.node;
  const currentPrice = parseFloat(product.node.priceRange.minVariantPrice.amount);
  const compareAtPrice = firstVariant?.compareAtPrice ? parseFloat(firstVariant.compareAtPrice.amount) : null;
  const currencyCode = product.node.priceRange.minVariantPrice.currencyCode;
  
  const discount = compareAtPrice ? Math.round(((compareAtPrice - currentPrice) / compareAtPrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!firstVariant) return;

    addItem({
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
    <Link to={`/product/${product.node.handle}`}>
      <Card className="group overflow-hidden hover:shadow-elegant transition-all duration-300 h-full flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={firstImage.altText || product.node.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Pas d'image</span>
            </div>
          )}
          
          {/* Discount Badge */}
          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">
              -{discount}%
            </Badge>
          )}
          
          {/* Wishlist Button */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton product={product} />
          </div>
        </div>
        
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {product.node.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {product.node.description || "Description à venir"}
            </p>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-accent">
                {formatPrice(currentPrice.toString(), currencyCode)}
              </span>
              {compareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(compareAtPrice.toString(), currencyCode)}
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleAddToCart}
              className="w-full"
              variant="default"
              disabled={!firstVariant?.availableForSale}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {firstVariant?.availableForSale ? "Ajouter au panier" : "Indisponible"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default function Promotions() {
  const { products, loading } = useShopifyProducts();
  const [email, setEmail] = useState("");
  
  // Filter products with compareAtPrice (on sale) - for now show all products as featured deals
  const saleProducts = products.slice(0, 8);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Inscription réussie !", {
      description: "Vous recevrez nos meilleures offres par email.",
      position: "top-center"
    });
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Promotions & offres spéciales — Fournitures à prix réduits</title>
        <meta name="description" content="Profitez de nos promotions sur les fournitures scolaires et de bureau. Codes promo, ventes flash et offres spéciales toute l'année." />
        <link rel="canonical" href="https://ma-papeterie.fr/promotions" />
        <meta property="og:title" content="Promotions & offres spéciales — Fournitures à prix réduits" />
        <meta property="og:description" content="Profitez de nos promotions sur les fournitures scolaires et de bureau. Codes promo, ventes flash et offres spéciales toute l'année." />
        <meta property="og:url" content="https://ma-papeterie.fr/promotions" />
      </Helmet>
      <Header />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-accent/10 to-background py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <Badge className="bg-accent text-accent-foreground mb-4">
              <Percent className="h-3 w-3 mr-1" />
              Offres Spéciales
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Nos Promotions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Profitez de nos offres spéciales et économisez sur vos fournitures préférées
            </p>
          </div>
        </section>

        {/* Active Promo Codes Section */}
        <section className="py-12 border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-accent/10 rounded-full">
                <Tag className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Codes Promotionnels Actifs</h2>
                <p className="text-muted-foreground">Utilisez ces codes lors de votre commande</p>
              </div>
            </div>
            
            {PROMO_CODES.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROMO_CODES.map((promo) => (
                  <PromoCodeCard key={promo.code} promo={promo} />
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="p-8 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun code promo actif pour le moment</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Featured Deals Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Offres du Moment</h2>
                  <p className="text-muted-foreground">Découvrez nos meilleures offres</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/shop">Voir tout</Link>
              </Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : saleProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {saleProducts.map((product) => (
                  <SaleProductCard key={product.node.id} product={product} />
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Aucune offre disponible</h3>
                  <p className="text-muted-foreground mb-6">
                    Revenez bientôt pour découvrir nos nouvelles promotions !
                  </p>
                  <Button asChild>
                    <Link to="/shop">Découvrir nos produits</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Flash Sale Banner */}
        <section className="py-8 bg-accent/5">
          <div className="container mx-auto px-4">
            <Card className="bg-gradient-to-r from-accent/20 to-primary/10 border-accent/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent rounded-full">
                      <Timer className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground">Ventes Flash à venir !</h3>
                      <p className="text-muted-foreground">Inscrivez-vous pour être notifié des prochaines ventes flash</p>
                    </div>
                  </div>
                  <Button size="lg" asChild>
                    <a href="#newsletter">M'inscrire</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section id="newsletter" className="py-12">
          <div className="container mx-auto px-4">
            <Card className="bg-secondary/20">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary rounded-full">
                    <Gift className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-4">Ne ratez aucune promotion !</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Inscrivez-vous à notre newsletter et recevez en exclusivité nos meilleures offres et un code de bienvenue.
                </p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="Votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit">
                    S'inscrire
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
        
        <PromotionsSeoContent />
      </main>

      <Footer />
    </div>
  );
}
