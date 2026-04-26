// ── Types produit ─────────────────────────────────────────────────────────────

export interface EanLookupResult {
  marque?: string;
  reference_fabricant?: string;
  designation_courte?: string;
  caracteristiques?: string;
  prix_ttc_constate?: number | null;
  titre_ecommerce?: string;
  points_forts?: string[];
  description?: string;
  erreur?: string;
  source?: 'local' | 'chatgpt';
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_ht?: number;
  price_ttc?: number;
  tva_rate?: number;
  eco_tax?: number;
  eco_contribution?: number;
  ean?: string;
  manufacturer_code?: string;
  sku_interne?: string;
  attributs?: Record<string, unknown>;
  image_url: string | null;
  category: string;
  subcategory?: string;
  family?: string;
  subfamily?: string;
  badge: string | null;
  eco: boolean;
  stock_quantity: number;
  min_stock_alert?: number;
  reorder_quantity?: number;
  margin_percent?: number;
  weight_kg?: number;
  dimensions_cm?: string;
  is_featured: boolean;
  is_active?: boolean;
  brand?: string;
  color?: string;
  name_short?: string;
  country_origin?: string;
  is_end_of_life?: boolean;
  is_special_order?: boolean;
  cost_price?: number | null;
  public_price_ttc?: number | null;
  public_price_source?: string | null;
  public_price_updated_at?: string | null;
}

// ── Utilitaires SEO & normalisation ──────────────────────────────────────────

/** Convertit un nom en ALL CAPS → Title Case français avec espaces intelligents */
export function toTitleCase(str: string): string {
  if (!str) return str;

  // 1. Normaliser les séparateurs et les espaces multiples
  let s = str.replace(/[_\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  const upCount  = (s.match(/[A-Z]/g) || []).length;
  const letCount = (s.match(/[a-zA-Z]/g) || []).length;
  // Ne convertit que si le texte est majoritairement en majuscules
  if (letCount < 3 || upCount / letCount < 0.7) return s;

  // 2. Mettre en minuscules
  s = s.toLowerCase();

  // 3. Ajouter un espace entre 3+ lettres et un chiffre : "stylo300" → "stylo 300"
  //    Préserve les codes courts comme "A4", "B5", "3M"
  s = s.replace(/([a-zà-ÿ]{3,})(\d)/g, '$1 $2');

  // 4. Ajouter un espace entre 2+ chiffres et 2+ lettres : "500feuilles" → "500 feuilles"
  //    Préserve "3M", "A4", "80g" (unités courtes)
  s = s.replace(/(\d{2,})([a-zà-ÿ]{2,})/g, '$1 $2');

  // 5. Supprimer les doubles espaces éventuels
  s = s.replace(/\s{2,}/g, ' ').trim();

  // 6. Title Case avec mots de liaison français en minuscules
  const minor = new Set(['de','du','des','la','le','les','un','une','et','ou','en',
    'à','au','aux','par','sur','sous','pour','avec','sans','dans','l','d']);

  return s.split(' ').map((w, i) =>
    (!w || (i !== 0 && minor.has(w))) ? w : w[0].toUpperCase() + w.slice(1),
  ).join(' ').trim();
}

export function buildMetaTitle(name: string): string {
  return `${name} | Ma Papeterie Chaumont`.slice(0, 70);
}

export function buildMetaDesc(p: Partial<Product>): string {
  const price = p.price ? ` à ${p.price.toFixed(2)}€ TTC` : '';
  const base  = `${p.name || ''}${price} — Ma Papeterie Chaumont. Livraison rapide, expertise locale.`;
  const extra = p.description ? ` ${p.description}` : '';
  const full  = (base + extra).slice(0, 160);
  return full.length < (base + extra).length ? full.trimEnd() + '…' : full;
}
