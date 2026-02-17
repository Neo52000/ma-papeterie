import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useShopifyProduct } from "@/hooks/useShopifyProducts";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CompetitorPricesBlock } from "@/components/product/CompetitorPricesBlock";
import { ProductSuppliersBlock } from "@/components/product/ProductSuppliersBlock";
import { 
  Loader2, 
  ShoppingCart, 
  ChevronLeft, 
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Check,
  Minus,
  Plus,
  Star
} from "lucide-react";
import { toast } from "sonner";

const ProductPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const { product, loading, error } = useShopifyProduct(handle);
  const addItem = useCartStore(state => state.addItem);
  
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Get selected variant
  const selectedVariant = useMemo(() => {
    if (!product) return null;
    const variantId = selectedVariantId || product.variants.edges[0]?.node.id;
    return product.variants.edges.find(v => v.node.id === variantId)?.node || null;
  }, [product, selectedVariantId]);

  // Get images
  const images = product?.images.edges || [];
  const currentImage = images[currentImageIndex]?.node;

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;

    const cartItem = {
      product: { node: product },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Produit ajouté au panier", {
      description: `${product.title} x${quantity}`,
      position: "top-center"
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du produit...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produit introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Le produit que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Button asChild>
              <Link to="/shop">Retour à la boutique</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const price = parseFloat(selectedVariant?.price.amount || product.priceRange.minVariantPrice.amount);
  const currencyCode = selectedVariant?.price.currencyCode || product.priceRange.minVariantPrice.currencyCode;
  const compareAtPrice = selectedVariant?.compareAtPrice ? parseFloat(selectedVariant.compareAtPrice.amount) : null;
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{product.seo?.title || product.title} | Ma Papeterie Pro</title>
        <meta name="description" content={product.seo?.description || product.description?.slice(0, 160)} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description?.slice(0, 160)} />
        {currentImage && <meta property="og:image" content={currentImage.url} />}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: currentImage?.url,
            offers: {
              "@type": "Offer",
              price: price,
              priceCurrency: currencyCode,
              availability: selectedVariant?.availableForSale 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock"
            }
          })}
        </script>
      </Helmet>
      
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center gap-2 text-muted-foreground">
              <li><Link to="/" className="hover:text-primary">Accueil</Link></li>
              <li>/</li>
              <li><Link to="/shop" className="hover:text-primary">Boutique</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium truncate max-w-[200px]">{product.title}</li>
            </ol>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-muted/30 rounded-2xl overflow-hidden">
                {currentImage ? (
                  <img
                    src={currentImage.url}
                    alt={currentImage.altText || product.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground">Pas d'image</span>
                  </div>
                )}
                
                {images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {discount && discount > 0 && (
                  <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground">
                    -{discount}%
                  </Badge>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={img.node.url}
                        alt={img.node.altText || `${product.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {product.vendor && (
                <p className="text-sm text-muted-foreground uppercase tracking-wide">
                  {product.vendor}
                </p>
              )}
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {product.title}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(price.toString(), currencyCode)}
                </span>
                {compareAtPrice && compareAtPrice > price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(compareAtPrice.toString(), currencyCode)}
                  </span>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2">
                {selectedVariant?.availableForSale ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">En stock</span>
                  </>
                ) : (
                  <>
                    <span className="text-destructive font-medium">Rupture de stock</span>
                  </>
                )}
              </div>

              <Separator />

              {/* Variants */}
              {product.options && product.options.length > 0 && product.options[0].name !== "Title" && (
                <div className="space-y-4">
                  {product.options.map((option) => (
                    <div key={option.name}>
                      <label className="text-sm font-medium mb-2 block">
                        {option.name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const variant = product.variants.edges.find(v => 
                            v.node.selectedOptions.some(opt => 
                              opt.name === option.name && opt.value === value
                            )
                          )?.node;
                          const isSelected = selectedVariant?.selectedOptions.some(
                            opt => opt.name === option.name && opt.value === value
                          );
                          
                          return (
                            <Button
                              key={value}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => variant && setSelectedVariantId(variant.id)}
                              disabled={!variant?.availableForSale}
                            >
                              {value}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quantité</label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add to Cart */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!selectedVariant?.availableForSale}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {selectedVariant?.availableForSale 
                  ? `Ajouter au panier - ${formatPrice((price * quantity).toString(), currencyCode)}`
                  : "Produit indisponible"
                }
              </Button>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <Card className="p-3 text-center">
                  <CardContent className="p-0">
                    <Truck className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Livraison rapide</p>
                  </CardContent>
                </Card>
                <Card className="p-3 text-center">
                  <CardContent className="p-0">
                    <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Paiement sécurisé</p>
                  </CardContent>
                </Card>
                <Card className="p-3 text-center">
                  <CardContent className="p-0">
                    <RotateCcw className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Retours 30j</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Description */}
              {product.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Description</h2>
                  {product.descriptionHtml ? (
                    <div 
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {product.description}
                    </p>
                  )}
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Competitor Prices Block */}
              {product.id && (
                <CompetitorPricesBlock 
                  productId={product.id} 
                  ourPrice={price}
                  packSizes={[1, 5]}
                />
              )}

              {/* Suppliers Block (admin only) */}
              {product.id && (
                <ProductSuppliersBlock 
                  productId={product.id}
                  ean={(product as any).ean}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductPage;
