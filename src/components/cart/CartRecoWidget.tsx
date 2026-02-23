import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Leaf, Plus } from "lucide-react";
import {
  useCartRecommendations,
  useLogRecommendationEvent,
  type RecoProduct,
} from "@/hooks/useRecommendations";

interface Props {
  cartProductIds: string[];
}

export function CartRecoWidget({ cartProductIds }: Props) {
  const { addToCart } = useCart();
  const logEvent = useLogRecommendationEvent();
  const logged = useRef<string>("");

  const { data: recos } = useCartRecommendations(cartProductIds, 3);

  // Log "shown" quand les recos changent (nouveaux produits dans panier)
  const key = cartProductIds.join(",");
  useEffect(() => {
    if (!recos || recos.length === 0 || logged.current === key) return;
    logged.current = key;
    recos.forEach((p, idx) => {
      logEvent.mutate({
        product_id: p.id,
        relation_type: p.relation_type,
        event_type: "shown",
        placement: "cart",
        position: idx,
      });
    });
  }, [recos, key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!recos || recos.length === 0) return null;

  const handleAdd = (p: RecoProduct, position: number) => {
    addToCart({
      id: p.id,
      name: p.name,
      price: p.price_ttc?.toFixed(2) ?? "0",
      image: p.image_url ?? "",
      category: p.category,
      stock_quantity: p.stock_quantity ?? 0,
    });
    logEvent.mutate({
      product_id: p.id,
      relation_type: p.relation_type,
      event_type: "added_to_cart",
      placement: "cart",
      position,
    });
  };

  const handleClick = (p: RecoProduct, position: number) => {
    logEvent.mutate({
      product_id: p.id,
      relation_type: p.relation_type,
      event_type: "clicked",
      placement: "cart",
      position,
    });
  };

  return (
    <div className="mt-4">
      <Separator className="mb-4" />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Ne pas oublier…
      </p>
      <div className="space-y-2">
        {recos.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
            <Link
              to={`/produit/${p.id}`}
              className="shrink-0"
              onClick={() => handleClick(p, idx)}
            >
              <div className="h-12 w-12 rounded-md overflow-hidden bg-muted">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/produit/${p.id}`}
                className="text-xs font-medium line-clamp-1 hover:underline"
                onClick={() => handleClick(p, idx)}
              >
                {p.name}
              </Link>
              <div className="flex items-center gap-1 mt-0.5">
                {p.eco && (
                  <Badge variant="secondary" className="text-xs py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Leaf className="h-3 w-3" />
                  </Badge>
                )}
                {p.price_ttc != null && (
                  <span className="text-xs font-bold text-primary">{p.price_ttc.toFixed(2)} €</span>
                )}
              </div>
            </div>

            <Button
              size="icon"
              variant="outline"
              className="shrink-0 h-8 w-8"
              disabled={p.stock_quantity === 0}
              onClick={() => handleAdd(p, idx)}
              title={p.stock_quantity === 0 ? "Rupture de stock" : `Ajouter ${p.name}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
