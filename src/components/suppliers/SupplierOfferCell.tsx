import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface OfferData {
  id: string;
  supplier_product_id: string;
  purchase_price_ht: number | null;
  pvp_ttc: number | null;
  stock_qty: number;
  is_active: boolean;
  last_seen_at: string;
}

interface SupplierOfferCellProps {
  offer: OfferData | undefined;
  isBestPrice: boolean;
  onToggle: (id: string, isActive: boolean) => void;
  isToggling: boolean;
}

export function SupplierOfferCell({
  offer,
  isBestPrice,
  onToggle,
  isToggling,
}: SupplierOfferCellProps) {
  if (!offer) {
    return (
      <div className="text-center text-muted-foreground/40 text-xs py-3">
        —
      </div>
    );
  }

  return (
    <div className={cn("space-y-1 text-xs", !offer.is_active && "opacity-50")}>
      {/* Supplier ref */}
      <div
        className="font-mono text-muted-foreground truncate max-w-[130px]"
        title={offer.supplier_product_id}
      >
        {offer.supplier_product_id}
      </div>

      {/* Purchase price HT */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">PA:</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            isBestPrice && offer.is_active && "text-green-700 font-bold"
          )}
        >
          {offer.purchase_price_ht != null
            ? `${Number(offer.purchase_price_ht).toFixed(2)} €`
            : "—"}
        </span>
      </div>

      {/* PVP TTC */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">PVP:</span>
        <span className="tabular-nums">
          {offer.pvp_ttc != null
            ? `${Number(offer.pvp_ttc).toFixed(2)} €`
            : "—"}
        </span>
      </div>

      {/* Stock */}
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Stock:</span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0",
            offer.stock_qty > 0
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-muted text-muted-foreground"
          )}
        >
          {offer.stock_qty}
        </Badge>
      </div>

      {/* Active toggle + last seen */}
      <div className="flex items-center justify-between pt-0.5">
        <Switch
          checked={offer.is_active}
          onCheckedChange={(checked) => onToggle(offer.id, checked)}
          disabled={isToggling}
          className="scale-75 origin-left"
        />
        <span className="text-[10px] text-muted-foreground">
          {offer.last_seen_at
            ? format(new Date(offer.last_seen_at), "dd/MM/yy", { locale: fr })
            : "—"}
        </span>
      </div>
    </div>
  );
}
