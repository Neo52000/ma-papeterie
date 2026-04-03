import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database, Zap, CheckCircle2, Clock, Package, Play,
  RefreshCw, AlertCircle, Copy, Search, Loader2,
} from "lucide-react";
import {
  useIcecatStats,
  useIcecatSampleProducts,
} from "@/hooks/useIcecatEnrich";
import { useIcecatEnrichMutation } from "@/hooks/useIcecatEnrichMutation";
import { IcecatProductPreview } from "@/components/admin/IcecatProductPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copié !"),
    () => toast.error("Erreur de copie"),
  );
}

interface SampleProduct {
  id: string;
  name: string;
  ean: string;
  brand?: string;
  icecat_id?: number;
  icecat_title?: string;
  specifications?: Record<string, unknown>;
  icecat_enriched_at?: string;
}

export default function AdminIcecatEnrich() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useIcecatStats();
  const {
    data: sample,
    isLoading: sampleLoading,
    error: sampleError,
    refetch: refetchSample,
  } = useIcecatSampleProducts(15);

  const enrichMutation = useIcecatEnrichMutation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!sample) return;
    if (selectedIds.size === sample.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sample.map((p: SampleProduct) => p.id)));
    }
  };

  const handleEnrichBatch = async (limit?: number) => {
    try {
      const result = await enrichMutation.mutateAsync({ limit: limit ?? 50 });
      toast.success(
        `Enrichissement terminé : ${result.enriched} enrichis, ${result.not_found} non trouvés, ${result.errors} erreurs`,
      );
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    }
  };

  const handleEnrichSelection = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await enrichMutation.mutateAsync({
        product_ids: Array.from(selectedIds),
        force: true,
      });
      toast.success(
        `${result.enriched} enrichis, ${result.not_found} non trouvés, ${result.errors} erreurs`,
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    }
  };

  const handleEnrichSingle = async (productId: string) => {
    try {
      const result = await enrichMutation.mutateAsync({
        product_ids: [productId],
        force: true,
      });
      const r = result.results[0];
      if (r?.status === "enriched") {
        toast.success(`Produit enrichi (Icecat ID: ${r.icecat_id})`);
      } else if (r?.status === "not_found") {
        toast.info("Produit non trouvé dans Icecat");
      } else {
        toast.error(`Erreur : ${r?.error ?? "Inconnue"}`);
      }
    } catch (err) {
      toast.error(`Erreur : ${err instanceof Error ? err.message : "Erreur inconnue"}`);
    }
  };

  const openPreview = (productId: string) => {
    setPreviewProductId(productId);
    setPreviewOpen(true);
  };

  const hasError = statsError || sampleError;

  const cliCommands = [
    { label: "Enrichissement complet", cmd: "npx tsx scripts/icecat-enrich.ts" },
    { label: "Tester un EAN", cmd: "npx tsx scripts/icecat-enrich.ts --ean=3148950616753 --dry-run --verbose" },
    { label: "Limiter à 50", cmd: "npx tsx scripts/icecat-enrich.ts --limit=50 --verbose" },
    { label: "Ré-enrichir", cmd: "npx tsx scripts/icecat-enrich.ts --force --limit=100" },
  ];

  return (
    <AdminLayout
      title="Enrichissement Icecat"
      description="Suivi de l'enrichissement des fiches produit via l'API Icecat (Open Icecat)"
    >
      {/* Error alert */}
      {hasError && (
        <Card className="mb-6 border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>
                Erreur de chargement :{" "}
                {(statsError as Error)?.message || (sampleError as Error)?.message}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetchStats(); refetchSample(); }}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              Produits avec EAN
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">
                {stats?.total_with_ean.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Enrichis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-green-600">
                {stats?.enriched.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Search className="h-3 w-3 text-amber-500" /> Non trouvés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">
                {stats?.not_found.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Package className="h-3 w-3" /> A enrichir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">
                {stats?.not_enriched.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" /> Dernier enrichissement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-sm font-medium">
                {formatDate(stats?.last_enriched_at ?? null)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress bar + batch action */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Progression globale</CardTitle>
          {!statsLoading && (stats?.not_enriched ?? 0) > 0 && (
            <Button
              size="sm"
              onClick={() => handleEnrichBatch(50)}
              disabled={enrichMutation.isPending}
            >
              {enrichMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Enrichir 50 produits
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-3 w-full" />
          ) : (
            <>
              <Progress value={stats?.enriched_pct ?? 0} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {stats?.enriched ?? 0} / {stats?.total_with_ean ?? 0} produits
                enrichis ({stats?.enriched_pct ?? 0}%)
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* CLI instructions */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            Commandes CLI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Exécuter depuis le terminal du projet :
          </p>
          <div className="space-y-1.5">
            {cliCommands.map(({ label, cmd }) => (
              <div
                key={cmd}
                className="flex items-center gap-2 bg-muted p-2 rounded text-xs font-mono"
              >
                <code className="flex-1 overflow-x-auto">
                  <span className="text-muted-foreground"># {label}</span>
                  <br />
                  {cmd}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => copyToClipboard(cmd)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Le script charge les variables depuis <code>.env.local</code>.
            Assurez-vous que <code>SUPABASE_SERVICE_ROLE_KEY</code> y est configuré.
          </p>
        </CardContent>
      </Card>

      {/* Recently enriched sample */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Derniers produits traités
          </CardTitle>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrichSelection}
              disabled={enrichMutation.isPending}
            >
              {enrichMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Ré-enrichir ({selectedIds.size})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sampleLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !sample || sample.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun produit enrichi pour le moment. Lancez l'enrichissement
              ci-dessus ou depuis le terminal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={sample.length > 0 && selectedIds.size === sample.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Titre Icecat</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.map((p: SampleProduct) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openPreview(p.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {p.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.ean}
                      </TableCell>
                      <TableCell className="text-xs">{p.brand ?? "--"}</TableCell>
                      <TableCell>
                        {p.icecat_id ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Enrichi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                            Non trouvé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {p.icecat_title ?? "--"}
                      </TableCell>
                      <TableCell>
                        {p.specifications &&
                        Object.keys(p.specifications).length > 0 ? (
                          <Badge variant="default">
                            {Object.keys(p.specifications).length} groupes
                          </Badge>
                        ) : (
                          <Badge variant="outline">Aucune</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(p.icecat_enriched_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEnrichSingle(p.id)}
                          disabled={enrichMutation.isPending}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview drawer */}
      <IcecatProductPreview
        productId={previewProductId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </AdminLayout>
  );
}
