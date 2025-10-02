import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedItem {
  item_name: string;
  quantity: number;
  is_mandatory: boolean;
  description: string | null;
}

interface ListUploaderProps {
  schoolId: string;
  onItemsExtracted: (items: ExtractedItem[]) => void;
}

const ListUploader = ({ schoolId, onItemsExtracted }: ListUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (selectedFile.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 20MB",
        variant: "destructive"
      });
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Format non supporté",
        description: "Formats acceptés: PDF, Images (JPG, PNG), Texte, CSV, Excel",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      // Read file content
      const fileContent = await readFileContent(file);
      
      // Call edge function to process the list
      const { data, error } = await supabase.functions.invoke('process-school-list', {
        body: {
          fileContent,
          fileType: file.type
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.items || data.items.length === 0) {
        throw new Error("Aucun article n'a été extrait");
      }

      setExtractedItems(data.items);
      onItemsExtracted(data.items);
      
      toast({
        title: "Liste extraite avec succès",
        description: `${data.items.length} article(s) détecté(s)`,
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le fichier",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else if (result instanceof ArrayBuffer) {
          // Convert to base64 for images and PDFs
          const base64 = btoa(
            new Uint8Array(result).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          resolve(base64);
        } else {
          reject(new Error('Format de fichier non supporté'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      
      // For text files, read as text; for others as ArrayBuffer
      if (file.type.startsWith('text/') || file.type.includes('csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importer une liste scolaire
        </CardTitle>
        <CardDescription>
          Uploadez la liste fournie par l'école (PDF, image, Excel, texte)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">Sélectionner un fichier</Label>
          <div className="flex gap-2">
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.xlsx,.xls"
              disabled={processing}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Formats supportés: PDF, JPG, PNG, TXT, CSV, Excel • Max: 20MB
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium flex-1">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        <Button
          onClick={processFile}
          disabled={!file || processing}
          className="w-full"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Analyser la liste
            </>
          )}
        </Button>

        {extractedItems.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">
                {extractedItems.length} article(s) extrait(s)
              </span>
            </div>
            <div className="text-sm text-green-700 space-y-1 max-h-40 overflow-y-auto">
              {extractedItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.item_name}</span>
                  <span className="text-muted-foreground">×{item.quantity}</span>
                </div>
              ))}
              {extractedItems.length > 5 && (
                <p className="text-xs italic">
                  ... et {extractedItems.length - 5} autre(s)
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ListUploader;
