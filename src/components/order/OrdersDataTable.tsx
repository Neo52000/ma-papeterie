import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Eye, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import type { Order, OrderFilters, OrderStatus } from "@/hooks/useOrdersPaginated";
import { STATUS_LABELS, STATUS_COLORS } from "@/hooks/useOrdersPaginated";

interface OrdersDataTableProps {
  orders: Order[];
  totalCount: number;
  totalPages: number;
  filters: OrderFilters;
  onFiltersChange: (f: Partial<OrderFilters>) => void;
  onViewDetails: (order: Order) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  confirmed: "Confirmer",
  preparing: "Préparer",
  shipped: "Expédier",
  delivered: "Livrer",
};

function SortIcon({ column, current, dir }: { column: string; current: string; dir: string }) {
  if (column !== current) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1" />
    : <ChevronDown className="h-3 w-3 ml-1" />;
}

export function OrdersDataTable({
  orders, totalCount, totalPages, filters, onFiltersChange,
  onViewDetails, onStatusChange,
}: OrdersDataTableProps) {
  const toggleSort = (col: OrderFilters["sortBy"]) => {
    if (filters.sortBy === col) {
      onFiltersChange({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" });
    } else {
      onFiltersChange({ sortBy: col, sortDir: "desc" });
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => toggleSort("order_number")}
              >
                <span className="flex items-center">
                  N° Commande
                  <SortIcon column="order_number" current={filters.sortBy} dir={filters.sortDir} />
                </span>
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => toggleSort("created_at")}
              >
                <span className="flex items-center">
                  Date
                  <SortIcon column="created_at" current={filters.sortBy} dir={filters.sortDir} />
                </span>
              </TableHead>
              <TableHead>Articles</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-right"
                onClick={() => toggleSort("total_amount")}
              >
                <span className="flex items-center justify-end">
                  Montant TTC
                  <SortIcon column="total_amount" current={filters.sortBy} dir={filters.sortDir} />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                <span className="flex items-center">
                  Statut
                  <SortIcon column="status" current={filters.sortBy} dir={filters.sortDir} />
                </span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-medium whitespace-nowrap">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <p className="text-sm font-medium truncate max-w-[200px]">{order.customer_email}</p>
                        {order.customer_phone && (
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.order_items?.length ?? 0} article{(order.order_items?.length ?? 0) > 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {order.total_amount.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status]}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(order)}
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {next && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onStatusChange(order.id, next)}
                          >
                            {NEXT_LABEL[next]}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{totalCount} commande{totalCount > 1 ? "s" : ""}</span>
          <span>—</span>
          <Select
            value={String(filters.pageSize)}
            onValueChange={(v) => onFiltersChange({ pageSize: Number(v), page: 0 })}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>par page</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={filters.page === 0}
            onClick={() => onFiltersChange({ page: 0 })}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={filters.page === 0}
            onClick={() => onFiltersChange({ page: filters.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">
            Page {filters.page + 1} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={filters.page >= totalPages - 1}
            onClick={() => onFiltersChange({ page: filters.page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            disabled={filters.page >= totalPages - 1}
            onClick={() => onFiltersChange({ page: totalPages - 1 })}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
