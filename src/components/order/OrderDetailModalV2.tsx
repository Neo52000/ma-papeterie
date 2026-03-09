import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Package, Euro, User, Phone, MapPin, FileText,
  Download, MessageSquare, Save, Truck,
} from "lucide-react";
import type { Order, OrderStatus } from "@/hooks/useOrdersPaginated";
import { STATUS_LABELS, STATUS_COLORS } from "@/hooks/useOrdersPaginated";
import { generateOrderPDF } from "@/components/order/generateOrderPDF";
import { useUpdateOrderStatus, useUpdateOrderNotes } from "@/hooks/useOrdersPaginated";

interface OrderDetailModalV2Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "delivered"];

export function OrderDetailModalV2({ order, isOpen, onClose }: OrderDetailModalV2Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const updateStatus = useUpdateOrderStatus();
  const updateNotes = useUpdateOrderNotes();

  if (!order) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const currentIdx = STATUS_FLOW.indexOf(order.status);

  const handleSaveNotes = () => {
    updateNotes.mutate({ orderId: order.id, notes });
    setEditingNotes(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="text-xl">
              Commande {order.order_number}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[order.status]}>
                {STATUS_LABELS[order.status]}
              </Badge>
              <Button
                variant="outline" size="sm"
                onClick={() => generateOrderPDF(order as any)}
                title="Télécharger le bon de commande PDF"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Status Timeline ──────────────────────────────────────────── */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-sm">
              <Truck className="h-4 w-4 mr-2" />
              Suivi de commande
            </h3>
            <div className="flex items-center gap-0">
              {STATUS_FLOW.map((s, i) => {
                const isActive = i <= currentIdx;
                const isCurrent = s === order.status;
                return (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                          isCurrent
                            ? "bg-primary text-primary-foreground border-primary"
                            : isActive
                              ? "bg-primary/20 text-primary border-primary/40"
                              : "bg-muted text-muted-foreground border-muted-foreground/20"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 whitespace-nowrap ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                        {STATUS_LABELS[s]}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mt-[-16px] ${i < currentIdx ? "bg-primary/40" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick status change */}
            {order.status !== "cancelled" && order.status !== "delivered" && (
              <div className="mt-3 flex items-center gap-2">
                <Select
                  value={order.status}
                  onValueChange={(v) => updateStatus.mutate({ orderId: order.id, status: v as OrderStatus })}
                >
                  <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"] as OrderStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Order Info ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Créée le</p>
                <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Mise à jour</p>
                <p className="text-sm font-medium">{formatDate(order.updated_at)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Euro className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Montant TTC</p>
                <p className="text-lg font-semibold text-primary">
                  {order.total_amount.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Customer ────────────────────────────────────────────────── */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-sm">
              <User className="h-4 w-4 mr-2" />
              Client
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{order.customer_email}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-muted-foreground text-xs">Téléphone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {order.customer_phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Addresses */}
          {(order.shipping_address || order.billing_address) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Adresses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {order.shipping_address && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="font-medium mb-1 text-xs text-muted-foreground">Livraison</p>
                      <p>{order.shipping_address.street}</p>
                      <p>{order.shipping_address.postal_code} {order.shipping_address.city}</p>
                      <p>{order.shipping_address.country}</p>
                    </div>
                  )}
                  {order.billing_address && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="font-medium mb-1 text-xs text-muted-foreground">Facturation</p>
                      <p>{order.billing_address.street}</p>
                      <p>{order.billing_address.postal_code} {order.billing_address.city}</p>
                      <p>{order.billing_address.country}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* ── Items ───────────────────────────────────────────────────── */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center text-sm">
              <Package className="h-4 w-4 mr-2" />
              Articles ({order.order_items?.length ?? 0})
            </h3>
            <div className="space-y-2">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product_price.toFixed(2)} € × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{item.subtotal.toFixed(2)} €</p>
                </div>
              ))}
            </div>

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

          <Separator />

          {/* ── Notes internes ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center text-sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Notes internes
              </h3>
              {!editingNotes && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setNotes(order.notes || ""); setEditingNotes(true); }}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {order.notes ? "Modifier" : "Ajouter"}
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes internes (visible uniquement par les admins)..."
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                    <Save className="h-3 w-3 mr-1" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              order.notes ? (
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                  {order.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucune note</p>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
