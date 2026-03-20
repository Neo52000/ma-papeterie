import { useState } from "react";
import { Loader2, ShoppingCart, Award, Recycle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConsumablesByModel, type ConsumableFilters, type Consumable } from "@/hooks/consumables/useConsumablesByModel";
import { useCart } from "@/contexts/CartContext";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { getPriceValue, priceLabel } from "@/lib/formatPrice";
import { ConsumableCrossSelling } from "./ConsumableCrossSelling";

interface ConsumableResultsProps {
  modelId: string;
  modelName: string;
  brandName: string;
}

const typeLabels: Record<string, string> = {
  toner: "Toner",
  ink: "Encre",
  drum: "Tambour",
  fuser: "Fuser",
  developer: "Developpeur",
  maintenance_kit: "Kit maintenance",
};

const colorLabels: Record<string, string> = {
  black: "Noir",
  cyan: "Cyan",
  magenta: "Magenta",
  yellow: "Jaune",
  "tri-color": "Tricolore",
  multi: "Multipack",
};

export function ConsumableResults({ modelId, modelName, brandName }: ConsumableResultsProps) {
  const { addToCart } = useCart();
  const priceMode = usePriceModeStore((s) => s.mode);
  const [filters, setFilters] = useState<ConsumableFilters>({});
  const [selectedConsumableId, setSelectedConsumableId] = useState<string | null>(null);

  const { data: consumables = [], isLoading } = useConsumablesByModel(modelId, filters);

  const handleAddToCart = (c: Consumable) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={filters.consumable_type || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, consumable_type: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="toner">Toner</SelectItem>
            <SelectItem value="ink">Encre</SelectItem>
            <SelectItem value="drum">Tambour</SelectItem>
            <SelectItem value="fuser">Fuser</SelectItem>
            <SelectItem value="maintenance_kit">Kit maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.is_oem === true ? "oem" : filters.is_oem === false ? "compatible" : "all"}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              is_oem: v === "all" ? null : v === "oem",
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Origine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="oem">Original (OEM)</SelectItem>
            <SelectItem value="compatible">Compatible</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.color || "all"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, color: v === "all" ? undefined : v }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Couleur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes couleurs</SelectItem>
            <SelectItem value="black">Noir</SelectItem>
            <SelectItem value="cyan">Cyan</SelectItem>
            <SelectItem value="magenta">Magenta</SelectItem>
            <SelectItem value="yellow">Jaune</SelectItem>
            <SelectItem value="multi">Multipack</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {consumables.length} consommable{consumables.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {consumables.map((c) => {
          const price = getPriceValue(c.price_ht, c.price_ttc, priceMode);
          return (
            <Card
              key={c.id}
              className={`p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer ${
                selectedConsumableId === c.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() =>
                setSelectedConsumableId(selectedConsumableId === c.id ? null : c.id)
              }
            >
              {/* Image */}
              <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {c.is_oem ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px]">
                    <Award className="w-3 h-3 mr-1" />
                    Original
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    <Recycle className="w-3 h-3 mr-1" />
                    Compatible
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {typeLabels[c.consumable_type] || c.consumable_type}
                </Badge>
                {c.color && (
                  <Badge variant="outline" className="text-[10px]">
                    {colorLabels[c.color] || c.color}
                  </Badge>
                )}
                {c.capacity === "high_yield" && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
                    Haute capacit\u00e9
                  </Badge>
                )}
              </div>

              {/* Name + details */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium leading-tight line-clamp-2">{c.name}</h4>
                {c.page_yield && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{c.page_yield.toLocaleString("fr-FR")} pages
                  </p>
                )}
                {c.sku && (
                  <p className="text-xs text-muted-foreground">Ref: {c.sku}</p>
                )}
              </div>

              {/* Price + CTA */}
              <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/50">
                <div>
                  <span className="text-lg font-bold text-primary">
                    {price.toFixed(2)}&euro;
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {priceLabel(priceMode)}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(c);
                  }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                  Ajouter
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {consumables.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucun consommable trouv\u00e9 pour {brandName} {modelName} avec ces filtres.
        </p>
      )}

      {/* Cross-selling section */}
      {selectedConsumableId && (
        <ConsumableCrossSelling consumableId={selectedConsumableId} />
      )}
    </div>
  );
}
