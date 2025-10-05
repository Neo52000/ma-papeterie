import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface CsvImportProps {
  supplierId: string;
  onImportComplete: () => void;
}

interface CsvRow {
  supplier_reference: string;
  product_name: string;
  supplier_price: number;
  stock_quantity?: number;
  lead_time_days?: number;
}

export const CsvImport = ({ supplierId, onImportComplete }: CsvImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);

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
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const rows: CsvRow[] = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
      });

      // Ici, nous enverrons les données à une edge function pour traitement avec AI
      toast.success(`${rows.length} lignes prêtes à être importées`);
      
      // TODO: Implémenter l'appel à l'edge function avec AI pour matcher les produits
      console.log('Import data:', { supplierId, rows });
      
      onImportComplete();
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
        <CardTitle>Importer un catalogue fournisseur (CSV)</CardTitle>
        <CardDescription>
          Format attendu : supplier_reference, product_name, supplier_price, stock_quantity, lead_time_days
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
          {isProcessing ? 'Import en cours...' : 'Importer et analyser avec AI'}
        </Button>
      </CardContent>
    </Card>
  );
};
