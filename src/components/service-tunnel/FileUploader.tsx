import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/hooks/useServiceUpload';

interface FileUploaderProps {
  files: UploadedFile[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  acceptedTypes: string[];
  maxFiles: number;
  maxFileSize: number;
  uploading: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function FileUploader({
  files,
  onAddFiles,
  onRemoveFile,
  acceptedTypes,
  maxFiles,
  maxFileSize,
  uploading,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onAddFiles(e.dataTransfer.files);
  }, [onAddFiles]);

  const acceptString = acceptedTypes.join(',');

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          files.length > 0 && 'border-primary/30',
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptString}
          multiple
          onChange={e => {
            if (e.target.files) onAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="space-y-3">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="font-medium">
            {files.length > 0
              ? `${files.length} fichier(s) — Cliquez pour en ajouter`
              : 'Déposer vos fichiers ici ou cliquez pour les sélectionner'}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} fichiers — {maxFileSize / (1024 * 1024)} Mo par fichier
          </p>
          {files.length === 0 && (
            <Button type="button" className="bg-green-700 hover:bg-green-800 text-white">
              Choisir mes fichiers
            </Button>
          )}
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map(f => (
            <div key={f.id} className="relative group rounded-lg overflow-hidden border bg-muted/30">
              {f.preview ? (
                <img
                  src={f.preview}
                  alt={f.fileName}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {!uploading && (
                <button
                  onClick={e => { e.stopPropagation(); onRemoveFile(f.id); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                {f.fileName} ({formatSize(f.fileSize)})
              </div>
              {f.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
              {f.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-500 text-xs font-medium px-2 text-center">{f.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{files.length} / {maxFiles} fichier(s)</span>
      </div>
    </div>
  );
}
