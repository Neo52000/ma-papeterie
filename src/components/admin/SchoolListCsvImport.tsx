import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSchools } from '@/hooks/useSchools';

interface SchoolListCsvImportProps {
  onComplete?: () => void;
}

export const SchoolListCsvImport = ({ onComplete }: SchoolListCsvImportProps) => {
  const { schools } = useSchools();
  const [file, setFile] = useState<File | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
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
    if (!file || !selectedSchoolId) {
      toast.error('Veuillez sélectionner un établissement et un fichier');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('process-school-list', {
        body: { 
          csvData: text,
          schoolId: selectedSchoolId
        }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success > 0) {
        toast.success(`Liste scolaire importée avec ${data.success} article(s)`);
        onComplete?.();
      }
      
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erreur(s) détectée(s)`);
      }
    } catch (error: any) {
      console.error('Error importing school list:', error);
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
          Import CSV - Listes scolaires
        </CardTitle>
        <CardDescription>
          Importez une liste scolaire complète depuis un fichier CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Format attendu :</strong> item_name, description, quantity, is_mandatory
            <br />
            Les produits seront matchés automatiquement avec l'IA
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="school-select">Établissement *</Label>
          <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un établissement" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name} - {school.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="school-list-csv-upload"
          />
          <label htmlFor="school-list-csv-upload">
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

        {file && selectedSchoolId && (
          <Button onClick={handleImport} disabled={loading} className="w-full">
            {loading ? 'Import en cours...' : 'Importer la liste scolaire'}
          </Button>
        )}

        {result && (
          <div className="space-y-2">
            {result.success > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.success} article(s) importé(s) avec succès
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
