import { useProductOffers } from "@/hooks/useProductOffers";
import { useAuth } from "@/stores/authStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Star, Clock, Truck, CircleDot } from "lucide-react";
import { SUPPLIER_BADGE_COLORS } from "@/types/supplier";
import type { CatalogItem } from "@/types/supplier";

interface ProductSuppliersBlockProps {
  productId: string;
  ean?: string | null;
}

export function ProductSuppliersBlock({ productId }: ProductSuppliersBlockProps) {
  const { isAdmin } = useAuth();
  const { offers, isLoading } = useProductOffers(productId);

  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement fournisseurs...
      </div>
    );
  }

  if (offers.length === 0) return null;

  const prices = offers.filter(o => o.purchase_price_ht != null).map(o => o.purchase_price_ht!);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Fournisseurs ({offers.length})
          <Badge variant="outline" className="ml-auto text-xs">Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {offers.map((offer: CatalogItem, idx: number) => {
          const badgeColor = offer.supplier_code
            ? SUPPLIER_BADGE_COLORS[offer.supplier_code as keyof typeof SUPPLIER_BADGE_COLORS] ?? ""
            : "";
          return (
            <div key={offer.offer_id}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={badgeColor}>
                      {offer.supplier_name}
                    </Badge>
                    {offer.is_preferred && (
                      <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Préféré
                      </Badge>
                    )}
                    {offer.purchase_price_ht != null && minPrice != null && offer.purchase_price_ht === minPrice && offers.length > 1 && (
                      <Badge className="bg-green-500/20 text-green-700 border-green-300 text-xs">
                        Meilleur prix
                      </Badge>
                    )}
                    {!offer.is_active && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Inactif
                      </Badge>
                    )}
                  </div>
                  {offer.supplier_sku && (
                    <p className="text-xs text-muted-foreground">Réf: {offer.supplier_sku}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {offer.delivery_delay_days != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {offer.delivery_delay_days}j
                      </span>
                    )}
                    {offer.stock_qty != null && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Stock: {offer.stock_qty}
                      </span>
                    )}
                    {offer.pvp_ttc != null && (
                      <span className="flex items-center gap-1">
                        <CircleDot className="h-3 w-3" />
                        PVP: {offer.pvp_ttc.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {offer.purchase_price_ht != null ? (
                    <span className="font-bold text-sm">{offer.purchase_price_ht.toFixed(2)}€ HT</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Prix N/A</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
