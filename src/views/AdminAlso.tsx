import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Server, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AlsoTab } from "@/components/admin/also/AlsoTab";
import { AlsoBackfillSection } from "@/components/admin/also/AlsoBackfillSection";

interface DiagnosticResult {
  count: number;
  detail: string;
}

const DIAGNOSTICS = [
  {
    id: 'total-products',
    label: 'Produits ALSO',
    description: 'Nombre de produits avec source also',
    run: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .contains('attributs', { source: 'also' });
      if (error) throw error;
      return { count: count ?? 0, detail: '' };
    },
  },
  {
    id: 'supplier-offers',
    label: 'Offres supplier_offers',
    description: 'Nombre d\'offres ALSO actives',
    run: async () => {
      const { count, error } = await supabase
        .from('supplier_offers')
        .select('*', { count: 'exact', head: true })
        .eq('supplier', 'ALSO')
        .eq('is_active', true);
      if (error) throw error;
      return { count: count ?? 0, detail: '' };
    },
  },
  {
    id: 'supplier-products',
    label: 'Liaisons supplier_products',
    description: 'Liens fournisseur ALSO',
    run: async () => {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .ilike('name', '%also%')
        .limit(1)
        .maybeSingle();
      if (!supplier) return { count: 0, detail: 'Fournisseur non trouvé' };
      const { count, error } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true })
        .eq('supplier_id', supplier.id);
      if (error) throw error;
      return { count: count ?? 0, detail: '' };
    },
  },
];

export default function AdminAlso() {
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, DiagnosticResult>>({});
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagnosticLoading(true);
    const results: Record<string, DiagnosticResult> = {};
    for (const diag of DIAGNOSTICS) {
      try {
        results[diag.id] = await diag.run();
      } catch (err: unknown) {
        results[diag.id] = { count: -1, detail: err instanceof Error ? err.message : String(err) };
      }
    }
    setDiagnosticResults(results);
    setDiagnosticLoading(false);
  };

  return (
    <AdminLayout title="ALSO — Consommables">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ALSO — Consommables</h1>
            <p className="text-muted-foreground text-sm">
              Import et synchronisation du catalogue ALSO via SFTP (paco.also.com)
            </p>
          </div>
          <Badge className="border-orange-300 bg-orange-100 text-orange-800">Priorité 4</Badge>
        </div>

        {/* Diagnostics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Diagnostics</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={runDiagnostics} disabled={diagnosticLoading}>
                {diagnosticLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {Object.keys(diagnosticResults).length > 0 && (
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {DIAGNOSTICS.map(diag => {
                  const res = diagnosticResults[diag.id];
                  return (
                    <div key={diag.id} className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{res?.count ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{diag.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import">Import ALSO</TabsTrigger>
            <TabsTrigger value="sftp">Sync SFTP</TabsTrigger>
            <TabsTrigger value="backfill">Backfill</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-4">
            <AlsoTab />
          </TabsContent>

          <TabsContent value="sftp" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <Server className="h-5 w-5 text-orange-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Synchronisation SFTP ALSO</CardTitle>
                    <CardDescription>
                      La synchronisation SFTP est gérée via GitHub Actions (le port SFTP n'est pas accessible depuis les Edge Functions Supabase).
                      Le workflow tourne automatiquement tous les jours à 04:00 UTC ou peut être lancé manuellement.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href="https://github.com/Neo52000/ma-papeterie/actions/workflows/sync-also.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2">
                      <Server className="h-4 w-4" />
                      Ouvrir GitHub Actions
                    </Button>
                  </a>
                  <Badge variant="secondary">Cron : 04:00 UTC quotidien</Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                  <p className="font-medium">Pour lancer manuellement :</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Cliquer sur "Ouvrir GitHub Actions" ci-dessus</li>
                    <li>Cliquer sur "Run workflow"</li>
                    <li>Cocher "Test SFTP connection only" pour un test, ou laisser décoché pour importer</li>
                    <li>Cliquer sur "Run workflow" pour lancer</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backfill" className="mt-4">
            <AlsoBackfillSection />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
