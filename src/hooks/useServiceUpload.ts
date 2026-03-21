import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ServiceType = 'photo' | 'reprography';

export interface UploadedFile {
  id: string;
  file: File;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  preview: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  /** Image dimensions (only for image files) */
  dimensions?: { width: number; height: number };
}

const BUCKET_MAP: Record<ServiceType, string> = {
  photo: 'photo-prints',
  reprography: 'print-documents',
};

const ACCEPTED_TYPES: Record<ServiceType, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
  reprography: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILES = 20;

let uploadCounter = 0;

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read image dimensions'));
    };
    img.src = url;
  });
}

export function useServiceUpload(serviceType: ServiceType) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const bucket = BUCKET_MAP[serviceType];
  const accepted = ACCEPTED_TYPES[serviceType];

  const validateFile = useCallback((file: File): string | null => {
    if (!accepted.includes(file.type)) {
      return `Type de fichier non accepté: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)`;
    }
    return null;
  }, [accepted]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    const fileArray = Array.from(fileList);

    for (const file of fileArray) {
      if (files.length + newFiles.length >= MAX_FILES) break;

      const error = validateFile(file);
      if (error) continue;

      const preview = isImageType(file.type) ? URL.createObjectURL(file) : null;
      let dimensions: { width: number; height: number } | undefined;

      if (isImageType(file.type)) {
        try {
          dimensions = await getImageDimensions(file);
        } catch {
          // Dimensions unavailable
        }
      }

      newFiles.push({
        id: `upload-${++uploadCounter}`,
        file,
        filePath: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        preview,
        progress: 0,
        status: 'pending',
        dimensions,
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [files.length, validateFile]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<UploadedFile[]> => {
    if (!user) throw new Error('Vous devez être connecté');
    setUploading(true);

    const results: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.status === 'done') {
        results.push(f);
        continue;
      }

      setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'uploading' as const, progress: 0 } : p));

      try {
        const timestamp = Date.now();
        const safeName = f.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${user.id}/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, f.file, { contentType: f.file.type });

        if (uploadError) throw uploadError;

        const updated: UploadedFile = { ...f, filePath, status: 'done', progress: 100 };
        results.push(updated);
        setFiles(prev => prev.map(p => p.id === f.id ? updated : p));
      } catch (err) {
        const errMsg = (err instanceof Error ? err.message : String(err)) || 'Erreur d\'upload';
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'error' as const, error: errMsg } : p));
        results.push({ ...f, status: 'error', error: errMsg });
      }
    }

    setUploading(false);
    return results;
  }, [files, user, bucket]);

  const clearFiles = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
  }, [files]);

  return {
    files,
    addFiles,
    removeFile,
    uploadAll,
    clearFiles,
    uploading,
    acceptedTypes: accepted,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
  };
}
