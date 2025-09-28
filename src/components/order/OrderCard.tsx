import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Package, Calendar, Euro } from "lucide-react";
import { Order } from "@/hooks/useOrders";

interface OrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  isAdmin?: boolean;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function OrderCard({ order, onViewDetails, isAdmin, onStatusChange }: OrderCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status'] | null> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus];
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {order.order_number}
          </CardTitle>
          <Badge className={statusColors[order.status]}>
            {statusLabels[order.status]}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(order.created_at)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm">
            <Package className="h-4 w-4 mr-1 text-muted-foreground" />
            {order.order_items?.length || 0} article(s)
          </div>
          <div className="flex items-center font-semibold text-primary">
            <Euro className="h-4 w-4 mr-1" />
            {order.total_amount.toFixed(2)}
          </div>
        </div>

        {isAdmin && (
          <div className="text-sm text-muted-foreground">
            <p>Client: {order.customer_email}</p>
            {order.customer_phone && <p>Tél: {order.customer_phone}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(order)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Détails
          </Button>
          
          {isAdmin && nextStatus && onStatusChange && (
            <Button
              size="sm"
              onClick={() => onStatusChange(order.id, nextStatus)}
              className="flex-1"
            >
              {nextStatus === 'confirmed' && 'Confirmer'}
              {nextStatus === 'preparing' && 'Préparer'}
              {nextStatus === 'shipped' && 'Expédier'}
              {nextStatus === 'delivered' && 'Livrer'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}