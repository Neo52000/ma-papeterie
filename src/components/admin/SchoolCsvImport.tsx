import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SchoolCsvImportProps {
  onComplete?: () => void;
}

export const SchoolCsvImport = ({ onComplete }: SchoolCsvImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error('Veuillez sélectionner un fichier CSV');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('import-schools-csv', {
        body: { csvData: text }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success > 0) {
        toast.success(`${data.success} établissement(s) importé(s)`);
        onComplete?.();
      }
      
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erreur(s) détectée(s)`);
      }
    } catch (error: any) {
      console.error('Error importing schools:', error);
      toast.error(error.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Import CSV - Établissements scolaires
        </CardTitle>
        <CardDescription>
          Importez des établissements en masse depuis un fichier CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Format attendu :</strong> name, address, postal_code, city, school_type, official_code
            <br />
            <strong>Types acceptés :</strong> primaire, collège, lycée
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="school-csv-upload"
          />
          <label htmlFor="school-csv-upload">
            <Button type="button" variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Choisir un fichier CSV
              </span>
            </Button>
          </label>
          {file && (
            <span className="text-sm text-muted-foreground">{file.name}</span>
          )}
        </div>

        {file && (
          <Button onClick={handleImport} disabled={loading} className="w-full">
            {loading ? 'Import en cours...' : 'Importer les établissements'}
          </Button>
        )}

        {result && (
          <div className="space-y-2">
            {result.success > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} établissement(s) importé(s) avec succès
                </AlertDescription>
              </Alert>
            )}
            
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreurs :</strong>
                  <ul className="list-disc pl-4 mt-2">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  {result.errors.length > 5 && (
                    <p className="mt-2">... et {result.errors.length - 5} autre(s) erreur(s)</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
