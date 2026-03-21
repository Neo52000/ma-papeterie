import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ParsedData {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
  mappedHeaders: { original: string; mapped: string }[];
  unmappedHeaders: string[];
}

interface ImportPreviewProps {
  parsed: ParsedData;
  previewCols: string[];
}

export function ImportPreview({ parsed, previewCols }: ImportPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Rapport de mapping des colonnes */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Rapport de mapping — {parsed.mappedHeaders.length} colonne(s) reconnue(s) / {parsed.mappedHeaders.length + parsed.unmappedHeaders.length} total
        </div>
        <div className="flex flex-wrap gap-1">
          {parsed.mappedHeaders.map(({ original, mapped }) => (
            <Badge key={original} variant="secondary" className="text-xs gap-1">
              <span className="text-muted-foreground">{original}</span>
              <span>→</span>
              <span className="font-mono text-primary">{mapped}</span>
            </Badge>
          ))}
        </div>
        {parsed.unmappedHeaders.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 font-medium text-destructive mb-1">
              <AlertCircle className="h-3 w-3" />
              {parsed.unmappedHeaders.length} colonne(s) ignorée(s) (non reconnues)
            </div>
            <div className="flex flex-wrap gap-1">
              {parsed.unmappedHeaders.map(h => (
                <Badge key={h} variant="destructive" className="text-xs opacity-80">{h}</Badge>
              ))}
            </div>
            <p className="text-muted-foreground mt-1">
              Ces colonnes ne correspondent à aucun pattern dans COLUMN_MAP. Si une colonne importante est ignorée (ex: "Prix d'achat"), ajoutez son alias dans le mapping.
            </p>
          </div>
        )}
      </div>

      <div className="border rounded-lg overflow-auto max-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>{previewCols.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {parsed.rows.slice(0, 10).map((row, i) => (
              <TableRow key={i}>
                {previewCols.map(h => <TableCell key={h} className="text-xs max-w-[200px] truncate">{row[h] || '—'}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Aperçu des 10 premières lignes sur {parsed.totalRows}</p>
    </div>
  );
}
