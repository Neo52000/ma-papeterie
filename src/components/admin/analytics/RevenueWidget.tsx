import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { useRevenueData } from "@/hooks/useRevenueData";
import type { RevenuePeriod } from "@/types/analytics";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const fmtDelta = (pct: number) => {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1).replace(".", ",")} %`;
};

const PERIODS: { value: RevenuePeriod; label: string }[] = [
  { value: "day", label: "Aujourd'hui" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
];

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {delta != null && (
        <p
          className={`text-sm font-medium mt-1 flex items-center gap-1 ${
            delta > 0
              ? "text-green-600"
              : delta < 0
                ? "text-red-600"
                : "text-muted-foreground"
          }`}
        >
          {delta > 0 && <TrendingUp className="h-3.5 w-3.5" />}
          {delta < 0 && <TrendingDown className="h-3.5 w-3.5" />}
          {fmtDelta(delta)}
          <span className="text-xs text-muted-foreground ml-1">vs période préc.</span>
        </p>
      )}
    </div>
  );
}

// ── Widget ───────────────────────────────────────────────────────────────────

export default function RevenueWidget() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const { data, isLoading, error, refetch } = useRevenueData(period);

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold">CA & Ventes</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? "default" : "outline"}
              onClick={() => setPeriod(p.value)}
              className="text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4" role="status" aria-label="Chargement des données de vente">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            aria-label="Réessayer le chargement"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}

      {/* Data */}
      {!isLoading && !error && data && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="CA TTC"
              value={fmtCurrency(data.current.ca_ttc)}
              delta={data.delta?.ca_ttc_pct}
            />
            <KpiCard
              label="Commandes"
              value={String(data.current.orders_count)}
              delta={data.delta?.orders_count_pct}
            />
            <KpiCard
              label="Panier moyen TTC"
              value={fmtCurrency(data.current.avg_basket_ttc)}
              delta={data.delta?.avg_basket_pct}
            />
          </div>

          {/* CA HT */}
          <p className="text-sm text-muted-foreground">
            CA HT : <span className="font-semibold text-foreground">{fmtCurrency(data.current.ca_ht)}</span>
          </p>

          {/* Top 5 produits */}
          {data.current.top_products.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Top 5 produits</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.current.top_products.map((product, i) => (
                      <TableRow key={product.title}>
                        <TableCell className="text-muted-foreground w-8">{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm">{product.title}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(product.revenue)}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
