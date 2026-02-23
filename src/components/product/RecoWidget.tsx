import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaf, ShoppingCart, PackagePlus } from "lucide-react";
import {
  useProductRecommendations,
  useLogRecommendationEvent,
  RELATION_LABELS,
  type RecoProduct,
  type RelationType,
} from "@/hooks/useRecommendations";

interface Props {
  productId: string;
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  products: RecoProduct[];
  relationType: RelationType;
  sourceProductId: string;
  onAddToCart: (p: RecoProduct, position: number) => void;
  onClickProduct: (p: RecoProduct, position: number) => void;
}

function RecoSection({ title, icon, products, sourceProductId, onAddToCart, onClickProduct }: SectionProps) {
  if (products.length === 0) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((p, idx) => (
          <div key={p.id} className="border rounded-lg p-3 flex flex-col gap-2 bg-card hover:shadow-sm transition-shadow">
            <Link
              to={`/produit/${p.id}`}
              className="block"
              onClick={() => onClickProduct(p, idx)}
            >
              <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Photo
                  </div>
                )}
              </div>
              <p className="text-xs font-medium line-clamp-2 text-foreground">{p.name}</p>
              {p.eco && (
                <Badge variant="secondary" className="w-fit text-xs py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Leaf className="h-3 w-3 mr-1" />
                  Éco
                </Badge>
              )}
              {p.price_ttc != null && (
                <p className="text-sm font-bold text-primary">{p.price_ttc.toFixed(2)} €</p>
              )}
              <p className="text-xs text-muted-foreground italic">{p.reason}</p>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs gap-1 mt-auto"
              disabled={p.stock_quantity === 0}
              onClick={() => onAddToCart(p, idx)}
            >
              <ShoppingCart className="h-3 w-3" />
              {p.stock_quantity === 0 ? "Rupture" : "Ajouter"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────

export function RecoWidget({ productId }: Props) {
  const { addToCart } = useCart();
  const logEvent = useLogRecommendationEvent();
  const logged = useRef(false);

  const { data: recos, isLoading } = useProductRecommendations(
    productId,
    ["complement", "alternative_durable", "compatibility"],
    8,
  );

  const complements = (recos ?? []).filter(
    (p) => p.relation_type === "complement" || p.relation_type === "compatibility",
  );
  const alternatives = (recos ?? []).filter((p) => p.relation_type === "alternative_durable");

  // Log "shown" une seule fois par montage
  useEffect(() => {
    if (logged.current || !recos || recos.length === 0) return;
    logged.current = true;
    recos.forEach((p, idx) => {
      logEvent.mutate({
        source_product_id: productId,
        product_id: p.id,
        relation_type: p.relation_type,
        event_type: "shown",
        placement: "product_page",
        position: idx,
      });
    });
  }, [recos]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = (p: RecoProduct, position: number) => {
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price_ttc?.toFixed(2) ?? "0",
      image: p.image_url ?? "",
      category: p.category,
      stock_quantity: p.stock_quantity ?? 0,
    });
    logEvent.mutate({
      source_product_id: productId,
      product_id: p.id,
      relation_type: p.relation_type,
      event_type: "added_to_cart",
      placement: "product_page",
      position,
    });
  };

  const handleClickProduct = (p: RecoProduct, position: number) => {
    logEvent.mutate({
      source_product_id: productId,
      product_id: p.id,
      relation_type: p.relation_type,
      event_type: "clicked",
      placement: "product_page",
      position,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  if (!recos || recos.length === 0) return null;

  return (
    <div className="space-y-6">
      <RecoSection
        title={RELATION_LABELS.complement}
        icon={<PackagePlus className="h-4 w-4 text-blue-600" />}
        products={complements}
        relationType="complement"
        sourceProductId={productId}
        onAddToCart={handleAddToCart}
        onClickProduct={handleClickProduct}
      />
      <RecoSection
        title={RELATION_LABELS.alternative_durable}
        icon={<Leaf className="h-4 w-4 text-emerald-600" />}
        products={alternatives}
        relationType="alternative_durable"
        sourceProductId={productId}
        onAddToCart={handleAddToCart}
        onClickProduct={handleClickProduct}
      />
    </div>
  );
}
