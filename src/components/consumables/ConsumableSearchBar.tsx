import { useState, useDeferredValue, useRef, useEffect } from "react";
import { Search, ShoppingCart, Award, Recycle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConsumablesSearch } from "@/hooks/consumables/useConsumablesSearch";
import { useCart } from "@/stores/mainCartStore";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import type { Consumable } from "@/hooks/consumables/useConsumablesByModel";

const typeLabels: Record<string, string> = {
  toner: "Toner",
  ink: "Encre",
  drum: "Tambour",
  fuser: "Fuser",
  developer: "Developpeur",
  maintenance_kit: "Kit maintenance",
};

export function ConsumableSearchBar() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { data: results = [], isLoading } = useConsumablesSearch(deferredQuery, 8);
  const { addToCart } = useCart();
  const priceMode = usePriceModeStore((s) => s.mode);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && query.length >= 2;

  const handleAddToCart = (c: Consumable, e: React.MouseEvent) => {
    e.stopPropagation();
    const price = getPriceValue(c.price_ht, c.price_ttc, priceMode);
    addToCart({
      id: c.id,
      name: c.name,
      price: price.toFixed(2),
      image: c.image_url || "",
      category: `Consommables / ${typeLabels[c.consumable_type] || c.consumable_type}`,
      stock_quantity: c.stock_quantity,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher par référence, nom ou EAN (ex : CE505A, TN-2420...)"
          className="pl-10 pr-10"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isLoading && query.length >= 2 && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {results.length === 0 && !isLoading && (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Aucun consommable trouvé pour « {query} »
            </p>
          )}
          {results.map((c) => {
            const price = getPriceValue(c.price_ht, c.price_ttc, priceMode);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name || "Consommable"} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.sku && (
                      <span className="text-xs text-muted-foreground">Ref: {c.sku}</span>
                    )}
                    {c.is_oem ? (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[9px] px-1 py-0">
                        <Award className="w-2.5 h-2.5 mr-0.5" />
                        OEM
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        <Recycle className="w-2.5 h-2.5 mr-0.5" />
                        Compatible
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{price.toFixed(2)}€</span>
                    <span className="text-[9px] text-muted-foreground ml-0.5">{priceLabel(priceMode)}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={(e) => handleAddToCart(c, e)}>
                    <ShoppingCart className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
