import { useProductSuppliers } from "@/hooks/useProductSuppliers";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Star, Clock, Truck } from "lucide-react";

interface ProductSuppliersBlockProps {
  productId: string;
  ean?: string | null;
}

export function ProductSuppliersBlock({ productId, ean }: ProductSuppliersBlockProps) {
  const { isAdmin } = useAuth();
  const { data: suppliers, isLoading } = useProductSuppliers(productId, ean);

  if (!isAdmin) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement fournisseurs...
      </div>
    );
  }
  if (!suppliers || suppliers.length === 0) return null;

  const minPrice = Math.min(...suppliers.filter(s => s.supplier_price != null).map(s => s.supplier_price!));

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Fournisseurs ({suppliers.length})
          <Badge variant="outline" className="ml-auto text-xs">Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suppliers.map((sp, idx) => (
          <div key={sp.id}>
            {idx > 0 && <Separator className="mb-3" />}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{sp.supplier_name}</span>
                  {sp.is_preferred && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Préféré
                    </Badge>
                  )}
                  {sp.supplier_price != null && sp.supplier_price === minPrice && suppliers.length > 1 && (
                    <Badge className="bg-green-500/20 text-green-700 border-green-300 text-xs">
                      Meilleur prix
                    </Badge>
                  )}
                </div>
                {sp.supplier_reference && (
                  <p className="text-xs text-muted-foreground">Réf: {sp.supplier_reference}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {sp.lead_time_days != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sp.lead_time_days}j
                    </span>
                  )}
                  {sp.stock_quantity != null && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Stock: {sp.stock_quantity}
                    </span>
                  )}
                  {sp.source_type && (
                    <span className="uppercase">{sp.source_type}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {sp.supplier_price != null ? (
                  <span className="font-bold text-sm">{sp.supplier_price.toFixed(2)}€ HT</span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
