import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Zap, CheckCircle2, Clock, Package } from "lucide-react";
import {
  useIcecatStats,
  useIcecatSampleProducts,
} from "@/hooks/useIcecatEnrich";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminIcecatEnrich() {
  const { data: stats, isLoading: statsLoading } = useIcecatStats();
  const { data: sample, isLoading: sampleLoading } =
    useIcecatSampleProducts(15);

  return (
    <AdminLayout
      title="Enrichissement Icecat"
      description="Suivi de l'enrichissement des fiches produit via l'API Icecat (Open Icecat)"
    >
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      {/* Progress bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Progression globale</CardTitle>
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
            Lancer l'enrichissement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Exécuter depuis le terminal du projet :
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {`# Enrichissement complet (non enrichis avec EAN)
npx tsx scripts/icecat-enrich.ts

# Tester un seul EAN (dry-run)
npx tsx scripts/icecat-enrich.ts --ean=3148950616753 --dry-run --verbose

# Limiter à 50 produits
npx tsx scripts/icecat-enrich.ts --limit=50 --verbose

# Ré-enrichir les produits déjà traités
npx tsx scripts/icecat-enrich.ts --force --limit=100`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Le script charge les variables depuis <code>.env.local</code>.
            Assurez-vous que <code>SUPABASE_SERVICE_ROLE_KEY</code> y est
            configuré.
          </p>
        </CardContent>
      </Card>

      {/* Recently enriched sample */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Derniers produits enrichis
          </CardTitle>
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
              Aucun produit enrichi pour le moment. Lancez le script
              d'enrichissement depuis le terminal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Icecat ID</TableHead>
                    <TableHead>Titre Icecat</TableHead>
                    <TableHead>Specs</TableHead>
                    <TableHead>Enrichi le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">
                        {p.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.ean}
                      </TableCell>
                      <TableCell className="text-xs">{p.brand ?? "--"}</TableCell>
                      <TableCell>
                        {p.icecat_id ?? (
                          <span className="text-muted-foreground">--</span>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
