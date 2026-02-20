import { useProductHistory } from "@/hooks/useProductHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Clock, RefreshCw } from "lucide-react";

interface ProductHistoryPanelProps {
  productId: string;
}

const eventLabels: Record<string, { label: string; color: string }> = {
  created: { label: 'Créé', color: 'text-primary' },
  updated: { label: 'Mis à jour', color: 'text-blue-500' },
  deactivated: { label: 'Désactivé', color: 'text-destructive' },
  reactivated: { label: 'Réactivé', color: 'text-green-500' },
  deleted: { label: 'Supprimé', color: 'text-destructive' },
  price_changed: { label: 'Prix modifié', color: 'text-amber-500' },
};

export function ProductHistoryPanel({ productId }: ProductHistoryPanelProps) {
  const { priceHistory, lifecycleEvents, loading, refetch } = useProductHistory(productId);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const formatPrice = (p: number | null) =>
    p != null ? `${p.toFixed(2)} €` : '—';

  const getPriceDelta = (oldHT: number | null, newHT: number | null) => {
    if (oldHT == null || newHT == null || oldHT === 0) return null;
    return ((newHT - oldHT) / oldHT) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Historique</h3>
        <button onClick={refetch} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Tabs defaultValue="prices">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="prices" className="text-xs">Prix ({priceHistory.length})</TabsTrigger>
          <TabsTrigger value="lifecycle" className="text-xs">Cycle de vie ({lifecycleEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="mt-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
            </div>
          ) : priceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun historique de prix disponible
            </p>
          ) : (
            <div className="space-y-2">
              {priceHistory.map((entry) => {
                const delta = getPriceDelta(entry.old_price_ht, entry.new_price_ht);
                return (
                  <div key={entry.id} className="p-3 rounded-lg border bg-card text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.changed_at)}
                      </span>
                      {delta != null && (
                        <Badge variant={delta > 0 ? 'destructive' : delta < 0 ? 'default' : 'secondary'} className="text-xs gap-1">
                          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">PA</span>
                        <div className="font-mono">{formatPrice(entry.old_cost_price)} → {formatPrice(entry.new_cost_price)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prix HT</span>
                        <div className="font-mono">{formatPrice(entry.old_price_ht)} → {formatPrice(entry.new_price_ht)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prix TTC</span>
                        <div className="font-mono">{formatPrice(entry.old_price_ttc)} → {formatPrice(entry.new_price_ttc)}</div>
                      </div>
                    </div>
                    {entry.change_reason && (
                      <p className="text-xs text-muted-foreground">{entry.change_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : lifecycleEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun événement de cycle de vie
            </p>
          ) : (
            <div className="space-y-2">
              {lifecycleEvents.map((event) => {
                const meta = eventLabels[event.event_type] || { label: event.event_type, color: 'text-muted-foreground' };
                return (
                  <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 bg-current ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">par {event.performed_by}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(event.event_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
