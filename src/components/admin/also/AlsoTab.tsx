import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileSpreadsheet, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { toast } from "sonner";
import { parseAlsoFile, type ParsedAlsoData } from "@/lib/importers/also-parser";
import type { ImportResultData } from "@/components/admin/comlandi/ComlandiShared";
import { getErrorMessage, ImportResult, ImportLogsList } from "@/components/admin/comlandi/ComlandiShared";

export function AlsoTab() {
  const [parsed, setParsed] = useState<ParsedAlsoData | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [mode, setMode] = useState<'create' | 'enrich'>('enrich');
  const { logs, refetch: refetchLogs } = useImportLogs();
  const fileRef = useRef<HTMLInputElement>(null);

  const alsoLogs = logs.filter(l => l.format === 'also-catalogue');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseAlsoFile(file);
      setParsed(data);
      setResult(null);

      if (data.unmappedHeaders.length > 0) {
        toast.warning(`${data.unmappedHeaders.length} colonne(s) non reconnue(s)`, {
          description: `Ignorées : ${data.unmappedHeaders.slice(0, 5).join(', ')}${data.unmappedHeaders.length > 5 ? '…' : ''}`,
        });
      } else {
        toast.success(`${data.rows.length} lignes analysées`, { description: `${data.headers.length} colonnes mappées` });
      }
    } catch (err: unknown) {
      toast.error("Erreur lecture fichier", { description: getErrorMessage(err) });
    }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setResult(null);

    try {
      const BATCH = 500;
      const totals = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [] as string[],
        warnings_count: 0,
        warnings: [] as string[],
      };
      const totalBatches = Math.ceil(parsed.rows.length / BATCH);

      for (let i = 0; i < parsed.rows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setProgress(`Batch ${batchNum}/${totalBatches}...`);
        const batch = parsed.rows.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke('import-also', {
          body: { rows: batch, mode },
        });
        if (error) throw error;
        totals.created += data.created || 0;
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.details.push(...(data.details || []));
        totals.warnings_count += data.warnings_count || 0;
        if (Array.isArray(data.warnings)) {
          for (const warning of data.warnings) {
            if (totals.warnings.length >= 50) break;
            totals.warnings.push(warning);
          }
        }
      }

      setResult(totals);
      refetchLogs();

      if (totals.errors > 0) {
        toast.warning("Import terminé avec erreurs", {
          description: `${totals.created} créés, ${totals.updated} modifiés, ${totals.errors} erreur(s)`,
        });
      } else {
        toast.success("Import terminé", {
          description: `${totals.created} créés, ${totals.updated} modifiés, ${totals.skipped} ignorés`,
        });
      }
    } catch (err: unknown) {
      toast.error("Erreur import", { description: getErrorMessage(err) });
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <FileSpreadsheet className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <CardTitle className="text-base">Import catalogue ALSO</CardTitle>
              <CardDescription>
                Chargez le fichier tarif ALSO (pricelist-1.txt.zip ou fichier TXT/CSV).
                Le fichier ZIP sera automatiquement décompressé.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".zip,.txt,.csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" /> Charger un fichier ZIP / TXT / CSV
            </Button>
            {parsed && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" /> {parsed.totalRows} articles détectés
              </Badge>
            )}
          </div>

          {parsed && (
            <>
              <div className="flex gap-2">
                <Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setMode('create')}>Créer + Enrichir</Button>
                <Button variant={mode === 'enrich' ? 'default' : 'outline'} size="sm" onClick={() => setMode('enrich')}>Enrichir uniquement (par EAN)</Button>
              </div>

              {parsed.mappedHeaders.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Colonnes mappées :</span>{' '}
                  {parsed.mappedHeaders.map(h => h.mapped).join(', ')}
                </div>
              )}

              {parsed.unmappedHeaders.length > 0 && (
                <div className="text-xs text-orange-600">
                  <span className="font-medium">Colonnes ignorées :</span>{' '}
                  {parsed.unmappedHeaders.join(', ')}
                </div>
              )}

              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? `Import en cours... ${progress}` : `Importer ${parsed.totalRows} articles (${mode === 'create' ? 'créer + enrichir' : 'enrichir uniquement'})`}
              </Button>
            </>
          )}

          {result && <ImportResult result={result} />}

          {result?.details && result.details.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Détails erreurs ({result.details.length})</summary>
              <ul className="mt-2 space-y-1 max-h-[200px] overflow-auto">
                {result.details.map((d, i) => <li key={i}>- {d}</li>)}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {alsoLogs.length > 0 && <ImportLogsList logs={alsoLogs} emptyText="Aucun import ALSO" />}
    </div>
  );
}
