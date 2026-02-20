import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierOffer } from "@/hooks/useSupplierOffers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Star } from "lucide-react";

const SUPPLIER_ORDER: Record<string, number> = { ALKOR: 1, COMLANDI: 2, SOFT: 3 };

const SUPPLIER_BADGE: Record<string, string> = {
  ALKOR:    "bg-green-100 text-green-800 border-green-300",
  COMLANDI: "bg-blue-100 text-blue-800 border-blue-300",
  SOFT:     "bg-purple-100 text-purple-800 border-purple-300",
};

interface OffersTableProps {
  offers: SupplierOffer[];
  onToggle: (offerId: string, isActive: boolean) => void;
  isToggling: boolean;
}

function formatTaxBreakdown(tax: Record<string, number> | null): string {
  if (!tax || Object.keys(tax).length === 0) return "—";
  return Object.entries(tax)
    .map(([k, v]) => `${k}: ${Number(v).toFixed(2)} €`)
    .join("; ");
}

export function OffersTable({ offers, onToggle, isToggling }: OffersTableProps) {
  const sorted = [...offers].sort(
    (a, b) => (SUPPLIER_ORDER[a.supplier] ?? 99) - (SUPPLIER_ORDER[b.supplier] ?? 99)
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune offre fournisseur pour ce produit.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Réf. fournisseur</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Délai (j)</TableHead>
            <TableHead className="text-right">PA HT</TableHead>
            <TableHead className="text-right">PVP TTC</TableHead>
            <TableHead>TVA</TableHead>
            <TableHead>Taxes</TableHead>
            <TableHead>Qté min.</TableHead>
            <TableHead>Actif</TableHead>
            <TableHead>Màj</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((offer) => (
            <TableRow key={offer.id} className={!offer.is_active ? "opacity-50" : undefined}>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={SUPPLIER_BADGE[offer.supplier] ?? ""}>
                    {offer.supplier}
                  </Badge>
                  {offer.supplier === 'ALKOR' && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      Prioritaire
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                {offer.supplier_product_id}
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className={offer.stock_qty > 0 ? "text-green-700" : "text-destructive"}>
                  {offer.stock_qty}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {offer.delivery_delay_days ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {offer.purchase_price_ht != null
                  ? `${Number(offer.purchase_price_ht).toFixed(2)} €`
                  : "—"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {offer.pvp_ttc != null
                  ? `${Number(offer.pvp_ttc).toFixed(2)} €`
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                {offer.vat_rate != null ? `${offer.vat_rate} %` : "—"}
              </TableCell>
              <TableCell className="text-xs max-w-[180px]">
                {formatTaxBreakdown(offer.tax_breakdown)}
              </TableCell>
              <TableCell>{offer.min_qty}</TableCell>
              <TableCell>
                <Switch
                  checked={offer.is_active}
                  disabled={isToggling}
                  onCheckedChange={(val) => onToggle(offer.id, val)}
                  aria-label="Activer/désactiver cette offre"
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {offer.updated_at
                  ? format(new Date(offer.updated_at), "dd/MM/yy HH:mm", { locale: fr })
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
