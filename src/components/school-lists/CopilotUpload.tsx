import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, Camera, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopilotUploadProps {
  onUpload: (file: File, schoolName?: string, classLevel?: string) => Promise<any>;
  uploading: boolean;
}

const CopilotUpload = ({ onUpload, uploading }: CopilotUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  const handleFile = useCallback((f: File) => {
    if (f.size > 20 * 1024 * 1024) {
      return; // too large
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    await onUpload(file, schoolName || undefined, classLevel || undefined);
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith('image/')) return <Camera className="w-5 h-5 text-primary" />;
    if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Importer votre liste scolaire
        </CardTitle>
        <CardDescription>
          Glissez-déposez ou sélectionnez la liste fournie par l'école (PDF, photo, Excel, texte)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            file && "border-primary/50 bg-primary/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              {getFileIcon()}
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Glissez votre fichier ici</p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG, TXT, CSV, Excel — Max 20 MB
              </p>
            </div>
          )}
        </div>

        {/* Optional info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="school-name" className="text-xs">École (optionnel)</Label>
            <Input
              id="school-name"
              placeholder="Nom de l'école"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="class-level" className="text-xs">Classe (optionnel)</Label>
            <Input
              id="class-level"
              placeholder="Ex: CP, CE1, 6ème..."
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Analyser la liste
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CopilotUpload;
