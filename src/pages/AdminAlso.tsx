import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Server, Wifi, WifiOff, Package, Database, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [sftpTesting, setSftpTesting] = useState(false);
  const [sftpResult, setSftpResult] = useState<any>(null);
  const [syncRunning, setSyncRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, DiagnosticResult>>({});
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const handleTestSftp = async () => {
    setSftpTesting(true);
    setSftpResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-also-sftp', {
        body: { test_only: true },
      });
      if (error) throw error;
      setSftpResult(data);
      if (data?.connected) {
        toast.success("Connexion SFTP ALSO réussie", {
          description: `${data.file_list?.length ?? 0} fichier(s) trouvé(s)`,
        });
      } else {
        toast.error("Échec connexion SFTP", { description: data?.error || 'Erreur inconnue' });
      }
    } catch (err: any) {
      toast.error("Erreur test SFTP", { description: err.message });
    } finally {
      setSftpTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-also-sftp', {
        body: {},
      });
      if (error) throw error;

      const created = data?.import_result?.created ?? 0;
      const updated = data?.import_result?.updated ?? 0;
      const errors = data?.import_result?.errors ?? 0;
      if (errors > 0) {
        toast.warning("Sync ALSO terminée avec erreurs", {
          description: `${created} créés, ${updated} modifiés, ${errors} erreur(s)`,
        });
      } else {
        toast.success("Sync ALSO terminée", {
          description: `${created} créés, ${updated} modifiés`,
        });
      }
    } catch (err: any) {
      toast.error("Erreur sync SFTP", { description: err.message });
    } finally {
      setSyncRunning(false);
    }
  };

  const runDiagnostics = async () => {
    setDiagnosticLoading(true);
    const results: Record<string, DiagnosticResult> = {};
    for (const diag of DIAGNOSTICS) {
      try {
        results[diag.id] = await diag.run();
      } catch (err: any) {
        results[diag.id] = { count: -1, detail: err.message };
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
                      Connexion au serveur paco.also.com pour télécharger et importer automatiquement le catalogue tarif.
                      La synchronisation est planifiée quotidiennement à 04:00 UTC.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="outline" className="gap-2" onClick={handleTestSftp} disabled={sftpTesting || syncRunning}>
                    {sftpTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    Tester la connexion SFTP
                  </Button>
                  <Button className="gap-2" onClick={handleSync} disabled={sftpTesting || syncRunning}>
                    {syncRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    {syncRunning ? "Synchronisation en cours..." : "Lancer la synchronisation"}
                  </Button>
                </div>

                {sftpResult && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {sftpResult.connected ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">
                        {sftpResult.connected ? 'Connexion réussie' : 'Échec connexion'}
                      </span>
                      {sftpResult.duration_ms && (
                        <Badge variant="secondary">{sftpResult.duration_ms}ms</Badge>
                      )}
                    </div>
                    {sftpResult.file_list && (
                      <div>
                        <p className="text-muted-foreground mb-1">Fichiers disponibles :</p>
                        <ul className="space-y-1">
                          {sftpResult.file_list.map((f: any, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-xs">
                              <Database className="h-3 w-3" />
                              <span>{f.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {(f.size / 1024).toFixed(0)} KB
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sftpResult.error && (
                      <p className="text-destructive text-xs">{sftpResult.error}</p>
                    )}
                  </div>
                )}
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
