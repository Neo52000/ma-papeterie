import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Stamp, RefreshCw, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { STAMP_TYPE_LABELS } from "@/components/stamp-designer/constants";

interface StampDesignOrder {
  id: string;
  user_id: string;
  stamp_model_id: string;
  design_data: Record<string, any>;
  preview_image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  stamp_model?: {
    name: string;
    brand: string;
    type: string;
    base_price_ttc: number;
    width_mm: number;
    height_mm: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  ordered: "Commandé",
  produced: "Produit",
  draft: "Brouillon",
  in_cart: "En panier",
};

const STATUS_COLORS: Record<string, string> = {
  ordered: "bg-yellow-100 text-yellow-800",
  produced: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-800",
  in_cart: "bg-blue-100 text-blue-800",
};

export default function AdminStampOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ordered");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<StampDesignOrder[]>({
    queryKey: ["admin-stamp-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("stamp_designs" as any)
        .select("*, stamp_models(name, brand, type, base_price_ttc, width_mm, height_mm)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data as any[]) ?? []).map((d: any) => ({
        ...d,
        stamp_model: d.stamp_models,
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("stamp_designs" as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stamp-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-tab-counts"] });
      toast.success("Statut mis à jour");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stamp className="h-6 w-6" />
            Commandes de tampons
          </h1>
          <p className="text-muted-foreground">Gérez les tampons personnalisés commandés par les clients</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-stamp-orders"] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stamp className="h-5 w-5" />
              Commandes ({orders.length})
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ordered">Commandé</SelectItem>
                <SelectItem value="produced">Produit</SelectItem>
                <SelectItem value="in_cart">En panier</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune commande</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex-shrink-0">
                      {expandedOrder === order.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {order.stamp_model?.name ?? "Modèle inconnu"}
                        <span className="text-muted-foreground ml-2">
                          ({order.stamp_model?.brand})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {order.stamp_model?.type && ` — ${STAMP_TYPE_LABELS[order.stamp_model.type] ?? order.stamp_model.type}`}
                        {order.stamp_model && ` — ${order.stamp_model.width_mm}x${order.stamp_model.height_mm}mm`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {order.stamp_model ? `${Number(order.stamp_model.base_price_ttc).toFixed(2)} €` : "—"}
                    </span>
                    <Select
                      value={order.status}
                      onValueChange={(status) => updateStatus.mutate({ id: order.id, status })}
                    >
                      <SelectTrigger className="w-[140px] h-8" onClick={(e) => e.stopPropagation()}>
                        <Badge className={`${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"} text-xs border-0`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ordered">Commandé</SelectItem>
                        <SelectItem value="produced">Produit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                      {order.preview_image_url && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Aperçu :</p>
                          <img
                            src={order.preview_image_url}
                            alt="Aperçu tampon"
                            className="max-w-xs rounded border bg-white p-2"
                          />
                        </div>
                      )}
                      {order.design_data && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Texte gravure :</p>
                          <div className="bg-white rounded border p-3 space-y-1">
                            {(order.design_data.lines as any[] | undefined)?.map((line: any, i: number) => (
                              <p key={i} className="text-sm" style={{
                                fontFamily: line.fontFamily,
                                fontWeight: line.bold ? "bold" : "normal",
                                fontStyle: line.italic ? "italic" : "normal",
                                textAlign: line.alignment ?? "center",
                              }}>
                                {line.text || <span className="text-muted-foreground italic">(vide)</span>}
                              </p>
                            )) ?? <p className="text-sm text-muted-foreground">Pas de texte</p>}
                          </div>
                          {order.design_data.inkColor && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Encre : {order.design_data.inkColor} — Boîtier : {order.design_data.caseColor ?? "—"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
