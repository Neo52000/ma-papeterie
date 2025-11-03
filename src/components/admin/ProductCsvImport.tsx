import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportResult {
  success: Array<{ product: string; id: string }>;
  errors: Array<{ row: string; error: string }>;
}

export const ProductCsvImport = ({ onComplete }: { onComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error('Veuillez sélectionner un fichier CSV valide');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const { data, error } = await supabase.functions.invoke('import-products-csv', {
        body: { csvData: text, columns: headers }
      });

      if (error) throw error;

      setResult(data);
      toast.success(`${data.success.length} produits importés avec succès`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erreurs lors de l'import`);
      }
      onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import du fichier');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import CSV de Produits</CardTitle>
        <CardDescription>
          Format: nom, description, catégorie, prix_ttc, ean, stock_quantity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
            </p>
          </label>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>{result.success.length} produits importés</span>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{result.errors.length} erreurs</span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importer avec IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
