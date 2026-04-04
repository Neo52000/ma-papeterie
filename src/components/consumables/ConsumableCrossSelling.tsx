import { Loader2, ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConsumableCrossSelling } from "@/hooks/consumables/useConsumableCrossSelling";
import { useCart } from "@/stores/mainCartStore";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import type { Consumable } from "@/hooks/consumables/useConsumablesByModel";

interface ConsumableCrossSellingProps {
  consumableId: string;
}

const relationLabels: Record<string, string> = {
  upsell: "Capacit\u00e9 sup\u00e9rieure",
  cross_sell: "Compl\u00e9ment",
  bundle: "Pack",
};

export function ConsumableCrossSelling({ consumableId }: ConsumableCrossSellingProps) {
  const { data: related = [], isLoading } = useConsumableCrossSelling(consumableId);
  const { addToCart } = useCart();
  const priceMode = usePriceModeStore((s) => s.mode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (related.length === 0) return null;

  const handleAddToCart = (c: Consumable) => {
    const price = getPriceValue(c.price_ht, c.price_ttc, priceMode);
    addToCart({
      id: c.id,
      name: c.name,
      price: price.toFixed(2),
      image: c.image_url || "",
      category: "Consommables",
      stock_quantity: c.stock_quantity,
    });
  };

  return (
    <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-primary" />
        Produits associ\u00e9s
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {related.map((c) => {
          const price = getPriceValue(c.price_ht, c.price_ttc, priceMode);
          return (
            <div
              key={c.id}
              className="min-w-[200px] max-w-[200px] flex flex-col gap-2 p-3 rounded-lg bg-card border border-border"
            >
              <Badge variant="outline" className="text-[10px] w-fit">
                {relationLabels[c.link_type] || "Associ\u00e9"}
              </Badge>
              <p className="text-sm font-medium line-clamp-2">{c.name}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-sm font-bold text-primary">
                  {price.toFixed(2)}&euro;
                  <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                    {priceLabel(priceMode)}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => handleAddToCart(c)}>
                  <ShoppingCart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
