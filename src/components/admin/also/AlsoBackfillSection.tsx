import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Link2, Eye, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BackfillResult } from "@/components/admin/comlandi/ComlandiShared";
import { getErrorMessage } from "@/components/admin/comlandi/ComlandiShared";

export function AlsoBackfillSection() {
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);
  const [backfillDryRun, setBackfillDryRun] = useState(false);
  const [offersBackfillLoading, setOffersBackfillLoading] = useState(false);
  const [offersBackfillResult, setOffersBackfillResult] = useState<BackfillResult | null>(null);
  const [offersBackfillDryRun, setOffersBackfillDryRun] = useState(false);
  const [crossEanLoading, setCrossEanLoading] = useState(false);
  const [crossEanResult, setCrossEanResult] = useState<BackfillResult | null>(null);
  const [crossEanDryRun, setCrossEanDryRun] = useState(false);

  const handleBackfill = useCallback(async (dryRun: boolean) => {
    setBackfillLoading(true);
    setBackfillResult(null);
    setBackfillDryRun(dryRun);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-supplier-products', {
        body: { dry_run: dryRun, sources: ['also'] },
      });
      if (error) throw error;
      setBackfillResult(data);
      if (dryRun) {
        toast.info(`Simulation : ${data.stats?.inserted ?? 0} entrées seraient créées sur ${data.stats?.total_products_scanned ?? 0} produits scannés`);
      } else {
        toast.success(`Rétroaction terminée : ${data.stats?.inserted ?? 0} entrées créées dans supplier_products`);
      }
    } catch (err: unknown) {
      toast.error("Erreur rétroaction", { description: getErrorMessage(err) });
    } finally {
      setBackfillLoading(false);
    }
  }, []);

  const handleOffersBackfill = useCallback(async (dryRun: boolean) => {
    setOffersBackfillLoading(true);
    setOffersBackfillResult(null);
    setOffersBackfillDryRun(dryRun);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-supplier-offers', {
        body: { dry_run: dryRun, suppliers: ['ALSO'] },
      });
      if (error) throw error;
      setOffersBackfillResult(data);

      const errorsCount = data?.stats?.errors ?? 0;
      const upserted = data?.stats?.upserted ?? 0;
      const scanned = data?.stats?.scanned ?? 0;
      if (errorsCount > 0) {
        toast.warning(`Backfill supplier_offers terminé avec ${errorsCount} erreur(s)`, {
          description: `${upserted} lignes traitées sur ${scanned}`,
        });
      } else if (dryRun) {
        toast.info(`Simulation backfill offres : ${upserted} lignes seraient upsertées (scannées: ${scanned})`);
      } else {
        toast.success(`Backfill supplier_offers terminé : ${upserted} lignes traitées (scannées: ${scanned})`);
      }
    } catch (err: unknown) {
      toast.error("Erreur backfill supplier_offers", { description: getErrorMessage(err) });
    } finally {
      setOffersBackfillLoading(false);
    }
  }, []);

  const handleCrossEanBackfill = useCallback(async (dryRun: boolean) => {
    setCrossEanLoading(true);
    setCrossEanResult(null);
    setCrossEanDryRun(dryRun);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-cross-ean-suppliers', {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      setCrossEanResult(data);

      const created = data?.stats?.supplier_products_created ?? 0;
      const eans = data?.stats?.eans_with_duplicates ?? 0;
      if (dryRun) {
        toast.info(`Simulation : ${created} liens à créer pour ${eans} EAN dupliqués`);
      } else {
        toast.success(`Rattrapage cross-EAN terminé : ${created} liens créés pour ${eans} EAN dupliqués`);
      }
    } catch (err: unknown) {
      toast.error("Erreur rattrapage cross-EAN", { description: getErrorMessage(err) });
    } finally {
      setCrossEanLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Backfill supplier_products */}
      <Card className="border-orange-300/40 bg-orange-50/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <RefreshCw className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <CardTitle className="text-base">Rétroaction — Liaison fournisseur ALSO</CardTitle>
              <CardDescription>
                Crée les entrées manquantes dans <code className="text-xs bg-muted px-1 rounded">supplier_products</code> pour les produits importés depuis ALSO.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={() => handleBackfill(true)} disabled={backfillLoading}>
              {backfillLoading && backfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Simuler (dry-run)
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => handleBackfill(false)} disabled={backfillLoading}>
              {backfillLoading && !backfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {backfillLoading && !backfillDryRun ? "Rétroaction en cours..." : "Lancer la rétroaction"}
            </Button>
          </div>

          {backfillResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{backfillResult.stats?.dry_run ? 'Résultat simulation' : 'Résultat rétroaction'}</span>
                {backfillResult.stats?.dry_run && <Badge variant="secondary">dry-run</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-muted-foreground">Produits scannés :</span> <strong>{backfillResult.stats?.total_products_scanned ?? 0}</strong></div>
                <div><span className="text-muted-foreground">{backfillResult.stats?.dry_run ? 'À créer' : 'Créés'} :</span> <strong className="text-primary">{backfillResult.stats?.inserted ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Déjà liés :</span> <strong>{backfillResult.stats?.already_linked ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Erreurs :</span> <strong className={(backfillResult.stats?.errors ?? 0) > 0 ? 'text-destructive' : ''}>{backfillResult.stats?.errors ?? 0}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backfill supplier_offers */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Backfill supplier_offers ALSO</CardTitle>
              <CardDescription>
                Crée/actualise les offres à partir de <code className="text-xs bg-muted px-1 rounded">supplier_products</code> pour ALSO, puis recalcule les rollups.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={() => handleOffersBackfill(true)} disabled={offersBackfillLoading}>
              {offersBackfillLoading && offersBackfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Simuler (dry-run)
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => handleOffersBackfill(false)} disabled={offersBackfillLoading}>
              {offersBackfillLoading && !offersBackfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {offersBackfillLoading && !offersBackfillDryRun ? "Backfill en cours..." : "Lancer le backfill offres"}
            </Button>
          </div>

          {offersBackfillResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{offersBackfillResult.stats?.dry_run ? 'Résultat simulation' : 'Résultat backfill'}</span>
                {offersBackfillResult.stats?.dry_run && <Badge variant="secondary">dry-run</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-muted-foreground">Scannés :</span> <strong>{offersBackfillResult.stats?.scanned ?? 0}</strong></div>
                <div><span className="text-muted-foreground">{offersBackfillResult.stats?.dry_run ? 'À upserter' : 'Upsertés'} :</span> <strong className="text-primary">{offersBackfillResult.stats?.upserted ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Ignorés :</span> <strong>{offersBackfillResult.stats?.skipped ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Erreurs :</span> <strong className={(offersBackfillResult.stats?.errors ?? 0) > 0 ? 'text-destructive' : ''}>{offersBackfillResult.stats?.errors ?? 0}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-EAN backfill */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Rattrapage cross-EAN (multi-fournisseurs)</CardTitle>
              <CardDescription>
                Pour chaque EAN partagé par plusieurs produits, copie les <code className="text-xs bg-muted px-1 rounded">supplier_products</code> manquants.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={() => handleCrossEanBackfill(true)} disabled={crossEanLoading}>
              {crossEanLoading && crossEanDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Simuler (dry-run)
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => handleCrossEanBackfill(false)} disabled={crossEanLoading}>
              {crossEanLoading && !crossEanDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {crossEanLoading && !crossEanDryRun ? "Rattrapage en cours..." : "Lancer le rattrapage cross-EAN"}
            </Button>
          </div>

          {crossEanResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{crossEanResult.stats?.dry_run ? 'Résultat simulation' : 'Résultat rattrapage'}</span>
                {crossEanResult.stats?.dry_run && <Badge variant="secondary">dry-run</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-muted-foreground">EAN dupliqués :</span> <strong>{crossEanResult.stats?.eans_with_duplicates ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Produits scannés :</span> <strong>{crossEanResult.stats?.products_scanned ?? 0}</strong></div>
                <div><span className="text-muted-foreground">{crossEanResult.stats?.dry_run ? 'À créer' : 'Créés'} :</span> <strong className="text-primary">{crossEanResult.stats?.supplier_products_created ?? 0}</strong></div>
                <div><span className="text-muted-foreground">Déjà liés :</span> <strong>{crossEanResult.stats?.already_linked ?? 0}</strong></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
