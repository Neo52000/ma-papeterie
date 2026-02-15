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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  parseFile, 
  detectFormat, 
  type FileFormat,
  type ParsedData,
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
  Brain,
  Sparkles,
  Type,
} from "lucide-react";

interface SupplierPricingImportProps {
  supplierId: string;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'analyzing' | 'mapping' | 'importing' | 'complete';

interface ColumnDetection {
  source_column: string;
  mapped_to: string;
  confidence: number;
  sample_values: string[];
}

interface AiAnalysisResult {
  detected_columns: ColumnDetection[];
  sample_rows: Record<string, any>[];
  confidence: number;
}

const MAPPED_TO_LABELS: Record<string, string> = {
  supplier_reference: 'Référence fournisseur',
  supplier_price: 'Prix HT',
  product_name: 'Nom du produit',
  ean: 'Code EAN',
  stock_quantity: 'Stock',
  lead_time_days: 'Délai (jours)',
  min_order_quantity: 'Qté minimum',
  ignore: 'Ignorer',
};

const MAPPING_OPTIONS = [
  'supplier_reference', 'supplier_price', 'product_name', 'ean',
  'stock_quantity', 'lead_time_days', 'min_order_quantity', 'ignore',
];

export function SupplierPricingImport({ supplierId, onImportComplete }: SupplierPricingImportProps) {
  const { toast } = useToast();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [format, setFormat] = useState<FileFormat>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number; errors: number; unmatched: number; total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');

  const acceptTypes: Record<FileFormat, string> = {
    csv: '.csv,.txt',
    xml: '.xml',
    json: '.json',
  };

  const getContentForAnalysis = useCallback(async (): Promise<{ content: string; parsed: ParsedData | null }> => {
    if (inputMode === 'text') {
      if (!rawContent.trim()) throw new Error('Veuillez coller du contenu');
      // Try to parse the raw text
      try {
        const detectedFormat = detectFormat(rawContent, 'paste.txt');
        const parsed = parseFile(rawContent, detectedFormat);
        setFormat(detectedFormat);
        return { content: rawContent, parsed };
      } catch {
        // If parsing fails, just send raw text to AI
        return { content: rawContent, parsed: null };
      }
    } else {
      if (!file) throw new Error('Veuillez sélectionner un fichier');
      const content = await file.text();
      const detectedFormat = detectFormat(content, file.name);
      setFormat(detectedFormat);
      const parsed = parseFile(content, detectedFormat);
      return { content, parsed };
    }
  }, [inputMode, rawContent, file]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    setError(null);
    setStep('analyzing');

    try {
      const { content, parsed } = await getContentForAnalysis();
      setParsedData(parsed);

      // Take first ~20 lines for the sample
      const lines = content.split('\n');
      const sampleContent = lines.slice(0, 20).join('\n');

      const { data, error: fnError } = await supabase.functions.invoke('ai-import-catalog', {
        body: { mode: 'analyze', sampleContent },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setAiResult(data as AiAnalysisResult);
      setStep('mapping');
    } catch (err) {
      console.error('Erreur analyse IA:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse IA');
      setStep('upload');
    }
  };

  const handleMappingChange = (sourceColumn: string, newMapping: string) => {
    if (!aiResult) return;
    setAiResult({
      ...aiResult,
      detected_columns: aiResult.detected_columns.map(col =>
        col.source_column === sourceColumn ? { ...col, mapped_to: newMapping } : col
      ),
    });
  };

  const isMappingValid = (): boolean => {
    if (!aiResult) return false;
    const mappedFields = aiResult.detected_columns.map(c => c.mapped_to);
    return mappedFields.includes('supplier_reference') && mappedFields.includes('supplier_price');
  };

  const handleImport = async () => {
    if (!aiResult) return;
    setStep('importing');
    setImportProgress(10);

    try {
      // Build mapping object: { supplier_reference: "source_col_name", ... }
      const mapping: Record<string, string> = {};
      for (const col of aiResult.detected_columns) {
        if (col.mapped_to !== 'ignore') {
          mapping[col.mapped_to] = col.source_column;
        }
      }

      // Get full data
      let allData: Record<string, any>[];
      if (parsedData) {
        allData = parsedData.rows;
      } else {
        // For raw text that wasn't parsed, use AI sample rows as data
        allData = aiResult.sample_rows;
      }

      setImportProgress(30);

      const { data, error: fnError } = await supabase.functions.invoke('ai-import-catalog', {
        body: {
          mode: 'import',
          supplierId,
          mapping,
          data: allData,
          filename: file?.name || 'collé',
          format: format,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

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
    setRawContent('');
    setParsedData(null);
    setAiResult(null);
    setImportProgress(0);
    setImportResult(null);
    setError(null);
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'text-green-600';
    if (c >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const confidenceBadge = (c: number) => {
    if (c >= 0.8) return 'default' as const;
    if (c >= 0.5) return 'secondary' as const;
    return 'destructive' as const;
  };

  return (
    <div className="space-y-6">
      {/* Header avec étapes */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Badge variant={step === 'upload' ? 'default' : 'secondary'}>1. Upload</Badge>
        <ArrowRight className="h-4 w-4" />
        <Badge variant={step === 'analyzing' ? 'default' : 'secondary'}>
          <Brain className="h-3 w-3 mr-1" />2. Analyse IA
        </Badge>
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
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Import intelligent de catalogue fournisseur
            </CardTitle>
            <CardDescription>
              L'IA analyse automatiquement votre fichier et détecte les colonnes. Uploadez un fichier ou collez du texte brut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'file' | 'text')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Fichier
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" /> Texte brut
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
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
                        <FileText className="h-4 w-4" /> CSV
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="xml" id="xml" />
                      <Label htmlFor="xml" className="flex items-center gap-2 cursor-pointer">
                        <FileCode className="h-4 w-4" /> XML
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                        <FileJson className="h-4 w-4" /> JSON
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <Input
                    type="file"
                    accept={acceptTypes[format]}
                    onChange={handleFileSelect}
                    className="max-w-xs mx-auto"
                  />
                  {file && (
                    <p className="text-sm text-primary mt-2 font-medium">{file.name}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Collez le contenu du catalogue fournisseur</Label>
                  <Textarea
                    placeholder={"Référence;Désignation;Prix HT;EAN\nSTY001;Stylo bille bleu;0,85;3270220078456\nCAH001;Cahier 96p A4;1,25;3210330012345\n..."}
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepte CSV, tableaux copiés depuis Excel/PDF, ou tout format texte. L'IA s'adapte automatiquement.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleAnalyze}
              disabled={(inputMode === 'file' && !file) || (inputMode === 'text' && !rawContent.trim())}
              className="w-full"
              size="lg"
            >
              <Brain className="h-4 w-4 mr-2" />
              Analyser avec l'IA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Étape 2: Analyse IA en cours */}
      {step === 'analyzing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Analyse IA en cours...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={50} className="animate-pulse" />
            <p className="text-sm text-muted-foreground text-center">
              L'IA analyse la structure de votre fichier et détecte les colonnes...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Étape 3: Mapping (pré-rempli par l'IA) */}
      {step === 'mapping' && aiResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Mapping détecté par l'IA
            </CardTitle>
            <CardDescription>
              Confiance globale : <span className={confidenceColor(aiResult.confidence)}>
                {Math.round(aiResult.confidence * 100)}%
              </span>
              {' — '}Vérifiez et ajustez si besoin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mapping table */}
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colonne source</TableHead>
                    <TableHead>Rôle détecté</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>Exemples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiResult.detected_columns.map((col) => (
                    <TableRow key={col.source_column}>
                      <TableCell className="font-mono text-sm">{col.source_column}</TableCell>
                      <TableCell>
                        <Select
                          value={col.mapped_to}
                          onValueChange={(v) => handleMappingChange(col.source_column, v)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MAPPING_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {MAPPED_TO_LABELS[opt] || opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={confidenceBadge(col.confidence)}>
                          {Math.round(col.confidence * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {col.sample_values.slice(0, 3).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Preview of normalized rows */}
            {aiResult.sample_rows.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Aperçu des données normalisées</Label>
                <div className="border rounded-lg overflow-auto max-h-48">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(aiResult.sample_rows[0]).map((key) => (
                          <TableHead key={key} className="whitespace-nowrap text-xs">
                            {MAPPED_TO_LABELS[key] || key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiResult.sample_rows.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((val, i) => (
                            <TableCell key={i} className="text-xs whitespace-nowrap">
                              {val != null ? String(val).substring(0, 40) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!isMappingValid() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Les champs <strong>Référence fournisseur</strong> et <strong>Prix HT</strong> sont obligatoires.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetImport}>Annuler</Button>
              <Button onClick={handleImport} disabled={!isMappingValid()}>
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
