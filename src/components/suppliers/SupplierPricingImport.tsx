import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  parseFile, 
  detectFormat, 
  suggestColumnMapping,
  applyColumnMapping,
  type FileFormat,
  type ParsedData,
  type ColumnMapping,
  type SupplierPricingRow
} from "@/lib/supplierPricingParsers";
import { 
  Upload, 
  FileText, 
  FileCode, 
  FileJson, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye
} from "lucide-react";

interface SupplierPricingImportProps {
  supplierId: string;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

const REQUIRED_FIELDS = ['supplier_reference', 'supplier_price'] as const;
const OPTIONAL_FIELDS = ['product_name', 'ean', 'stock_quantity', 'lead_time_days', 'min_order_quantity'] as const;

const FIELD_LABELS: Record<string, string> = {
  supplier_reference: 'Référence fournisseur *',
  supplier_price: 'Prix HT *',
  product_name: 'Nom du produit',
  ean: 'Code EAN',
  stock_quantity: 'Stock',
  lead_time_days: 'Délai (jours)',
  min_order_quantity: 'Qté minimum',
};

export function SupplierPricingImport({ supplierId, onImportComplete }: SupplierPricingImportProps) {
  const { toast } = useToast();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [format, setFormat] = useState<FileFormat>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Partial<ColumnMapping>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: number;
    unmatched: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptTypes: Record<FileFormat, string> = {
    csv: '.csv,.txt',
    xml: '.xml',
    json: '.json',
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      const content = await selectedFile.text();
      const detectedFormat = detectFormat(content, selectedFile.name);
      setFormat(detectedFormat);
      
      const parsed = parseFile(content, detectedFormat);
      
      if (parsed.rows.length === 0) {
        setError('Le fichier ne contient aucune donnée exploitable');
        return;
      }
      
      setParsedData(parsed);
      
      // Suggérer un mapping automatique
      const suggested = suggestColumnMapping(parsed.headers);
      setColumnMapping(suggested);
      
      setStep('preview');
    } catch (err) {
      console.error('Erreur parsing:', err);
      setError('Erreur lors de la lecture du fichier');
    }
  }, []);

  const handleMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === '__none__' ? undefined : value,
    }));
  };

  const isMappingValid = (): boolean => {
    return REQUIRED_FIELDS.every(field => columnMapping[field]);
  };

  const handleImport = async () => {
    if (!parsedData || !isMappingValid()) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Appliquer le mapping
      const normalizedData = applyColumnMapping(parsedData.rows, columnMapping as ColumnMapping);
      
      if (normalizedData.length === 0) {
        setError('Aucune donnée valide après application du mapping');
        setStep('mapping');
        return;
      }

      // Appeler l'edge function
      const { data, error: fnError } = await supabase.functions.invoke('import-supplier-pricing', {
        body: {
          supplierId,
          format,
          data: normalizedData,
          filename: file?.name,
        },
      });

      if (fnError) {
        throw fnError;
      }

      setImportProgress(100);
      setImportResult(data);
      setStep('complete');
      
      toast({
        title: 'Import terminé',
        description: `${data.success} produits importés avec succès`,
      });

      onImportComplete?.();
    } catch (err) {
      console.error('Erreur import:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      setStep('mapping');
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setImportProgress(0);
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header avec étapes */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Badge variant={step === 'upload' ? 'default' : 'secondary'}>1. Upload</Badge>
        <ArrowRight className="h-4 w-4" />
        <Badge variant={step === 'preview' ? 'default' : 'secondary'}>2. Aperçu</Badge>
        <ArrowRight className="h-4 w-4" />
        <Badge variant={step === 'mapping' ? 'default' : 'secondary'}>3. Mapping</Badge>
        <ArrowRight className="h-4 w-4" />
        <Badge variant={step === 'importing' || step === 'complete' ? 'default' : 'secondary'}>4. Import</Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Étape 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Importer un catalogue fournisseur</CardTitle>
            <CardDescription>
              Sélectionnez le format et uploadez votre fichier de tarifs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Format du fichier</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as FileFormat)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    CSV
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xml" id="xml" />
                  <Label htmlFor="xml" className="flex items-center gap-2 cursor-pointer">
                    <FileCode className="h-4 w-4" />
                    XML
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Fichier</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <Input
                  type="file"
                  accept={acceptTypes[format]}
                  onChange={handleFileSelect}
                  className="max-w-xs mx-auto"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Formats acceptés : {format.toUpperCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Preview */}
      {step === 'preview' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Aperçu des données
            </CardTitle>
            <CardDescription>
              {parsedData.rows.length} lignes détectées - Format : {parsedData.format.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg overflow-auto max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsedData.headers.slice(0, 8).map((header) => (
                      <TableHead key={header} className="whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                    {parsedData.headers.length > 8 && (
                      <TableHead>+{parsedData.headers.length - 8} cols</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      {parsedData.headers.slice(0, 8).map((header) => (
                        <TableCell key={header} className="whitespace-nowrap">
                          {row[header] !== null ? String(row[header]).substring(0, 50) : '-'}
                        </TableCell>
                      ))}
                      {parsedData.headers.length > 8 && <TableCell>...</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetImport}>
                Annuler
              </Button>
              <Button onClick={() => setStep('mapping')}>
                Continuer vers le mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 3: Mapping */}
      {step === 'mapping' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping des colonnes</CardTitle>
            <CardDescription>
              Associez les colonnes de votre fichier aux champs attendus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Champs requis */}
              {REQUIRED_FIELDS.map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={columnMapping[field] || '__none__'}
                    onValueChange={(v) => handleMappingChange(field, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Non mappé --</SelectItem>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {/* Champs optionnels */}
              {OPTIONAL_FIELDS.map((field) => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={columnMapping[field] || '__none__'}
                    onValueChange={(v) => handleMappingChange(field, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Non mappé --</SelectItem>
                      {parsedData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!isMappingValid() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez mapper au minimum les champs obligatoires : Référence et Prix HT
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Retour
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!isMappingValid()}
              >
                Lancer l'import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 4: Import en cours */}
      {step === 'importing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Import en cours...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} />
            <p className="text-sm text-muted-foreground text-center">
              Traitement des données en cours, veuillez patienter...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Étape 5: Résultat */}
      {step === 'complete' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Import terminé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total lignes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-muted-foreground">Importés</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{importResult.unmatched}</div>
                <div className="text-sm text-muted-foreground">Non matchés</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                <div className="text-sm text-muted-foreground">Erreurs</div>
              </div>
            </div>

            {importResult.unmatched > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.unmatched} produits n'ont pas pu être associés à un produit existant. 
                  Ils ont été créés comme "non matchés" et peuvent être associés manuellement.
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={resetImport} className="w-full">
              Nouvel import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
