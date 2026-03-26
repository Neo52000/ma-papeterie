import { memo, useState } from "react";
import { ShoppingCart, Package, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useProducts, type Product } from "@/hooks/useProducts";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useCompareStore } from "@/stores/compareStore";

const HomeBestSellers = memo(function HomeBestSellers() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { products, loading, error } = useProducts(true);
  const compareStore = useCompareStore();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
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

  if (loading) {
    return (
      <section className="py-14 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#111827] font-poppins">
              Les indispensables du moment
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-[#F9FAFB] animate-pulse h-80"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) return null;

  return (
    <section className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#111827] font-poppins">
            Les indispensables du moment
          </h2>
          <p className="text-[#374151] mt-1">
            Nos coups de cœur et bestsellers
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="group bg-white border border-[#D1D5DB] rounded-lg overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              {/* Image */}
              <div className="relative bg-white aspect-square flex items-center justify-center p-4">
                {product.image_url ? (
                  <OptimizedImage
                    src={product.image_url}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    decoding="async"
                    width={200}
                    height={200}
                  />
                ) : (
                  <Package className="w-16 h-16 text-[#D1D5DB]" />
                )}
                {product.badge && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-semibold">
                    {product.badge}
                  </div>
                )}
                <button
                  className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
                    compareStore.has(product.id)
                      ? "bg-primary text-primary-foreground opacity-100"
                      : "bg-white/80 backdrop-blur text-[#374151] opacity-0 group-hover:opacity-100"
                  }`}
                  title="Comparer"
                  onClick={(e) => {
                    e.stopPropagation();
                    compareStore.toggle({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      price_ttc: product.price_ttc ?? null,
                      image_url: product.image_url,
                      category: product.category,
                      brand: product.brand ?? null,
                      description: product.description,
                      stock_quantity: product.stock_quantity ?? null,
                    });
                  }}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-3 border-t border-[#D1D5DB]/50">
                <p className="text-xs text-[#374151] uppercase tracking-wide mb-1">
                  {product.category}
                </p>
                <h3 className="font-semibold text-sm text-[#111827] line-clamp-2 mb-1">
                  {product.name}
                </h3>

                {/* Stock */}
                <span
                  className={`inline-flex items-center gap-1 text-xs mb-2 ${(product.stock_quantity ?? 0) > 0 ? "text-[#22C55E]" : "text-[#EF4444]"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${(product.stock_quantity ?? 0) > 0 ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}
                  />
                  {(product.stock_quantity ?? 0) > 0 ? "En stock" : "Rupture"}
                </span>

                {/* Price */}
                <div className="text-lg font-bold text-primary mb-2">
                  {(product.price_ttc ?? product.price).toFixed(2)} €{" "}
                  <span className="text-xs font-normal text-[#374151]">
                    TTC
                  </span>
                </div>

                <Button
                  variant="cta-orange"
                  className="w-full gap-2"
                  size="sm"
                  onClick={(e) => handleAddToCart(product, e)}
                  disabled={(product.stock_quantity ?? 0) <= 0}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ajouter au panier
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => (window.location.href = "/catalogue")}
          >
            Voir tous les produits
          </Button>
        </div>
      </div>

      <ProductDetailModal
        product={
          selectedProduct
            ? {
                ...selectedProduct,
                id:
                  parseInt(selectedProduct.id.replace(/\D/g, "").slice(0, 8)) ||
                  1,
                image: selectedProduct.image_url || "/placeholder.svg",
                price: selectedProduct.price.toString(),
                description: selectedProduct.description,
              }
            : null
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </section>
  );
});

export default HomeBestSellers;
