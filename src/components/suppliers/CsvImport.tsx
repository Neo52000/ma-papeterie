import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CsvImportProps {
  supplierId: string;
  onImportComplete: () => void;
}

interface CsvRow {
  supplier_reference: string;
  product_name?: string;
  ean?: string;
  supplier_price: number;
  stock_quantity?: number;
  lead_time_days?: number;
}

interface ImportResult {
  success: number;
  errors: number;
  unmatched: number;
  total: number;
}

export const CsvImport = ({ supplierId, onImportComplete }: CsvImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parsePreview(selectedFile);
    }
  };

  const parsePreview = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error('Fichier CSV vide ou invalide');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const previewData = lines.slice(1, 4).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row as CsvRow;
    });

    setPreview(previewData);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const rows: CsvRow[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          const val = values[index];
          if (val !== undefined && val !== '') row[header] = val;
        });
        // Normalize numeric fields
        if (row.supplier_price) row.supplier_price = parseFloat(row.supplier_price) || 0;
        if (row.stock_quantity) row.stock_quantity = parseInt(row.stock_quantity, 10) || undefined;
        if (row.lead_time_days) row.lead_time_days = parseInt(row.lead_time_days, 10) || undefined;
        return row as CsvRow;
      }).filter(r => r.supplier_reference && r.supplier_price != null);

      if (rows.length === 0) {
        toast.error('Aucune ligne valide trouvée (colonnes requises : supplier_reference, supplier_price)');
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-supplier-pricing', {
        body: { supplierId, format: 'csv', data: rows, filename: file.name },
      });

      if (error) throw error;

      setResult(data as ImportResult);

      if ((data.errors || 0) > 0) {
        toast.warning(`Import terminé avec ${data.errors} erreur(s)`, {
          description: `${data.success} associés, ${data.unmatched} non trouvés`,
        });
      } else {
        toast.success(`Import terminé : ${data.success} produit(s) associés`, {
          description: data.unmatched > 0 ? `${data.unmatched} référence(s) sans correspondance` : undefined,
        });
      }

      onImportComplete();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer un catalogue fournisseur (CSV)</CardTitle>
        <CardDescription>
          Colonnes requises : supplier_reference, supplier_price — Optionnelles : ean, product_name, stock_quantity, lead_time_days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csv-file">Fichier CSV</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-1"
          />
        </div>

        {preview.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aperçu des premières lignes :
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || isProcessing}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isProcessing ? 'Import en cours...' : 'Importer et matcher les produits'}
        </Button>

        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="grid grid-cols-4 gap-2 text-sm mt-1">
                <div><span className="text-muted-foreground">Total :</span> <strong>{result.total}</strong></div>
                <div><span className="text-muted-foreground">Associés :</span> <strong className="text-primary">{result.success}</strong></div>
                <div><span className="text-muted-foreground">Non trouvés :</span> <strong>{result.unmatched}</strong></div>
                <div><span className="text-muted-foreground">Erreurs :</span> <strong className={result.errors > 0 ? 'text-destructive' : ''}>{result.errors}</strong></div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
