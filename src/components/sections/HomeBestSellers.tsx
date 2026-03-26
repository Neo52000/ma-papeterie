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
      <section className="py-24 bg-[#f9f9ff]">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
              Les indispensables du moment
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[1rem] bg-[#eff3ff] animate-pulse h-80" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || products.length === 0) return null;

  return (
    <section className="py-24 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
            Les indispensables du moment
          </h2>
          <p className="text-[0.875rem] text-[#121c2a]/60 mt-2 font-inter">
            Nos coups de cœur et bestsellers
          </p>
        </div>

        {/* No-Line Rule: cards on white, section on surface. No borders. */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-[1rem] overflow-hidden hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.06)" }}
              onClick={() => handleProductClick(product)}
            >
              {/* Image — rounded-lg with surface highlight behind */}
              <div className="relative bg-[#e6eeff]/30 aspect-square flex items-center justify-center p-6">
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
                  <Package className="w-16 h-16 text-[#c5c5d3]" />
                )}
                {product.badge && (
                  <div className="absolute top-3 left-3 bg-[#1e3a8a] text-white px-2.5 py-1 rounded-[0.5rem] text-[0.75rem] font-semibold uppercase tracking-[0.05em] font-inter">
                    {product.badge}
                  </div>
                )}
                <button
                  className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                    compareStore.has(product.id)
                      ? "bg-[#1e3a8a] text-white opacity-100"
                      : "bg-white/80 backdrop-blur-sm text-[#121c2a]/50 opacity-0 group-hover:opacity-100"
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

              {/* Content — spacing instead of borders */}
              <div className="p-5">
                <p className="text-[0.75rem] text-[#121c2a]/40 uppercase tracking-[0.05em] mb-1.5 font-inter">
                  {product.category}
                </p>
                <h3 className="font-semibold text-sm text-[#121c2a] line-clamp-2 mb-2 font-poppins">
                  {product.name}
                </h3>

                {/* Stock — label style */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.05em] mb-3 font-inter font-medium ${
                    (product.stock_quantity ?? 0) > 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (product.stock_quantity ?? 0) > 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {(product.stock_quantity ?? 0) > 0 ? "En stock" : "Rupture"}
                </span>

                {/* Price */}
                <div className="text-xl font-bold text-[#00236f] mb-4 font-poppins">
                  {(product.price_ttc ?? product.price).toFixed(2)} €{" "}
                  <span className="text-[0.75rem] font-normal text-[#121c2a]/40 font-inter">
                    TTC
                  </span>
                </div>

                <Button
                  variant="cta-orange"
                  className="w-full gap-2 bg-gradient-to-br from-[#fd761a] to-[#9d4300] hover:from-[#9d4300] hover:to-[#9d4300]"
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

        <div className="text-center mt-12">
          <Button
            variant="atelier-secondary"
            size="lg"
            className="border-[#c5c5d3]/25 text-[#00236f] hover:bg-[#e6eeff]"
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
                id: parseInt(selectedProduct.id.replace(/\D/g, "").slice(0, 8)) || 1,
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
