import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProductRollupHeaderProps {
  productName: string;
  publicPriceTtc: number | null;
  publicPriceSource: string | null;
  publicPriceUpdatedAt: string | null;
  isAvailable: boolean;
  availableQtyTotal: number;
  onRecompute: () => void;
  isRecomputing: boolean;
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  PVP_ALKOR:    { label: "PVP ALKOR",    className: "bg-green-100 text-green-800 border-green-300" },
  PVP_COMLANDI: { label: "PVP COMLANDI", className: "bg-blue-100 text-blue-800 border-blue-300" },
  PVP_SOFT:     { label: "PVP SOFT",     className: "bg-purple-100 text-purple-800 border-purple-300" },
  COEF:         { label: "COEF",         className: "bg-orange-100 text-orange-800 border-orange-300" },
};

export function ProductRollupHeader({
  productName,
  publicPriceTtc,
  publicPriceSource,
  publicPriceUpdatedAt,
  isAvailable,
  availableQtyTotal,
  onRecompute,
  isRecomputing,
}: ProductRollupHeaderProps) {
  const sourceBadge = publicPriceSource ? SOURCE_BADGE[publicPriceSource] : null;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{productName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Offres fournisseurs multi-sources</p>
        </div>
        <Button
          onClick={onRecompute}
          disabled={isRecomputing}
          variant="outline"
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRecomputing ? 'animate-spin' : ''}`} />
          Recalculer rollups
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Disponibilité */}
        <div className="bg-muted/40 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Disponibilité</p>
          <div className="flex items-center gap-1.5">
            {isAvailable ? (
              <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="font-semibold text-green-700">Disponible</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-destructive" /><span className="font-semibold text-destructive">Indisponible</span></>
            )}
          </div>
        </div>

        {/* Prix public TTC */}
        <div className="bg-muted/40 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Prix public TTC</p>
          <div className="flex items-center gap-2 flex-wrap">
            {publicPriceTtc != null ? (
              <span className="font-bold text-lg text-foreground">{publicPriceTtc.toFixed(2)} €</span>
            ) : (
              <span className="text-destructive font-semibold">—</span>
            )}
            {sourceBadge && (
              <Badge variant="outline" className={`text-xs ${sourceBadge.className}`}>
                {sourceBadge.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Stock mutualisé */}
        <div className="bg-muted/40 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Stock mutualisé</p>
          <span className="font-bold text-lg text-foreground">{availableQtyTotal}</span>
          <span className="text-xs text-muted-foreground"> unités</span>
        </div>

        {/* Dernière màj */}
        <div className="bg-muted/40 rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Dernière màj prix</p>
          <span className="text-sm text-foreground">
            {publicPriceUpdatedAt
              ? format(new Date(publicPriceUpdatedAt), "dd MMM yyyy HH:mm", { locale: fr })
              : "—"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
