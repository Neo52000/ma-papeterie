import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Order } from "@/hooks/useOrders";
import { Calendar, Package, Euro, User, Phone, MapPin, FileText, Download } from "lucide-react";
import { generateOrderPDF } from "@/components/order/generateOrderPDF";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped:   'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  pending:   'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped:   'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="text-xl">
              Commande {order.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[order.status]}>
                {statusLabels[order.status]}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateOrderPDF(order)}
                title="Télécharger le bon de commande PDF"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date de commande</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(order.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Montant total</p>
                <p className="text-lg font-semibold text-primary">
                  {order.total_amount.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Informations client
            </h3>
            <div className="space-y-2">
              <p className="flex items-center">
                <span className="font-medium mr-2">Email:</span>
                {order.customer_email}
              </p>
              {order.customer_phone && (
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium mr-2">Téléphone:</span>
                  {order.customer_phone}
                </p>
              )}
            </div>
          </div>

          {/* Addresses */}
          {(order.shipping_address || order.billing_address) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Adresses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.shipping_address && (
                    <div>
                      <p className="font-medium mb-1">Adresse de livraison</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{order.shipping_address.street}</p>
                        <p>{order.shipping_address.city} {order.shipping_address.postal_code}</p>
                        <p>{order.shipping_address.country}</p>
                      </div>
                    </div>
                  )}
                  {order.billing_address && (
                    <div>
                      <p className="font-medium mb-1">Adresse de facturation</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{order.billing_address.street}</p>
                        <p>{order.billing_address.city} {order.billing_address.postal_code}</p>
                        <p>{order.billing_address.country}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Articles commandés
            </h3>
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.product_price.toFixed(2)} € × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">{item.subtotal.toFixed(2)} €</p>
                </div>
              ))}
            </div>

            {/* Total recap */}
            <div className="mt-4 pt-3 border-t space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total HT</span>
                <span>{(order.total_amount / 1.2).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>TVA (20%)</span>
                <span>{(order.total_amount - order.total_amount / 1.2).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t">
                <span>Total TTC</span>
                <span className="text-primary">{order.total_amount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {order.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
