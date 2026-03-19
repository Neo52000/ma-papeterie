export interface StampModel {
  id: string;
  name: string;
  brand: string;
  type: 'auto-encreur' | 'bois' | 'dateur' | 'cachet-rond' | 'numeroteur';
  slug: string;
  width_mm: number;
  height_mm: number;
  max_lines: number;
  supports_logo: boolean;
  base_price_ht: number;
  base_price_ttc: number;
  tva_rate: number;
  image_url: string | null;
  available_ink_colors: string[];
  available_case_colors: string[];
  is_active: boolean;
  stock_quantity: number;
  display_order: number;
  description: string | null;
}

export interface StampLine {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface StampLogo {
  file: File | null;
  dataUrl: string | null;
  storageKey: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StampShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'frame';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface StampClipart {
  id: string;
  name: string;
  svgPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StampDesignData {
  lines: StampLine[];
  logo: Omit<StampLogo, 'file' | 'dataUrl'> | null;
  shapes: StampShape[];
  cliparts: StampClipart[];
  inkColor: string;
  caseColor: string;
}
