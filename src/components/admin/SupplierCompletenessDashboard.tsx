import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, ImageIcon, FileText, Tag, DollarSign, Package,
  BarChart3, TrendingUp, Sparkles, Loader2, Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupplierCompleteness, type SupplierMetrics } from "@/hooks/admin/useSupplierCompleteness";

const METRIC_CONFIG = [
  { key: 'pct_with_image' as const,       label: 'Images',       icon: ImageIcon,   color: 'text-blue-500' },
  { key: 'pct_with_description' as const,  label: 'Descriptions', icon: FileText,    color: 'text-amber-500' },
  { key: 'pct_with_ean' as const,          label: 'EAN',          icon: Tag,         color: 'text-green-500' },
  { key: 'pct_with_cost_price' as const,   label: 'Prix achat',   icon: DollarSign,  color: 'text-orange-500' },
  { key: 'pct_in_stock' as const,          label: 'En stock',     icon: Package,     color: 'text-emerald-500' },
  { key: 'pct_with_brand' as const,        label: 'Marque',       icon: Search,      color: 'text-purple-500' },
  { key: 'pct_icecat_enriched' as const,   label: 'Icecat',       icon: Sparkles,    color: 'text-cyan-500' },
  { key: 'pct_with_seo' as const,          label: 'SEO',          icon: TrendingUp,  color: 'text-pink-500' },
];

function scoreColor(pct: number) {
  if (pct >= 80) return 'text-primary';
  if (pct >= 50) return 'text-amber-500';
  return 'text-destructive';
}

function scoreBadge(pct: number) {
  if (pct >= 80) return { label: 'Bon', variant: 'default' as const };
  if (pct >= 50) return { label: 'Moyen', variant: 'secondary' as const };
  return { label: 'Critique', variant: 'destructive' as const };
}

const SUPPLIER_LABELS: Record<string, string> = {
  'ALKOR': 'ALKOR / Burolike',
  'COMLANDI': 'COMLANDI / Liderpapel',
  'SOFT': 'Soft Carrier',
  'ALSO': 'ALSO',
};

function SupplierCard({ metrics }: { metrics: SupplierMetrics }) {
  const [enriching, setEnriching] = useState(false);
  const badge = scoreBadge(metrics.avg_completion ?? 0);

  const handleEnrichIcecat = async () => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('icecat-enrich', {
        body: { supplier: metrics.supplier, limit: 200 },
      });
      if (error) throw error;
      const result = data as { enriched?: number; not_found?: number; errors?: number };
      toast.success(
        `${metrics.supplier} Icecat : ${result.enriched ?? 0} enrichi(s), ${result.not_found ?? 0} non trouvé(s)`
      );
    } catch (err) {
      toast.error('Erreur Icecat : ' + (err instanceof Error ? err.message : String(err)));
    }
    setEnriching(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{SUPPLIER_LABELS[metrics.supplier] ?? metrics.supplier}</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <CardDescription>
          {metrics.total_products?.toLocaleString('fr-FR')} produits · {metrics.total_offers?.toLocaleString('fr-FR')} offres actives
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score global */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-3xl font-bold ${scoreColor(metrics.avg_completion ?? 0)}`}>
            {metrics.avg_completion ?? 0}%
          </div>
          <div className="flex-1">
            <Progress value={metrics.avg_completion ?? 0} className="h-3" />
          </div>
        </div>

        {/* Métriques détaillées */}
        {METRIC_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const pct = metrics[key] ?? 0;
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <Icon className={`h-4 w-4 ${color} shrink-0`} />
              <span className="w-24 truncate">{label}</span>
              <Progress value={pct} className="h-2 flex-1" />
              <span className={`w-12 text-right font-semibold ${scoreColor(pct)}`}>{pct}%</span>
            </div>
          );
        })}

        {/* Actions */}
        <div className="pt-3 border-t mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleEnrichIcecat}
            disabled={enriching}
          >
            {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Enrichir Icecat ({metrics.supplier})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplierCompletenessDashboard() {
  const { data: suppliers = [], isLoading, refetch } = useSupplierCompleteness();

  const globalAvg = suppliers.length > 0
    ? Math.round(suppliers.reduce((acc, s) => acc + (s.avg_completion ?? 0), 0) / suppliers.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Complétude fournisseurs
              </CardTitle>
              <CardDescription>
                Vue d'ensemble de la qualité des données par fournisseur
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-3xl font-bold ${scoreColor(globalAvg)}`}>
                  {isLoading ? '—' : `${globalAvg}%`}
                </div>
                <div className="text-xs text-muted-foreground">Score moyen</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Supplier cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="py-12">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement...
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <SupplierCard key={s.supplier} metrics={s} />
          ))}
        </div>
      )}
    </div>
  );
}
