import type { PhotoFormat } from '@/components/photos/photoPricing';

/** Minimum pixels required for 300 DPI at each format size (width x height) */
const FORMAT_MIN_PIXELS: Record<PhotoFormat, { width: number; height: number }> = {
  '10x15': { width: 1181, height: 1772 },
  '13x18': { width: 1535, height: 2126 },
  '15x20': { width: 1772, height: 2362 },
  '20x30': { width: 2362, height: 3543 },
  '30x45': { width: 3543, height: 5315 },
  '40x60': { width: 4724, height: 7087 },
  '50x75': { width: 5906, height: 8858 },
  '60x90': { width: 7087, height: 10630 },
};

export interface ResolutionCheckResult {
  ok: boolean;
  imageWidth: number;
  imageHeight: number;
  minWidth: number;
  minHeight: number;
}

export function checkResolution(
  imageWidth: number,
  imageHeight: number,
  format: PhotoFormat,
): ResolutionCheckResult {
  const min = FORMAT_MIN_PIXELS[format];
  // Allow either orientation (portrait or landscape)
  const fitsNormal = imageWidth >= min.width && imageHeight >= min.height;
  const fitsRotated = imageWidth >= min.height && imageHeight >= min.width;
  return {
    ok: fitsNormal || fitsRotated,
    imageWidth,
    imageHeight,
    minWidth: min.width,
    minHeight: min.height,
  };
}

/** Read image dimensions from a File object */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire les dimensions de l\'image'));
    };
    img.src = url;
  });
}
