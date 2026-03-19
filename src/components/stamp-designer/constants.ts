export const INK_COLORS: Record<string, string> = {
  noir: '#1a1a1a',
  bleu: '#1e40af',
  rouge: '#dc2626',
  vert: '#16a34a',
  violet: '#7c3aed',
};

export const CASE_COLORS: Record<string, string> = {
  noir: '#1a1a1a',
  bleu: '#2563eb',
  rouge: '#ef4444',
  gris: '#6b7280',
  blanc: '#f9fafb',
};

export const INK_COLOR_LABELS: Record<string, string> = {
  noir: 'Noir',
  bleu: 'Bleu',
  rouge: 'Rouge',
  vert: 'Vert',
  violet: 'Violet',
};

export const CASE_COLOR_LABELS: Record<string, string> = {
  noir: 'Noir',
  bleu: 'Bleu',
  rouge: 'Rouge',
  gris: 'Gris',
  blanc: 'Blanc',
};

export const STAMP_FONTS = [
  { family: 'Arial', label: 'Arial' },
  { family: 'Times New Roman', label: 'Times New Roman' },
  { family: 'Courier New', label: 'Courier New' },
  { family: 'Georgia', label: 'Georgia' },
  { family: 'Verdana', label: 'Verdana' },
  { family: 'Roboto', label: 'Roboto' },
  { family: 'Open Sans', label: 'Open Sans' },
  { family: 'Montserrat', label: 'Montserrat' },
  { family: 'Lato', label: 'Lato' },
  { family: 'Playfair Display', label: 'Playfair Display' },
  { family: 'Merriweather', label: 'Merriweather' },
  { family: 'Oswald', label: 'Oswald' },
] as const;

export const DEFAULT_FONT = 'Arial';
export const DEFAULT_FONT_SIZE = 14;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 28;

export const MM_TO_PX = 4; // 1mm = 4px for canvas rendering

export const STAMP_TYPE_LABELS: Record<string, string> = {
  'auto-encreur': 'Auto-encreur',
  'bois': 'Bois',
  'dateur': 'Dateur',
  'cachet-rond': 'Cachet rond',
  'numeroteur': 'Numéroteur',
};

export const BRAND_LABELS: Record<string, string> = {
  'Trodat': 'Trodat',
  'Colop': 'Colop',
  'Générique': 'Générique',
};

export const CLIPART_LIBRARY = [
  { name: 'Étoile', svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { name: 'Coche', svgPath: 'M20 6L9 17l-5-5' },
  { name: 'Téléphone', svgPath: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' },
  { name: 'Email', svgPath: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5v2l8 5 8-5V6z' },
  { name: 'Localisation', svgPath: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7a3 3 0 100 6 3 3 0 000-6z' },
  { name: 'Globe', svgPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 016.32 12.9A14.19 14.19 0 0012 18.5a14.19 14.19 0 00-6.32-1.6A8 8 0 0112 4z' },
  { name: 'Cadre simple', svgPath: 'M3 3h18v18H3z' },
  { name: 'Cercle', svgPath: 'M12 2a10 10 0 100 20 10 10 0 000-20z' },
] as const;
