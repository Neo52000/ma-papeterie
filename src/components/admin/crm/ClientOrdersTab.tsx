import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ClientOrder } from "@/hooks/admin/useClientOrders";

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-slate-100 text-slate-800",
};

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

interface Props {
  orders: ClientOrder[];
  isLoading: boolean;
}

export function ClientOrdersTab({ orders, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Aucune commande
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N. commande</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Articles</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
            <TableCell className="text-sm">
              {new Date(order.created_at).toLocaleDateString("fr-FR")}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_BADGES[order.status] ?? ""}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{order.items_count}</TableCell>
            <TableCell className="text-right font-semibold">
              {fmtPrice(order.total_amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
