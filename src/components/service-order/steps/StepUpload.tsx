import { useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, FileText, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceConfig } from '@/lib/serviceConfig';

export interface UploadedFile {
  id: string;
  file: File;
  preview: string; // object URL for images, '' for PDFs
}

let fileIdCounter = 0;

interface StepUploadProps {
  config: ServiceConfig;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onNext: () => void;
}

export default function StepUpload({ config, files, onFilesChange, onNext }: StepUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { file: fc } = config;
  const isPhoto = config.type === 'photo';

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: UploadedFile[] = [];
      for (const f of Array.from(fileList)) {
        if (files.length + newFiles.length >= fc.maxFiles) break;
        if (!fc.acceptedTypes.includes(f.type)) continue;
        if (f.size > fc.maxFileSize) continue;

        newFiles.push({
          id: `file-${++fileIdCounter}`,
          file: f,
          preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
        });
      }
      if (newFiles.length > 0) {
        // For single-file services (repro), replace the file
        if (fc.maxFiles === 1) {
          files.forEach(old => { if (old.preview) URL.revokeObjectURL(old.preview); });
          onFilesChange(newFiles);
        } else {
          onFilesChange([...files, ...newFiles]);
        }
      }
    },
    [files, fc, onFilesChange],
  );

  const removeFile = useCallback(
    (id: string) => {
      const item = files.find(f => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      onFilesChange(files.filter(f => f.id !== id));
    },
    [files, onFilesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const singleFile = files[0];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground">
          {isPhoto ? (
            <>Formats acceptés : <strong>JPG, PNG, WebP</strong> — Max {fc.maxFileSize / 1024 / 1024} Mo par photo — Jusqu'à {fc.maxFiles} photos</>
          ) : (
            <>Documents acceptés : <strong>PDF</strong> — Max {fc.maxFileSize / 1024 / 1024} Mo</>
          )}
        </p>
      </div>

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
          accept={fc.accept}
          multiple={fc.maxFiles > 1}
          onChange={e => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Single file (repro) with file selected */}
        {!isPhoto && singleFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-red-500" />
            <div className="text-left">
              <p className="font-medium">{singleFile.file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(singleFile.file.size / 1024 / 1024).toFixed(2)} Mo
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isPhoto ? (
              <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
            ) : (
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            )}
            <p className="font-medium">
              {files.length > 0
                ? `${files.length} ${fc.fileLabelPlural} sélectionnée(s) — Cliquez pour en ajouter`
                : isPhoto
                  ? 'Déposer vos photos ici ou cliquez pour les sélectionner'
                  : 'Déposer votre fichier ici ou cliquez pour le sélectionner'
              }
            </p>
            {files.length === 0 && (
              <>
                <div className="flex items-center gap-4 justify-center text-muted-foreground text-sm">
                  <span className="h-px w-12 bg-muted-foreground/30" />
                  ou
                  <span className="h-px w-12 bg-muted-foreground/30" />
                </div>
                <Button type="button" className="bg-green-700 hover:bg-green-800 text-white">
                  {isPhoto ? 'Choisir mes photos' : 'Charger mon document'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Photo thumbnails grid */}
      {isPhoto && files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {files.map(item => (
            <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border">
              <img
                src={item.preview}
                alt={item.file.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={e => { e.stopPropagation(); removeFile(item.id); }}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                {item.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        {isPhoto ? (
          <span className="text-sm text-muted-foreground">
            {files.length} / {fc.maxFiles} {fc.fileLabelPlural}
          </span>
        ) : (
          <span />
        )}
        <Button onClick={onNext} disabled={files.length === 0} size="lg">
          Suivant
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
