import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Package } from "lucide-react";
import { toast } from "sonner";

interface ImportLog {
  id: string;
  format: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  price_changes_count: number | null;
  deactivated_count: number | null;
  errors: any;
  report_data: any;
  imported_at: string;
}

export function SupplierImportReport() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ImportLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_import_logs')
        .select('*')
        .in('format', ['comlandi-catalogue', 'liderpapel-catalogue'])
        .order('imported_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setLogs((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Format', 'Total', 'Succès', 'Erreurs', 'Taux erreur (%)'],
      ...logs.map(l => [
        new Date(l.imported_at).toLocaleString('fr-FR'),
        l.format,
        String(l.total_rows),
        String(l.success_count),
        String(l.error_count),
        l.total_rows > 0 ? ((l.error_count / l.total_rows) * 100).toFixed(1) : '0',
      ]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-imports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const getErrorRate = (log: ImportLog) =>
    log.total_rows > 0 ? (log.error_count / log.total_rows) * 100 : 0;

  const lastLog = logs[0];

  return (
    <div className="space-y-6">
      {/* Dernière importation */}
      {lastLog && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary opacity-70" />
              <div>
                <p className="text-2xl font-bold">{lastLog.total_rows.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground">Lignes traitées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
              <div>
                <p className="text-2xl font-bold text-primary">{lastLog.success_count.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground">Succès</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className={`h-8 w-8 ${lastLog.error_count > 0 ? 'text-destructive' : 'text-muted-foreground'} opacity-70`} />
              <div>
                <p className={`text-2xl font-bold ${lastLog.error_count > 0 ? 'text-destructive' : ''}`}>{lastLog.error_count}</p>
                <p className="text-xs text-muted-foreground">Erreurs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-amber-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{lastLog.price_changes_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Changements de prix</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau des imports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historique des imports</CardTitle>
              <CardDescription>30 derniers imports COMLANDI / LIDERPAPEL</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || logs.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun import enregistré</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Succès</TableHead>
                    <TableHead className="text-right">Erreurs</TableHead>
                    <TableHead className="text-right">Taux err.</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const errRate = getErrorRate(log);
                    const isAlert = errRate > 5;
                    return (
                      <TableRow key={log.id} className={isAlert ? 'bg-destructive/5' : undefined}>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(log.imported_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.format === 'comlandi-catalogue' ? 'COMLANDI' : 'LIDERPAPEL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{log.total_rows.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-primary">{log.success_count.toLocaleString('fr-FR')}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${log.error_count > 0 ? 'text-destructive' : ''}`}>{log.error_count}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={errRate > 5 ? 'text-destructive font-semibold' : errRate > 1 ? 'text-amber-500' : 'text-muted-foreground'}>
                            {errRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {isAlert ? (
                            <Badge variant="destructive" className="text-xs">⚠ Alerte</Badge>
                          ) : log.error_count === 0 ? (
                            <Badge variant="default" className="text-xs">✓ OK</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Partiel</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.errors && Array.isArray(log.errors) && log.errors.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            >
                              Détails
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Détail erreurs */}
          {selectedLog && selectedLog.errors && Array.isArray(selectedLog.errors) && selectedLog.errors.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-2">
                Erreurs — Import du {formatDate(selectedLog.imported_at)}
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedLog.errors.slice(0, 30).map((err: string, i: number) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">{err}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
