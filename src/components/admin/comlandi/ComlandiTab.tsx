import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { toast } from "sonner";
import { ImportPreview } from "@/components/admin/comlandi/ImportPreview";
import type { ParsedData } from "@/components/admin/comlandi/ImportPreview";
import { ImportUploadForm } from "@/components/admin/comlandi/ImportUploadForm";
import { parseComlandiFile } from "@/lib/importers/comlandi-parser";
import type { ImportResultData } from "@/components/admin/comlandi/ComlandiShared";
import { getErrorMessage, ImportResult, ImportLogsList } from "@/components/admin/comlandi/ComlandiShared";

export function ComlandiTab() {
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [mode, setMode] = useState<'create' | 'enrich'>('create');
  const { logs, refetch: refetchLogs } = useImportLogs();

  const comlandiLogs = logs.filter(l => l.format === 'comlandi-catalogue');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseComlandiFile(file);
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
        const { data, error } = await supabase.functions.invoke('import-comlandi', {
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
            totals.warnings.push(String(warning));
          }
        }
      }

      setResult(totals);
      if (totals.errors > 0) {
        toast.warning(`Import terminé avec ${totals.errors} erreurs`, {
          description: totals.warnings_count > 0 ? `${totals.warnings_count} alerte(s) technique(s)` : undefined,
        });
      } else if (totals.warnings_count > 0) {
        toast.warning(`Import terminé avec alertes`, {
          description: `${totals.warnings_count} alerte(s) technique(s)`,
        });
      } else {
        toast.success(`Import terminé : ${totals.created} créés, ${totals.updated} enrichis`);
      }
      refetchLogs();
    } catch (err: unknown) {
      toast.error("Erreur import", { description: getErrorMessage(err) });
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  const previewCols = ['code', 'reference', 'ean_unite', 'description', 'categorie', 'prix', 'marque'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Tarifs B2B COMLANDI</CardTitle>
              <CardDescription>Catalogue COMLANDI avec prix, taxes, EAN et conditionnements — CSV (;) ou XLS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImportUploadForm
            parsed={parsed}
            importing={importing}
            progress={progress}
            mode={mode}
            onModeChange={setMode}
            onFileSelect={handleFileSelect}
            onImport={handleImport}
          />

          {parsed && (
            <ImportPreview parsed={parsed} previewCols={previewCols} />
          )}

          {result && !importing && <ImportResult result={result} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Historique imports COMLANDI</CardTitle></CardHeader>
        <CardContent>
          <ImportLogsList logs={comlandiLogs} emptyText="Aucun import COMLANDI encore effectué" />
        </CardContent>
      </Card>
    </div>
  );
}
