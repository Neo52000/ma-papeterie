import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, ShoppingCart, Calendar, Euro, TrendingUp,
  Crown, Star, UserCheck, UserX, Target, AlertTriangle,
} from "lucide-react";
import { useCustomerDetail } from "@/hooks/useCustomers";

interface CustomerDetailModalProps {
  email: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SEGMENT_CONFIG = {
  vip: { label: "VIP", icon: Crown, color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  regular: { label: "Régulier", icon: Star, color: "bg-blue-100 text-blue-800 border-blue-200" },
  occasional: { label: "Occasionnel", icon: UserCheck, color: "bg-green-100 text-green-800 border-green-200" },
  inactive: { label: "Inactif", icon: UserX, color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", preparing: "En préparation",
  shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};

export function CustomerDetailModal({ email, isOpen, onClose }: CustomerDetailModalProps) {
  const { data: customer, isLoading } = useCustomerDetail(email);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  const seg = customer ? SEGMENT_CONFIG[customer.segment] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{email}</DialogTitle>
              {seg && (
                <Badge className={`mt-1 ${seg.color}`}>
                  <seg.icon className="h-3 w-3 mr-1" />
                  {seg.label}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : customer ? (
          <div className="space-y-6">
            {/* ── KPI Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Euro className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{customer.totalSpent.toFixed(0)} €</p>
                <p className="text-[10px] text-muted-foreground">CA total</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{customer.orderCount}</p>
                <p className="text-[10px] text-muted-foreground">Commande{customer.orderCount > 1 ? "s" : ""}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{customer.avgOrder.toFixed(0)} €</p>
                <p className="text-[10px] text-muted-foreground">Panier moyen</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {Math.round((Date.now() - new Date(customer.lastOrderDate).getTime()) / 86400000)}j
                </p>
                <p className="text-[10px] text-muted-foreground">Depuis dernière cmd</p>
              </div>
            </div>

            {/* ── RFM Score ─────────────────────────────────────────────── */}
            {customer.rfm && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center text-sm">
                    <Target className="h-4 w-4 mr-2" />
                    Score RFM
                    {customer.rfm.rfm_segment && (
                      <Badge variant="outline" className="ml-2 text-xs">{customer.rfm.rfm_segment}</Badge>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Récence</p>
                      <div className="flex items-center gap-1">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(customer.rfm.recency_score ?? 0) * 20}%` }}
                          />
                        </div>
                        <span className="font-semibold">{customer.rfm.recency_score}/5</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fréquence</p>
                      <div className="flex items-center gap-1">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(customer.rfm.frequency_score ?? 0) * 20}%` }}
                          />
                        </div>
                        <span className="font-semibold">{customer.rfm.frequency_score}/5</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Montant</p>
                      <div className="flex items-center gap-1">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(customer.rfm.monetary_score ?? 0) * 20}%` }}
                          />
                        </div>
                        <span className="font-semibold">{customer.rfm.monetary_score}/5</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Risque churn</p>
                      <div className="flex items-center gap-1">
                        {(customer.rfm.churn_risk ?? 0) > 50 && (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                        <span className="font-semibold">{customer.rfm.churn_risk?.toFixed(0) ?? "—"}%</span>
                      </div>
                    </div>
                  </div>
                  {customer.rfm.lifetime_value_estimate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      LTV estimée : <span className="font-semibold text-foreground">{customer.rfm.lifetime_value_estimate.toFixed(0)} €</span>
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* ── Info ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Première commande</p>
                <p className="font-medium">{formatDate(customer.firstOrderDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dernière commande</p>
                <p className="font-medium">{formatDate(customer.lastOrderDate)}</p>
              </div>
              {customer.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Order History ──────────────────────────────────────────── */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center text-sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Historique des commandes ({customer.orders.length})
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {customer.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-mono text-sm font-medium">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(o.created_at)} — {o.items_count} article{o.items_count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[o.status] || "bg-gray-100"}>
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {o.total_amount.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
