import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, XCircle, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportResult {
  success: Array<{ product: string; id: string }>;
  errors: Array<{ row: string; error: string }>;
}

const TEMPLATE_COLUMNS = [
  { name: 'nom', required: true, description: 'Nom du produit', example: 'Stylo bille BIC Cristal bleu' },
  { name: 'description', required: false, description: 'Description du produit', example: 'Stylo bille pointe moyenne 1.0mm' },
  { name: 'categorie', required: true, description: 'Scolaire, Bureau, Eco ou Vintage', example: 'Scolaire' },
  { name: 'prix_ttc', required: true, description: 'Prix TTC en euros', example: '1.50' },
  { name: 'prix_ht', required: false, description: 'Prix HT en euros', example: '1.25' },
  { name: 'tva_rate', required: false, description: 'Taux de TVA (%)', example: '20' },
  { name: 'ean', required: false, description: 'Code-barres EAN13', example: '3086126600116' },
  { name: 'stock_quantity', required: false, description: 'Quantité en stock', example: '100' },
  { name: 'brand', required: false, description: 'Marque', example: 'BIC' },
  { name: 'sku_interne', required: false, description: 'Référence interne', example: 'BIC-CRIST-BL' },
  { name: 'image_url', required: false, description: 'URL de l\'image produit', example: '' },
  { name: 'eco', required: false, description: 'Produit éco-responsable (oui/non)', example: 'non' },
  { name: 'weight_kg', required: false, description: 'Poids en kg', example: '0.01' },
  { name: 'dimensions_cm', required: false, description: 'Dimensions (LxlxH cm)', example: '15x1x1' },
] as const;

function downloadCsvTemplate() {
  const header = TEMPLATE_COLUMNS.map(c => c.name).join(',');
  const exampleRow = TEMPLATE_COLUMNS.map(c => {
    const val = c.example;
    return val.includes(',') ? `"${val}"` : val;
  }).join(',');
  const csv = `${header}\n${exampleRow}\n`;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele_import_produits.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXlsTemplate() {
  // Generate a simple XML-based XLS (Excel 2003 XML Spreadsheet)
  const headerCells = TEMPLATE_COLUMNS.map(c =>
    `<Cell${c.required ? ' ss:StyleID="req"' : ''}><Data ss:Type="String">${c.name}${c.required ? ' *' : ''}</Data></Cell>`
  ).join('');
  const exampleCells = TEMPLATE_COLUMNS.map(c =>
    `<Cell><Data ss:Type="String">${c.example}</Data></Cell>`
  ).join('');
  const descCells = TEMPLATE_COLUMNS.map(c =>
    `<Cell ss:StyleID="desc"><Data ss:Type="String">${c.description}${c.required ? ' (obligatoire)' : ''}</Data></Cell>`
  ).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <ss:Style ss:ID="Default"/>
  <ss:Style ss:ID="req">
   <ss:Font ss:Bold="1"/>
   <ss:Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
  </ss:Style>
  <ss:Style ss:ID="desc">
   <ss:Font ss:Italic="1" ss:Color="#6B7280"/>
  </ss:Style>
 </Styles>
 <Worksheet ss:Name="Produits">
  <Table>
   <Row>${headerCells}</Row>
   <Row>${descCells}</Row>
   <Row>${exampleCells}</Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele_import_produits.xls';
  a.click();
  URL.revokeObjectURL(url);
}

export const ProductCsvImport = ({ onComplete }: { onComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const MAX_FILE_SIZE_MB = 10;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Veuillez sélectionner un fichier CSV valide');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier ne doit pas dépasser ${MAX_FILE_SIZE_MB} Mo`);
      return;
    }

    setFile(selectedFile);
    setResult(null);
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
    } catch (_error) {
      toast.error('Erreur lors de l\'import du fichier');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import CSV de Produits
        </CardTitle>
        <CardDescription>
          Téléchargez le modèle ci-dessous, remplissez-le, puis importez votre fichier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template download buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Modèle CSV
          </Button>
          <Button variant="outline" size="sm" onClick={downloadXlsTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Modèle XLS
          </Button>
        </div>

        {/* Column legend */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-xs font-medium mb-2 text-muted-foreground">Colonnes du fichier :</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_COLUMNS.map(col => (
              <Badge
                key={col.name}
                variant={col.required ? 'default' : 'secondary'}
                className="text-xs"
                title={col.description}
              >
                {col.name}{col.required ? ' *' : ''}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">*</span> = obligatoire. Survolez une colonne pour voir sa description.
          </p>
        </div>

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
