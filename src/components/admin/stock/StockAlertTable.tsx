import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStockAlerts } from "@/hooks/admin/useStockAlerts";
import { useStockStore } from "@/stores/stockStore";
import { StockStatusBadge } from "./StockStatusBadge";
import { Loader2 } from "lucide-react";

export function StockAlertTable() {
  const { alertsFilter, setAlertsFilter } = useStockStore();

  const { data: alerts, isLoading } = useStockAlerts({
    supplierId: alertsFilter.supplierId,
    status: alertsFilter.status,
    search: alertsFilter.search,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher (nom, SKU)..."
          value={alertsFilter.search}
          onChange={(e) => setAlertsFilter({ search: e.target.value })}
          className="max-w-xs"
        />
        <Select
          value={alertsFilter.status || "all"}
          onValueChange={(v) => setAlertsFilter({ status: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="rupture">Rupture</SelectItem>
            <SelectItem value="critique">Critique</SelectItem>
            <SelectItem value="faible">Faible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !alerts?.length ? (
        <p className="text-muted-foreground text-center py-8">Aucune alerte stock.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Seuil</TableHead>
              <TableHead className="text-right">Réappro</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="text-right">Délai (j)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow
                key={a.product_id}
                className={
                  a.stock_status === "rupture"
                    ? "bg-red-50"
                    : a.stock_status === "critique"
                    ? "bg-orange-50"
                    : ""
                }
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {a.name}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.sku || "-"}</TableCell>
                <TableCell className="text-right font-bold">{a.current_stock}</TableCell>
                <TableCell className="text-right">{a.min_quantity}</TableCell>
                <TableCell className="text-right">{a.reorder_quantity}</TableCell>
                <TableCell>
                  <StockStatusBadge status={a.stock_status} />
                </TableCell>
                <TableCell className="text-sm">{a.supplier_name || "-"}</TableCell>
                <TableCell className="text-right">{a.lead_time_days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
