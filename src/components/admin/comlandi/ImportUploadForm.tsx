import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Eye } from "lucide-react";
import type { ParsedData } from "@/components/admin/comlandi/ImportPreview";

interface ImportUploadFormProps {
  parsed: ParsedData | null;
  importing: boolean;
  progress: string;
  mode: 'create' | 'enrich';
  onModeChange: (mode: 'create' | 'enrich') => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export function ImportUploadForm({
  parsed,
  importing,
  progress,
  mode,
  onModeChange,
  onFileSelect,
  onImport,
}: ImportUploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileSelect} />
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4" /> Charger un fichier CSV / XLS
        </Button>
        {parsed && (
          <Badge variant="secondary" className="gap-1">
            <Eye className="h-3 w-3" /> {parsed.totalRows} articles détectés
          </Badge>
        )}
      </div>

      {parsed && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => onModeChange('create')}>Créer + Enrichir</Button>
            <Button variant={mode === 'enrich' ? 'default' : 'outline'} size="sm" onClick={() => onModeChange('enrich')}>Enrichir uniquement (par EAN)</Button>
          </div>
        </div>
      )}

      {parsed && (
        <Button onClick={onImport} disabled={importing} className="gap-2">
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importing ? `Import en cours... ${progress}` : `Importer ${parsed.totalRows} articles (${mode === 'create' ? 'créer + enrichir' : 'enrichir uniquement'})`}
        </Button>
      )}
    </>
  );
}
