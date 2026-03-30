import {
  Type, AlignLeft, List, HelpCircle, MousePointerClick,
  Image, LayoutGrid, Columns, PlayCircle, Star,
  MessageSquareQuote, CreditCard, TableProperties, Minus, Images, Sparkles, Megaphone,
  ShieldCheck, TrendingUp, Building2, FileText, RectangleHorizontal,
  Mail, MapPin, Timer, PanelTop, ChevronsUpDown, ShoppingBag, FolderTree,
  Newspaper, BarChart3, Users, Grip, Tag, Code, MoveVertical, Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockType, ContentBlock } from "@/hooks/useStaticPages";

export interface BlockRegistryEntry {
  type: BlockType;
  labelFr: string;
  icon: LucideIcon;
  category: "texte" | "media" | "layout" | "avance" | "commerce" | "interactif";
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
  // Homepage
  { type: "trust_strip",    labelFr: "Barre de confiance", icon: ShieldCheck,         category: "layout",  defaultData: () => ({ id: uid(), type: "trust_strip", items: [{ icon: "Truck", title: "Livraison 24/48h", subtitle: "Gratuite dès 89€ HT", color: "bg-primary/8 text-primary" }, { icon: "ShieldCheck", title: "Paiement Sécurisé", subtitle: "CB, Virement, Mandat", color: "bg-emerald-500/8 text-emerald-600" }, { icon: "Headphones", title: "Service Client", subtitle: "03 10 96 02 24", color: "bg-[hsl(var(--cta))]/8 text-[hsl(var(--cta))]" }, { icon: "Leaf", title: "Éco-responsable", subtitle: "Large gamme recyclée", color: "bg-green-500/8 text-green-600" }] }) },
  { type: "promo_dual",     labelFr: "Double promo",       icon: RectangleHorizontal, category: "layout",  defaultData: () => ({ id: uid(), type: "promo_dual", cards: [{ label: "Destockage annuel", title: "Jusqu'à -60% sur le mobilier", buttonText: "Profiter des offres", buttonLink: "/catalogue?category=mobilier", bgColor: "#1e3a8a" }, { label: "Pack Rentrée Pro", title: "Équipez vos bureaux au meilleur prix", buttonText: "Voir le catalogue", buttonLink: "/catalogue", bgColor: "#fd761a" }] }) },
  { type: "best_sellers",   labelFr: "Meilleures ventes",  icon: TrendingUp,          category: "avance",  defaultData: () => ({ id: uid(), type: "best_sellers", title: "Les indispensables du moment", subtitle: "Les favoris de nos clients entreprises et particuliers.", maxProducts: 8, catalogueLink: "/catalogue" }) },
  { type: "b2b_section",    labelFr: "Section B2B",        icon: Building2,           category: "avance",  defaultData: () => ({ id: uid(), type: "b2b_section", label: "Professionnels", title: "Simplifiez vos achats,\nmultipliez vos avantages.", ctaText: "Créer mon compte Pro", ctaLink: "/inscription-pro", formTitle: "Devis gratuit en 1 heure" }) },
  { type: "seo_content",    labelFr: "Contenu SEO",        icon: FileText,            category: "texte",   defaultData: () => ({ id: uid(), type: "seo_content", title: "Ma Papeterie : Expert conseil en fournitures", html: "" }) },
  // Interactif
  { type: "contact_form",   labelFr: "Formulaire contact",  icon: Mail,                category: "interactif", defaultData: () => ({ id: uid(), type: "contact_form", title: "Contactez-nous", fields: [{ type: "text", label: "Nom", required: true }, { type: "email", label: "Email", required: true }, { type: "textarea", label: "Message", required: true }], submitText: "Envoyer" }) },
  { type: "countdown",      labelFr: "Compte à rebours",    icon: Timer,               category: "interactif", defaultData: () => ({ id: uid(), type: "countdown", targetDate: new Date(Date.now() + 7 * 86400000).toISOString(), title: "Offre spéciale", style: "cards" }) },
  { type: "tabs_block",     labelFr: "Onglets",             icon: PanelTop,            category: "interactif", defaultData: () => ({ id: uid(), type: "tabs_block", tabs: [{ title: "Onglet 1", content: "" }, { title: "Onglet 2", content: "" }] }) },
  { type: "accordion",      labelFr: "Accordéon",           icon: ChevronsUpDown,      category: "interactif", defaultData: () => ({ id: uid(), type: "accordion", items: [{ title: "Section 1", content: "" }], allowMultiple: false }) },
  { type: "newsletter",     labelFr: "Newsletter",          icon: Newspaper,           category: "interactif", defaultData: () => ({ id: uid(), type: "newsletter", title: "Restez informé", description: "Inscrivez-vous à notre newsletter", buttonText: "S'inscrire" }) },
  // Commerce
  { type: "product_grid",   labelFr: "Grille produits",     icon: ShoppingBag,         category: "commerce",   defaultData: () => ({ id: uid(), type: "product_grid", title: "Nos produits", maxProducts: 8, columns: 4 }) },
  { type: "category_grid",  labelFr: "Grille catégories",   icon: FolderTree,          category: "commerce",   defaultData: () => ({ id: uid(), type: "category_grid", title: "Nos catégories", categories: [], columns: 4 }) },
  { type: "stats_counter",  labelFr: "Compteurs animés",    icon: BarChart3,           category: "avance",     defaultData: () => ({ id: uid(), type: "stats_counter", stats: [{ value: 40000, suffix: "+", label: "Références" }, { value: 30, suffix: " ans", label: "D'expérience" }, { value: 5000, suffix: "+", label: "Clients" }], columns: 3 }) },
  { type: "team_grid",      labelFr: "Équipe",              icon: Users,               category: "avance",     defaultData: () => ({ id: uid(), type: "team_grid", title: "Notre équipe", members: [], columns: 3 }) },
  { type: "logo_carousel",  labelFr: "Carrousel logos",     icon: Grip,                category: "media",      defaultData: () => ({ id: uid(), type: "logo_carousel", title: "Nos partenaires", logos: [], speed: 30 }) },
  { type: "promo_banner",   labelFr: "Bannière promo",      icon: Tag,                 category: "layout",     defaultData: () => ({ id: uid(), type: "promo_banner", title: "Offre spéciale", bgColor: "#1e3a8a", textColor: "#ffffff" }) },
  { type: "map_embed",      labelFr: "Carte / Map",         icon: MapPin,              category: "media",      defaultData: () => ({ id: uid(), type: "map_embed", address: "10 rue Toupot de Beveaux, 52000 Chaumont", zoom: 15, height: 400 }) },
  { type: "html_custom",    labelFr: "Code HTML",           icon: Code,                category: "avance",     defaultData: () => ({ id: uid(), type: "html_custom", html: "", css: "" }) },
  { type: "spacer",         labelFr: "Espaceur",            icon: MoveVertical,        category: "layout",     defaultData: () => ({ id: uid(), type: "spacer", height: 48, unit: "px" }) },
  { type: "social_links",   labelFr: "Réseaux sociaux",     icon: Share2,              category: "media",      defaultData: () => ({ id: uid(), type: "social_links", links: [{ platform: "facebook", url: "" }, { platform: "instagram", url: "" }], style: "colored", alignment: "center" }) },
];

export const BLOCK_CATEGORIES = [
  { key: "texte", label: "Texte" },
  { key: "media", label: "Média" },
  { key: "layout", label: "Mise en page" },
  { key: "avance", label: "Avancé" },
  { key: "commerce", label: "Commerce" },
  { key: "interactif", label: "Interactif" },
] as const;

export function getBlockEntry(type: BlockType): BlockRegistryEntry | undefined {
  return BLOCK_REGISTRY.find((e) => e.type === type);
}
