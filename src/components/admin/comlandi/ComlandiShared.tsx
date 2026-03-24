import { CheckCircle2, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportLog } from "@/hooks/useImportLogs";

export interface BackfillResult {
  stats?: {
    inserted?: number;
    total_products_scanned?: number;
    supplier_products_created?: number;
    eans_with_duplicates?: number;
    errors?: number;
    upserted?: number;
    scanned?: number;
    dry_run?: boolean | number;
    already_linked?: number;
    skipped_no_supplier?: number;
    skipped?: number;
    rollup_products?: number;
    products_scanned?: number;
    rollups_triggered?: number;
    warnings?: string[];
  };
  warnings_count?: number;
  warnings?: string[];
}

export interface ImportResultData {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: string[];
  price_changes?: PriceChange[];
  warnings_count?: number;
  warnings?: string[];
  format?: string;
  catalog_count?: number;
  prices_count?: number;
  stock_count?: number;
  merged_total?: number;
}

export interface PriceChange {
  ref?: string;
  ean?: string;
  old_cost?: number;
  new_cost?: number;
  old_ttc?: number;
  new_ttc?: number;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function ImportResult({ result }: { result: ImportResultData }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        {result.errors === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="font-medium text-sm">Résultat de l'import</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div><span className="text-muted-foreground">Créés :</span> <strong>{result.created}</strong></div>
        <div><span className="text-muted-foreground">Modifiés :</span> <strong>{result.updated}</strong></div>
        <div><span className="text-muted-foreground">Ignorés :</span> <strong>{result.skipped}</strong></div>
        <div><span className="text-muted-foreground">Erreurs :</span> <strong className={result.errors > 0 ? 'text-destructive' : ''}>{result.errors}</strong></div>
        <div><span className="text-muted-foreground">Alertes :</span> <strong className={(result.warnings_count || 0) > 0 ? 'text-warning-foreground' : ''}>{result.warnings_count || 0}</strong></div>
      </div>
      {result.price_changes?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Changements de prix ({result.price_changes.length})</summary>
          <div className="mt-2 max-h-[200px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Réf</TableHead>
                  <TableHead className="text-xs">Ancien PA</TableHead>
                  <TableHead className="text-xs">Nouveau PA</TableHead>
                  <TableHead className="text-xs">Ancien TTC</TableHead>
                  <TableHead className="text-xs">Nouveau TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.price_changes.slice(0, 50).map((pc: PriceChange, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{pc.ref || pc.ean}</TableCell>
                    <TableCell className="text-xs">{pc.old_cost?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.new_cost?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.old_ttc?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.new_ttc?.toFixed(2) ?? '—'} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
      {result.details?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Voir les erreurs ({result.details.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {result.details.map((d: string, i: number) => <li key={i}>• {d}</li>)}
          </ul>
        </details>
      )}
      {result.warnings?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Alertes techniques ({result.warnings.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {result.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

export function ImportLogsList({ logs, emptyText }: { logs: ImportLog[]; emptyText: string }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {logs.slice(0, 10).map(log => (
        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
          <span className="text-muted-foreground">
            {new Date(log.imported_at || '').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-primary text-xs">✓ {log.success_count}</span>
            {(log.error_count || 0) > 0 && <span className="text-destructive text-xs">✗ {log.error_count}</span>}
            <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
          </div>
        </div>
      ))}
    </div>
  );
}
