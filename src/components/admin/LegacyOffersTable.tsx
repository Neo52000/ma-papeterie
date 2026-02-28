import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierProduct } from "@/hooks/useProductSuppliers";
import { Star } from "lucide-react";

interface LegacyOffersTableProps {
  offers: SupplierProduct[];
}

export function LegacyOffersTable({ offers }: LegacyOffersTableProps) {
  if (offers.length === 0) return null;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Réf. fournisseur</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Délai (j)</TableHead>
            <TableHead className="text-right">Prix HT</TableHead>
            <TableHead>Qté min.</TableHead>
            <TableHead>Préféré</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.id}>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                    {offer.supplier_name}
                  </Badge>
                  {offer.is_preferred && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      Préféré
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">
                {offer.supplier_reference ?? "—"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {offer.stock_quantity != null ? (
                  <span className={offer.stock_quantity > 0 ? "text-green-700" : "text-destructive"}>
                    {offer.stock_quantity}
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {offer.lead_time_days ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {offer.supplier_price != null
                  ? `${Number(offer.supplier_price).toFixed(2)} €`
                  : "—"}
              </TableCell>
              <TableCell>
                {offer.min_order_quantity ?? 1}
              </TableCell>
              <TableCell>
                {offer.is_preferred ? (
                  <Badge variant="default" className="text-xs">Oui</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Non</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {offer.source_type ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
