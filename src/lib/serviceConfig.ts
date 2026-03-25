export const TVA_RATE = 0.20;

export type ServiceType = 'reprographie' | 'photo';

export interface ServiceFileConfig {
  accept: string;           // input accept attribute
  acceptedTypes: string[];  // MIME types
  maxFileSize: number;      // bytes
  maxFiles: number;
  fileLabel: string;        // e.g. "document" or "photo"
  fileLabelPlural: string;
}

export interface ServiceOptionChoice {
  value: string;
  label: string;
}

export interface ServiceConfig {
  type: ServiceType;
  title: string;
  subtitle: string;
  slug: string;             // URL slug after /services/
  file: ServiceFileConfig;
  stepLabels: readonly string[];
}

// ── Reprographie ──────────────────────────────────────────────────
export const REPRO_FORMATS: ServiceOptionChoice[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
];

export const REPRO_COLORS: ServiceOptionChoice[] = [
  { value: 'nb', label: 'Noir & blanc' },
  { value: 'couleur', label: 'Couleur' },
];

export const reproConfig: ServiceConfig = {
  type: 'reprographie',
  title: 'Reprographie',
  subtitle: 'Impression de documents professionnels',
  slug: 'reprographie',
  file: {
    accept: '.pdf,application/pdf',
    acceptedTypes: ['application/pdf'],
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    maxFiles: 1,
    fileLabel: 'document',
    fileLabelPlural: 'documents',
  },
  stepLabels: ['Fichier', 'Options', 'Livraison', 'Récapitulatif', 'Confirmation'],
};

// ── Développement photo ───────────────────────────────────────────
export const PHOTO_FORMATS: ServiceOptionChoice[] = [
  { value: '10x15', label: '10 x 15 cm' },
  { value: '13x18', label: '13 x 18 cm' },
  { value: '15x20', label: '15 x 20 cm' },
  { value: '20x30', label: '20 x 30 cm' },
  { value: '30x45', label: '30 x 45 cm' },
];

export const PHOTO_FINISHES: ServiceOptionChoice[] = [
  { value: 'brillant', label: 'Brillant' },
  { value: 'mat', label: 'Mat' },
];

export const photoConfig: ServiceConfig = {
  type: 'photo',
  title: 'Développement photo',
  subtitle: 'Tirage photo sur papier de qualité professionnelle',
  slug: 'developpement-photo',
  file: {
    accept: 'image/jpeg,image/png,image/webp',
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 20 * 1024 * 1024, // 20 MB
    maxFiles: 50,
    fileLabel: 'photo',
    fileLabelPlural: 'photos',
  },
  stepLabels: ['Photos', 'Options', 'Livraison', 'Récapitulatif', 'Confirmation'],
};

// ── Shipping ──────────────────────────────────────────────────────
export const SHIPPING_COST = 4.90;
export const FREE_SHIPPING_THRESHOLD = 89; // TTC

export function getShippingCost(totalTtc: number): number {
  return totalTtc >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

// ── Price helpers ─────────────────────────────────────────────────
export function htToTtc(priceHt: number): number {
  return Math.round(priceHt * (1 + TVA_RATE) * 100) / 100;
}

export function ttcToHt(priceTtc: number): number {
  return Math.round((priceTtc / (1 + TVA_RATE)) * 100) / 100;
}

export function calculateTva(priceHt: number): number {
  return Math.round(priceHt * TVA_RATE * 100) / 100;
}
