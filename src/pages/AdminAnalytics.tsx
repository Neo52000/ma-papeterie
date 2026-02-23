import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Eye, ShoppingCart, CreditCard, Search, ScanLine, Users,
  TrendingUp, AlertTriangle, Info,
} from "lucide-react";
import { useAnalyticsKPIs, type FunnelStep } from "@/hooks/useAnalyticsKPIs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

function KpiCard({ icon, label, value, sub, loading }: KpiCardProps) {
  if (loading) return <Skeleton className="h-24 rounded-xl" />;
  return (
    <div className="border rounded-xl p-4 flex items-start gap-3">
      <div className="shrink-0 mt-0.5 text-primary">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────

function FunnelSection({ steps, loading }: { steps: FunnelStep[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-28 w-full" />;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Entonnoir de conversion</h3>
      <div className="flex gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.event} className="flex items-center gap-2">
            <div className="border rounded-lg p-3 min-w-[140px]">
              <p className="text-lg font-bold">{fmt(step.count)}</p>
              <p className="text-xs text-muted-foreground">{step.label}</p>
              {i > 0 && (
                <Badge variant={step.rate >= 20 ? "default" : step.rate >= 5 ? "secondary" : "destructive"}
                  className="mt-1 text-xs">
                  {step.rate} %
                </Badge>
              )}
            </div>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground text-xl shrink-0">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const { data: kpis, isLoading } = useAnalyticsKPIs(days);

  const pageViews    = kpis?.event_counts?.page_view ?? 0;
  const sessions     = kpis?.unique_sessions ?? 0;
  const addToCart    = kpis?.event_counts?.add_to_cart ?? 0;
  const checkoutStarted = kpis?.event_counts?.checkout_started ?? 0;
  const convRate     = addToCart > 0 ? Math.round((checkoutStarted / addToCart) * 1000) / 10 : 0;

  return (
    <AdminLayout
      title="Analytics"
      description="Comportement des visiteurs, conversions et performances — données anonymisées RGPD."
    >
      <div className="space-y-8">
        {/* Sélecteur période */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Période :</span>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            icon={<Eye className="h-5 w-5" />}
            label="Pages vues"
            value={fmt(pageViews)}
            loading={isLoading}
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Sessions uniques"
            value={fmt(sessions)}
            sub={pageViews > 0 ? `${Math.round(pageViews / Math.max(sessions, 1))} pages/session` : undefined}
            loading={isLoading}
          />
          <KpiCard
            icon={<ShoppingCart className="h-5 w-5" />}
            label="Ajouts panier"
            value={fmt(addToCart)}
            sub={kpis?.avg_cart_value != null ? `Panier moyen : ${kpis.avg_cart_value.toFixed(2)} €` : undefined}
            loading={isLoading}
          />
          <KpiCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Commandes démarrées"
            value={fmt(checkoutStarted)}
            sub={`Conversion : ${convRate} %`}
            loading={isLoading}
          />
        </div>

        {/* Graphique événements / sessions par jour */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Événements et sessions par jour</h3>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="border rounded-xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={kpis?.daily_counts ?? []}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={Math.max(0, Math.floor((kpis?.daily_counts?.length ?? 30) / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={36} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      [fmt(v), name === "events" ? "Événements" : "Sessions"]}
                  />
                  <Legend formatter={(v) => v === "events" ? "Événements" : "Sessions"} />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke="#3b82f6"
                    fill="#bfdbfe"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="#10b981"
                    fill="#a7f3d0"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Entonnoir */}
        <FunnelSection steps={kpis?.funnel ?? []} loading={isLoading} />

        {/* Deux colonnes: recherches + top produits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top recherches */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Search className="h-4 w-4" />
              Top recherches ({days} j)
            </h3>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (kpis?.top_searches?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <>
                <div className="border rounded-xl p-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={kpis!.top_searches.slice(0, 8)}
                      margin={{ top: 0, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="query"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} width={30} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Recherches"]} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Terme</TableHead>
                        <TableHead className="text-right">Recherches</TableHead>
                        <TableHead className="text-right">0 résultat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpis!.top_searches.slice(0, 10).map((row) => (
                        <TableRow key={row.query}>
                          <TableCell className="font-medium text-sm">{row.query}</TableCell>
                          <TableCell className="text-right">{fmt(row.count)}</TableCell>
                          <TableCell className="text-right">
                            {row.zero_results > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-destructive text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                {row.zero_rate} %
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          {/* Top produits vus */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top produits vus ({days} j)
            </h3>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (kpis?.top_products?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Vues</TableHead>
                      <TableHead className="text-right">Barre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis!.top_products.map((row, i) => {
                      const pct = kpis!.top_products[0].views > 0
                        ? Math.round((row.views / kpis!.top_products[0].views) * 100)
                        : 0;
                      return (
                        <TableRow key={row.product_id}>
                          <TableCell className="font-medium text-sm">
                            <span className="text-muted-foreground mr-2">{i + 1}.</span>
                            {row.name}
                          </TableCell>
                          <TableCell className="text-right font-bold">{fmt(row.views)}</TableCell>
                          <TableCell className="text-right w-24">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* OCR stats */}
        {((kpis?.ocr.uploads ?? 0) > 0 || isLoading) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              OCR listes scolaires
            </h3>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Uploads",        value: fmt(kpis!.ocr.uploads) },
                  { label: "OCR complétés",  value: fmt(kpis!.ocr.completions) },
                  {
                    label: "Taux de succès",
                    value: `${kpis!.ocr.success_rate} %`,
                  },
                  {
                    label: "Durée moyenne",
                    value: kpis!.ocr.avg_duration_ms != null
                      ? `${(kpis!.ocr.avg_duration_ms / 1000).toFixed(1)} s`
                      : "—",
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="border rounded-lg p-4 text-center">
                    <p className="text-xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note RGPD */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Données anonymisées — conformité RGPD</p>
            <ul className="mt-1 space-y-0.5 text-blue-700 text-xs">
              <li>• Aucune donnée personnelle directe stockée (pas d'IP, email, nom).</li>
              <li>• <code>user_hash</code> = SHA-256(user_id)[0:16], non-réversible.</li>
              <li>• <code>session_id</code> = UUID aléatoire par onglet (sessionStorage, pas cookie).</li>
              <li>• Le tracking est désactivé si le visiteur refuse les cookies analytiques.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
