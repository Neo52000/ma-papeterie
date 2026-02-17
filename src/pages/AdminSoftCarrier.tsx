import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Package, Database, BarChart3, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useSoftCarrierImport, type SoftCarrierSource } from "@/hooks/useSoftCarrierImport";
import { useImportLogs } from "@/hooks/useImportLogs";

const sourceConfig: { key: SoftCarrierSource; label: string; desc: string; icon: React.ComponentType<any>; format: string }[] = [
  { key: 'herstinfo', label: 'HERSTINFO.TXT', desc: 'Référentiel marques/fabricants', icon: Database, format: 'TSV CP850' },
  { key: 'preislis', label: 'PREISLIS.TXT', desc: 'Catalogue produits + paliers tarifaires', icon: BarChart3, format: 'TSV CP850' },
  { key: 'artx', label: 'ARTX.TXT', desc: 'Descriptions produits multilingues', icon: FileText, format: 'Largeur fixe CP850' },
  { key: 'tarifsb2b', label: 'TarifsB2B.csv', desc: 'Conditionnements et tarifs B2B', icon: Package, format: 'CSV UTF-8 BOM' },
  { key: 'lagerbestand', label: 'LAGERBESTAND.csv', desc: 'Stock temps réel (toutes les 10 min)', icon: Package, format: 'CSV' },
];

export default function AdminSoftCarrier() {
  const { importFile, importing, lastResult } = useSoftCarrierImport();
  const { logs } = useImportLogs();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const softCarrierLogs = logs.filter(l => l.format?.startsWith('softcarrier-'));

  const handleFileSelect = async (source: SoftCarrierSource, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importFile(source, file);
    e.target.value = '';
  };

  const getLastImport = (source: string) => {
    return softCarrierLogs.find(l => l.format === `softcarrier-${source}`);
  };

  return (
    <AdminLayout title="Soft Carrier France" description="Import et synchronisation du catalogue fournisseur">
      <div className="space-y-6">
        {/* Import Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sourceConfig.map(({ key, label, desc, icon: Icon, format }) => {
            const isImporting = importing === key;
            const result = lastResult[key];
            const lastLog = getLastImport(key);

            return (
              <Card key={key} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{label}</CardTitle>
                        <CardDescription className="text-xs">{desc}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{format}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lastLog && (
                    <div className="text-xs text-muted-foreground">
                      Dernier import : {new Date(lastLog.imported_at || '').toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                      <span className="ml-2">
                        ✓ {lastLog.success_count} | ✗ {lastLog.error_count}
                      </span>
                    </div>
                  )}

                  {result && !isImporting && (
                    <div className="flex items-center gap-2 text-xs">
                      {result.errors === 0 ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span>{result.success} importés, {result.errors} erreurs</span>
                    </div>
                  )}

                  <input
                    ref={el => { fileRefs.current[key] = el; }}
                    type="file"
                    accept=".txt,.csv,.TXT,.CSV"
                    className="hidden"
                    onChange={(e) => handleFileSelect(key, e)}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={isImporting}
                    onClick={() => fileRefs.current[key]?.click()}
                  >
                    {isImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isImporting ? 'Import en cours...' : 'Importer'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des imports</CardTitle>
          </CardHeader>
          <CardContent>
            {softCarrierLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun import Soft Carrier encore effectué</p>
            ) : (
              <div className="space-y-2">
                {softCarrierLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{log.format?.replace('softcarrier-', '')}</Badge>
                      <span className="text-muted-foreground">
                        {new Date(log.imported_at || '').toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-primary text-xs">✓ {log.success_count}</span>
                      {(log.error_count || 0) > 0 && (
                        <span className="text-destructive text-xs">✗ {log.error_count}</span>
                      )}
                      <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
