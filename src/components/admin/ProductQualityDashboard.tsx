import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download, RefreshCw, ImageIcon, Tag, FileText, DollarSign, Package,
  AlertTriangle, CheckCircle2, TrendingUp, Loader2, Type, Weight, Palette,
  Zap, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface QualityMetric {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  missing: number;
  total: number;
  severity: 'error' | 'warning' | 'ok';
  color: string;
}

export function ProductQualityDashboard({ onComplete }: { onComplete?: () => void }) {
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [syncingImages, setSyncingImages] = useState(false);
  const [normalizingNames, setNormalizingNames] = useState(false);
  const [backfillingCost, setBackfillingCost] = useState(false);
  const [backfillingBrand, setBackfillingBrand] = useState(false);
  const [backfillingWeight, setBackfillingWeight] = useState(false);
  const [enrichingIcecat, setEnrichingIcecat] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Total products
      const { count: totalCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      const t = totalCount || 0;
      setTotal(t);

      // Parallel queries for each metric
      const [
        { count: noImage },
        { count: noEan },
        { count: noDescription },
        { count: noCostPrice },
        { count: noBrand },
        { count: noWeight },
        { count: noColor },
        { count: discontinued },
        { count: withSeo },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).is('image_url', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('ean', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('description', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('cost_price', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('brand', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('weight_kg', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('color', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', false),
        supabase.from('product_seo').select('*', { count: 'exact', head: true }),
      ]);

      const buildMetric = (
        label: string,
        icon: React.ComponentType<{ className?: string }>,
        missing: number,
        severity: 'error' | 'warning' | 'ok',
        color: string
      ): QualityMetric => ({
        label, icon, missing: missing || 0, total: t, severity, color,
      });

      setMetrics([
        buildMetric('Image manquante', ImageIcon, noImage || 0, 'error', 'text-destructive'),
        buildMetric('EAN manquant', Tag, noEan || 0, 'warning', 'text-orange-500'),
        buildMetric('Description vide', FileText, noDescription || 0, 'warning', 'text-amber-500'),
        buildMetric('Prix achat absent', DollarSign, noCostPrice || 0, 'warning', 'text-yellow-500'),
        buildMetric('Marque manquante', Package, noBrand || 0, 'ok', 'text-blue-500'),
        buildMetric('Poids manquant', Weight, noWeight || 0, 'ok', 'text-slate-500'),
        buildMetric('Couleur manquante', Palette, noColor || 0, 'ok', 'text-pink-500'),
        buildMetric('Fiche SEO manquante', TrendingUp, t - (withSeo || 0), 'warning', 'text-purple-500'),
        buildMetric('Produits inactifs', AlertTriangle, discontinued || 0, 'ok', 'text-muted-foreground'),
      ]);

      setLastRefresh(new Date());
    } catch (_err) {
      toast.error("Erreur lors du chargement des métriques qualité");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSyncImages = async () => {
    setSyncingImages(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('sync_product_images_to_url' as any);
    if (error) toast.error('Erreur sync images : ' + error.message);
    else { toast.success(`${data ?? 0} image(s) synchronisée(s) vers le catalogue`); fetchMetrics(); onComplete?.(); }
    setSyncingImages(false);
  };

  const handleNormalizeNames = async () => {
    setNormalizingNames(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('normalize_product_names' as any);
    if (error) toast.error('Erreur normalisation : ' + error.message);
    else { toast.success(`${data ?? 0} titre(s) normalisé(s) en Title Case`); fetchMetrics(); onComplete?.(); }
    setNormalizingNames(false);
  };

  const handleBackfillCostPrice = async () => {
    setBackfillingCost(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('backfill_cost_price_from_suppliers' as any);
    if (error) toast.error('Erreur backfill prix achat : ' + error.message);
    else { toast.success(`${data ?? 0} prix d'achat récupéré(s) depuis les fournisseurs`); fetchMetrics(); onComplete?.(); }
    setBackfillingCost(false);
  };

  const handleBackfillBrand = async () => {
    setBackfillingBrand(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('backfill_brand_from_suppliers' as any);
    if (error) toast.error('Erreur backfill marques : ' + error.message);
    else { toast.success(`${data ?? 0} marque(s) récupérée(s)`); fetchMetrics(); onComplete?.(); }
    setBackfillingBrand(false);
  };

  const handleBackfillWeight = async () => {
    setBackfillingWeight(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('backfill_weight_from_icecat' as any);
    if (error) toast.error('Erreur backfill poids : ' + error.message);
    else { toast.success(`${data ?? 0} poids récupéré(s) depuis Icecat`); fetchMetrics(); onComplete?.(); }
    setBackfillingWeight(false);
  };

  const handleEnrichIcecat = async () => {
    setEnrichingIcecat(true);
    try {
      const { data, error } = await supabase.functions.invoke('icecat-enrich', {
        body: { limit: 200 },
      });
      if (error) throw error;
      const result = data as { enriched?: number; not_found?: number; errors?: number };
      toast.success(
        `Icecat : ${result.enriched ?? 0} enrichi(s), ${result.not_found ?? 0} non trouvé(s), ${result.errors ?? 0} erreur(s)`
      );
      fetchMetrics();
      onComplete?.();
    } catch (err) {
      toast.error('Erreur enrichissement Icecat : ' + (err instanceof Error ? err.message : String(err)));
    }
    setEnrichingIcecat(false);
  };

  const exportCsv = () => {
    const rows = [
      ['Indicateur', 'Manquants', 'Total', 'Taux complétion (%)'],
      ...metrics.map(m => [
        m.label,
        String(m.missing),
        String(m.total),
        ((1 - m.missing / m.total) * 100).toFixed(1),
      ]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qualite-catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport CSV exporté");
  };

  const completionScore = metrics.length > 0
    ? Math.round(metrics.reduce((acc, m) => acc + (1 - m.missing / m.total), 0) / metrics.length * 100)
    : 0;

  const scoreColor = completionScore >= 80 ? 'text-primary' : completionScore >= 50 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="space-y-6">
      {/* Score global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Qualité du catalogue
                </CardTitle>
                <CardDescription>
                  {total.toLocaleString('fr-FR')} produits · {lastRefresh ? `Actualisé à ${lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Chargement...'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.map((metric) => {
                  const completion = metric.total > 0 ? ((metric.total - metric.missing) / metric.total) * 100 : 100;
                  const pct = Math.round(completion);
                  return (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <metric.icon className={`h-4 w-4 ${metric.color}`} />
                          <span className="font-medium">{metric.label}</span>
                          {metric.missing > 0 && (
                            <Badge
                              variant={metric.severity === 'error' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {metric.missing.toLocaleString('fr-FR')} manquants
                            </Badge>
                          )}
                        </div>
                        <span className={`font-semibold ${pct >= 80 ? 'text-primary' : pct >= 50 ? 'text-amber-500' : 'text-destructive'}`}>
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score global</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
            <div className={`text-6xl font-bold ${scoreColor}`}>
              {loading ? '—' : `${completionScore}%`}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              Complétude moyenne du catalogue
            </div>
            <Badge
              variant={completionScore >= 80 ? 'default' : completionScore >= 50 ? 'secondary' : 'destructive'}
              className="text-sm"
            >
              {completionScore >= 80 ? '✓ Bon' : completionScore >= 50 ? '⚠ À améliorer' : '✗ Critique'}
            </Badge>
            <div className="text-xs text-muted-foreground text-center mt-2 space-y-1">
              <p>Priorité : importer MultimediaLinks.json</p>
              <p>pour résoudre 99% des images manquantes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides d'enrichissement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Enrichissement automatique
          </CardTitle>
          <CardDescription>
            Actions batch pour compléter les données manquantes depuis les sources existantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button size="sm" onClick={handleSyncImages} disabled={syncingImages} className="justify-start">
              {syncingImages
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <ImageIcon className="h-3.5 w-3.5 mr-1.5" />}
              Synchroniser les images
            </Button>
            <Button size="sm" variant="outline" onClick={handleNormalizeNames} disabled={normalizingNames} className="justify-start">
              {normalizingNames
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Type className="h-3.5 w-3.5 mr-1.5" />}
              Normaliser les titres
            </Button>
            <Button size="sm" variant="outline" onClick={handleBackfillCostPrice} disabled={backfillingCost} className="justify-start">
              {backfillingCost
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <DollarSign className="h-3.5 w-3.5 mr-1.5" />}
              Prix achat depuis fournisseurs
            </Button>
            <Button size="sm" variant="outline" onClick={handleBackfillBrand} disabled={backfillingBrand} className="justify-start">
              {backfillingBrand
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Package className="h-3.5 w-3.5 mr-1.5" />}
              Marques depuis Icecat
            </Button>
            <Button size="sm" variant="outline" onClick={handleBackfillWeight} disabled={backfillingWeight} className="justify-start">
              {backfillingWeight
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Weight className="h-3.5 w-3.5 mr-1.5" />}
              Poids depuis Icecat
            </Button>
            <Button size="sm" variant="secondary" onClick={handleEnrichIcecat} disabled={enrichingIcecat} className="justify-start">
              {enrichingIcecat
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Enrichissement Icecat (200)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions recommandées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Actions recommandées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm list-none">
            <li className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <span className="font-bold text-destructive shrink-0">1.</span>
              <div>
                <strong>Importer MultimediaLinks.json</strong> depuis SFTP Liderpapel
                → popule <code className="text-xs bg-muted px-1 rounded">product_images</code> et synchronise <code className="text-xs bg-muted px-1 rounded">products.image_url</code>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <span className="font-bold text-amber-600 shrink-0">2.</span>
              <div>
                <strong>Lancer la rétroaction</strong> dans Admin › COMLANDI
                → lie tous les produits au fournisseur CS Group
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="font-bold text-muted-foreground shrink-0">3.</span>
              <div>
                <strong>Importer Descriptions.json</strong>
                → peuple <code className="text-xs bg-muted px-1 rounded">product_seo</code> avec descriptions courtes/longues
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="font-bold text-muted-foreground shrink-0">4.</span>
              <div>
                <strong>Re-importer Prices.json</strong> avec le nouveau suivi
                → historique des prix alimenté automatiquement
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
