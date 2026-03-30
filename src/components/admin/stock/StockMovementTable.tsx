import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStockMovements } from "@/hooks/admin/useStockMovements";
import { useStockStore } from "@/stores/stockStore";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  sale: { label: "Vente", color: "bg-blue-100 text-blue-800" },
  restock: { label: "Réappro", color: "bg-green-100 text-green-800" },
  adjustment: { label: "Ajustement", color: "bg-purple-100 text-purple-800" },
  return: { label: "Retour", color: "bg-yellow-100 text-yellow-800" },
  loss: { label: "Perte", color: "bg-red-100 text-red-800" },
  sync: { label: "Sync", color: "bg-gray-100 text-gray-800" },
};

export function StockMovementTable() {
  const { movementsFilter, movementsPage, setMovementsFilter, setMovementsPage } = useStockStore();

  const { data: movements, isLoading } = useStockMovements({
    movementType: movementsFilter.type,
    dateFrom: movementsFilter.dateFrom,
    dateTo: movementsFilter.dateTo,
    page: movementsPage,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={movementsFilter.type || "all"}
          onValueChange={(v) => setMovementsFilter({ type: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="sale">Vente</SelectItem>
            <SelectItem value="restock">Réappro</SelectItem>
            <SelectItem value="adjustment">Ajustement</SelectItem>
            <SelectItem value="return">Retour</SelectItem>
            <SelectItem value="loss">Perte</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={movementsFilter.dateFrom || ""}
          onChange={(e) => setMovementsFilter({ dateFrom: e.target.value || null })}
          className="w-[160px]"
          placeholder="Du"
        />
        <Input
          type="date"
          value={movementsFilter.dateTo || ""}
          onChange={(e) => setMovementsFilter({ dateTo: e.target.value || null })}
          className="w-[160px]"
          placeholder="Au"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !movements?.length ? (
        <p className="text-center text-muted-foreground py-8">Aucun mouvement.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead className="text-right">Avant</TableHead>
                <TableHead className="text-right">Après</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const typeConfig = TYPE_LABELS[m.movement_type] ?? { label: m.movement_type, color: "bg-gray-100" };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {new Date(m.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate">
                      {m.product_name || m.product_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${m.quantity_delta > 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}
                    </TableCell>
                    <TableCell className="text-right">{m.stock_before ?? "-"}</TableCell>
                    <TableCell className="text-right">{m.stock_after ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.source || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Page {movementsPage + 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={movementsPage === 0}
                onClick={() => setMovementsPage(movementsPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(movements?.length ?? 0) < 50}
                onClick={() => setMovementsPage(movementsPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
