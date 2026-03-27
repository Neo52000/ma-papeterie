import { memo, useState } from "react";
import { ShoppingCart, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useProducts, type Product } from "@/hooks/useProducts";
import { ProductDetailModal } from "@/components/product/ProductDetailModal";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useNavigate } from "react-router-dom";

interface HomeBestSellersProps {
  title?: string;
  subtitle?: string;
  maxProducts?: number;
  catalogueLink?: string;
}

const HomeBestSellers = memo(function HomeBestSellers({
  title: titleProp,
  subtitle: subtitleProp,
  maxProducts = 8,
  catalogueLink = "/catalogue",
}: HomeBestSellersProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useCart();
  const { products: allProducts, loading, error } = useProducts(true);
  const navigate = useNavigate();

  const title = titleProp ?? "Les indispensables du moment";
  const subtitle = subtitleProp ?? "Les favoris de nos clients entreprises et particuliers.";
  const products = allProducts.slice(0, maxProducts);

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
      <section className="py-16 bg-[#f9f9ff]">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
              {title}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
    <section className="py-16 bg-[#f9f9ff]">
      <div className="container mx-auto px-4">
        {/* Header with "Voir tout" link */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-2xl md:text-[2rem] font-semibold text-[#121c2a] font-poppins">
              {title}
            </h2>
            <p className="text-[0.875rem] text-[#121c2a]/50 mt-1 font-inter">
              {subtitle}
            </p>
          </div>
          <button
            onClick={() => navigate(catalogueLink)}
            className="hidden md:flex items-center gap-1 text-[0.875rem] font-medium text-[#1e3a8a] hover:text-[#fd761a] transition-colors font-inter"
          >
            Voir tout le catalogue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Product grid — matching mockup B */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-[1rem] overflow-hidden hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              style={{ boxShadow: "0 20px 40px rgba(18, 28, 42, 0.04)" }}
              onClick={() => handleProductClick(product)}
            >
              {/* Image */}
              <div className="relative bg-white aspect-square flex items-center justify-center p-5">
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
                  <div className="absolute top-3 left-3 bg-[#fd761a] text-white px-2 py-0.5 rounded-[0.4rem] text-[0.65rem] font-bold uppercase tracking-[0.05em] font-inter">
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Brand label */}
                <p className="text-[0.65rem] text-[#121c2a]/30 uppercase tracking-[0.08em] font-semibold font-inter mb-1">
                  {product.brand || product.category}
                </p>

                {/* Product name */}
                <h3 className="font-medium text-[0.8rem] text-[#121c2a] line-clamp-2 font-inter leading-snug mb-3 min-h-[2.5rem]">
                  {product.name}
                </h3>

                {/* Price + Cart icon */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-[#121c2a] font-poppins">
                      {product.price.toFixed(2)} €
                    </span>
                    <span className="text-[0.65rem] text-[#121c2a]/40 ml-1 font-inter">
                      HT
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleAddToCart(product, e)}
                    disabled={(product.stock_quantity ?? 0) <= 0}
                    className="w-9 h-9 rounded-[0.5rem] bg-[#fd761a] hover:bg-[#9d4300] text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Ajouter au panier"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile "Voir tout" */}
        <div className="text-center mt-8 md:hidden">
          <Button
            variant="atelier-secondary"
            size="default"
            onClick={() => navigate(catalogueLink)}
          >
            Voir tout le catalogue
            <ArrowRight className="ml-2 w-4 h-4" />
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
