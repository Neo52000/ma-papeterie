import * as tus from 'tus-js-client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Gzip-compress a File/Blob using the browser's native CompressionStream API.
 * JSON compresses ~10:1, so a 90 MB file becomes ~9 MB.
 */
export async function compressJsonFile(file: File): Promise<Blob> {
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Blob(chunks, { type: 'application/gzip' });
}

/**
 * Upload a file to Supabase Storage via TUS protocol (chunked — supports files > 500 MB).
 */
export function tusUpload(
  blob: File | Blob,
  storagePath: string,
  onProgress: (pct: number) => void,
  authToken: string,
  isGzipped = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${authToken}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'liderpapel-enrichment',
        objectName: storagePath,
        contentType: isGzipped ? 'application/gzip' : 'application/json',
        cacheControl: '3600',
      },
      // 5 MB — must be a multiple of 256 KB (Supabase requirement)
      chunkSize: 5 * 1024 * 1024,
      onError: (err) => reject(new Error(String(err))),
      onProgress: (uploaded, total) => {
        if (total > 0) onProgress(Math.round((uploaded / total) * 100));
      },
      onSuccess: () => resolve(),
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}
