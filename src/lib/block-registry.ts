import {
  Type, AlignLeft, List, HelpCircle, MousePointerClick,
  Image, LayoutGrid, Columns, PlayCircle, Star,
  MessageSquareQuote, CreditCard, TableProperties, Minus, Images, Sparkles, Megaphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockType, ContentBlock } from "@/hooks/useStaticPages";

export interface BlockRegistryEntry {
  type: BlockType;
  labelFr: string;
  icon: LucideIcon;
  category: "texte" | "media" | "layout" | "avance";
  defaultData: () => ContentBlock;
}

function uid() {
  return crypto.randomUUID();
}

export const BLOCK_REGISTRY: BlockRegistryEntry[] = [
  // Texte
  { type: "heading",       labelFr: "Titre",             icon: Type,               category: "texte",   defaultData: () => ({ id: uid(), type: "heading", level: 2, content: "" }) },
  { type: "paragraph",     labelFr: "Paragraphe",        icon: AlignLeft,          category: "texte",   defaultData: () => ({ id: uid(), type: "paragraph", content: "" }) },
  { type: "list",          labelFr: "Liste",             icon: List,               category: "texte",   defaultData: () => ({ id: uid(), type: "list", ordered: false, items: [""] }) },
  { type: "faq",           labelFr: "FAQ",               icon: HelpCircle,         category: "texte",   defaultData: () => ({ id: uid(), type: "faq", questions: [{ q: "", a: "" }] }) },
  // Media
  { type: "image",         labelFr: "Image",             icon: Image,              category: "media",   defaultData: () => ({ id: uid(), type: "image", url: "", alt: "" }) },
  { type: "gallery",       labelFr: "Galerie",           icon: Images,             category: "media",   defaultData: () => ({ id: uid(), type: "gallery", images: [], columns: 3 }) },
  { type: "video_embed",   labelFr: "Vidéo",             icon: PlayCircle,         category: "media",   defaultData: () => ({ id: uid(), type: "video_embed", url: "" }) },
  // Layout
  { type: "hero",          labelFr: "Hero / Carrousel",  icon: Sparkles,           category: "layout",  defaultData: () => ({ id: uid(), type: "hero", slides: [{ title: "" }] }) },
  { type: "columns",       labelFr: "Colonnes",          icon: Columns,            category: "layout",  defaultData: () => ({ id: uid(), type: "columns", layout: { widths: [50, 50], columns: [[], []] } }) },
  { type: "promo_ticker",  labelFr: "Texte défilant",    icon: Megaphone,          category: "layout",  defaultData: () => ({ id: uid(), type: "promo_ticker", items: [{ icon: "Truck", text: "Livraison gratuite dès 89€" }, { icon: "Gift", text: "Code BIENVENUE10 : -10% sur votre 1ère commande" }, { icon: "Phone", text: "SAV local à Chaumont — 03 10 96 02 24" }, { icon: "RotateCcw", text: "Retour gratuit sous 30 jours" }], speed: 30 }) },
  { type: "separator",     labelFr: "Séparateur",        icon: Minus,              category: "layout",  defaultData: () => ({ id: uid(), type: "separator", style: "line" }) },
  // Avancé
  { type: "cta",           labelFr: "Appel à l'action",  icon: MousePointerClick,  category: "avance",  defaultData: () => ({ id: uid(), type: "cta", title: "", description: "", link: "", button: "" }) },
  { type: "service_grid",  labelFr: "Grille services",   icon: LayoutGrid,         category: "avance",  defaultData: () => ({ id: uid(), type: "service_grid", columns: 3, displayMode: "icon", services: [] }) },
  { type: "image_text",    labelFr: "Image + Texte",     icon: Columns,            category: "avance",  defaultData: () => ({ id: uid(), type: "image_text", imagePosition: "left" }) },
  { type: "icon_features", labelFr: "Icônes avantages",  icon: Star,               category: "avance",  defaultData: () => ({ id: uid(), type: "icon_features", columns: 3, features: [] }) },
  { type: "testimonials",  labelFr: "Témoignages",       icon: MessageSquareQuote, category: "avance",  defaultData: () => ({ id: uid(), type: "testimonials", testimonials: [] }) },
  { type: "pricing_table", labelFr: "Tableau de prix",   icon: CreditCard,         category: "avance",  defaultData: () => ({ id: uid(), type: "pricing_table", plans: [] }) },
  { type: "pricing_detail", labelFr: "Grille tarifaire", icon: TableProperties,    category: "avance",  defaultData: () => ({ id: uid(), type: "pricing_detail", tables: [] }) },
];

export const BLOCK_CATEGORIES = [
  { key: "texte", label: "Texte" },
  { key: "media", label: "Média" },
  { key: "layout", label: "Mise en page" },
  { key: "avance", label: "Avancé" },
] as const;

export function getBlockEntry(type: BlockType): BlockRegistryEntry | undefined {
  return BLOCK_REGISTRY.find((e) => e.type === type);
}
