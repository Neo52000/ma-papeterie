import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Minus, Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fetchProductByHandle, formatPrice } from "@/lib/shopify";
import { sanitizeHtml } from "@/lib/sanitize";
import { useShopifyCart, type ShopifyProduct } from "@/stores/shopifyCartStore";
import { ShopifyCartDrawer } from "@/components/cart/ShopifyCartDrawer";

type Variant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

export default function ShopifyProductPage({ handle }: { handle: string }) {
  const [product, setProduct] = useState<ShopifyProduct["node"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const addItem = useShopifyCart((s) => s.addItem);

  useEffect(() => {
    let cancelled = false;
    fetchProductByHandle(handle)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        const firstAvailable = p?.variants?.edges?.find(
          (e: { node: Variant }) => e.node.availableForSale,
        )?.node;
        setSelectedVariantId((firstAvailable || p?.variants?.edges?.[0]?.node)?.id ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    if (product?.title) {
      document.title = `${product.title} — Ma Papeterie`;
    }
  }, [product]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">Produit introuvable</h1>
        <p className="text-muted-foreground">
          Ce produit n'existe pas ou n'est plus disponible.
        </p>
      </div>
    );
  }

  const variants = product.variants.edges.map((e) => e.node);
  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0];
  const images = product.images.edges;
  const hasVariants = variants.length > 1;

  const handleAddToCart = () => {
    if (!selectedVariant || !product) return;
    addItem({
      product: { node: product },
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions,
    });
    toast.success(`${product.title} ajouté au panier`, {
      description: `${quantity} × ${formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex justify-end mb-4">
        <ShopifyCartDrawer />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-secondary/10">
            {images[activeImage]?.node ? (
              <img
                src={images[activeImage].node.url}
                alt={images[activeImage].node.altText ?? product.title}
                className="w-full h-full object-contain"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Aucune image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={img.node.url}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    idx === activeImage ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.node.url}
                    alt={img.node.altText ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          {product.vendor && (
            <Badge variant="outline" className="text-xs">
              {product.vendor}
            </Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold font-poppins leading-tight">
            {product.title}
          </h1>

          {selectedVariant && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold">
                {formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
              </span>
              {selectedVariant.compareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(
                    selectedVariant.compareAtPrice.amount,
                    selectedVariant.compareAtPrice.currencyCode,
                  )}
                </span>
              )}
            </div>
          )}

          {selectedVariant?.availableForSale ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> En stock
            </div>
          ) : (
            <div className="text-sm text-destructive">Indisponible</div>
          )}

          {hasVariants && (
            <div>
              <div className="text-sm font-medium mb-2">Variante</div>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    disabled={!v.availableForSale}
                    className={`px-3 py-1.5 rounded-md border text-sm transition ${
                      v.id === selectedVariantId
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + CTA */}
          <div className="flex items-stretch gap-3 pt-2">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center tabular-nums">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant?.availableForSale}
              size="lg"
              className="flex-1"
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ajouter au panier
            </Button>
          </div>

          {product.descriptionHtml && (
            <div
              className="prose prose-sm max-w-none pt-6 border-t"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.descriptionHtml) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
