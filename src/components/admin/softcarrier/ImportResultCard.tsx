import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ImportResult {
  created?: number;
  updated?: number;
  success?: number;
  skipped: number;
  errors: number;
  rollups_recomputed?: number;
  details?: string[];
}

interface ImportResultCardProps {
  result: ImportResult;
}

export function ImportResultCard({ result: res }: ImportResultCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        {res.errors === 0
          ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="font-medium text-sm">Résultat de l'import</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {res.created !== undefined && (
          <div><span className="text-muted-foreground">Créés :</span> <strong>{res.created}</strong></div>
        )}
        {res.updated !== undefined && (
          <div><span className="text-muted-foreground">Maj :</span> <strong>{res.updated}</strong></div>
        )}
        {res.success !== undefined && res.created === undefined && (
          <div><span className="text-muted-foreground">Succès :</span> <strong>{res.success}</strong></div>
        )}
        <div><span className="text-muted-foreground">Ignorés :</span> <strong>{res.skipped}</strong></div>
        <div>
          <span className="text-muted-foreground">Erreurs :</span>{' '}
          <strong className={res.errors > 0 ? 'text-destructive' : ''}>{res.errors}</strong>
        </div>
        {(res.rollups_recomputed ?? 0) > 0 && (
          <div><span className="text-muted-foreground">Rollups :</span> <strong className="text-primary">{res.rollups_recomputed}</strong></div>
        )}
      </div>
      {(res.details?.length ?? 0) > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Voir les détails ({res.details!.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {res.details!.map((d, i) => <li key={i}>• {d}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
