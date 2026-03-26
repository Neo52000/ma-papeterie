/**
 * Fallback navigation data used when Supabase query fails or returns empty.
 * Mirrors the data seeded in the navigation_menus migration.
 */

export interface DefaultMenuItem {
  label: string;
  url: string;
  icon?: string;
  css_class?: string;
  children?: DefaultMenuItem[];
}

export const DEFAULT_HEADER_NAV: DefaultMenuItem[] = [
  { label: "Catalogue", url: "/catalogue" },
  { label: "Consommables", url: "/consommables" },
  { label: "Emballage", url: "/solutions-emballage" },
  { label: "Maroquinerie", url: "/maroquinerie-bagagerie-accessoires" },
  { label: "Listes Scolaires", url: "/listes-scolaires" },
  { label: "Promotions", url: "/promotions" },
  { label: "Blog", url: "/blog" },
  { label: "Contact", url: "/contact" },
];

export const DEFAULT_HEADER_SERVICES: DefaultMenuItem[] = [
  { label: "Tous nos services", url: "/services", css_class: "font-medium" },
  { label: "Envoyer un document", url: "/photocopie-express-chaumont#envoyer-document" },
  { label: "Photos Express", url: "/photos-express-chaumont" },
  { label: "Impression Urgente", url: "/impression-urgente-chaumont" },
  { label: "Photocopie Express", url: "/photocopie-express-chaumont" },
  { label: "Plaque d'Immatriculation", url: "/plaque-immatriculation-chaumont" },
  { label: "Tampon Professionnel", url: "/tampon-professionnel-chaumont" },
];

export const DEFAULT_HEADER_PRO: DefaultMenuItem[] = [
  { label: "Inscription Pro", url: "/inscription-pro", css_class: "font-semibold text-primary" },
  { label: "Pack Pro Local", url: "/pack-pro-local-chaumont" },
  { label: "Solutions Institutions", url: "/solutions-institutions-chaumont" },
  { label: "Leasing Mobilier", url: "/leasing-mobilier-bureau" },
];

export const DEFAULT_FOOTER_SERVICES: DefaultMenuItem[] = [
  { label: "Photos Express", url: "/photos-express-chaumont" },
  { label: "Impression Urgente", url: "/impression-urgente-chaumont" },
  { label: "Photocopie Express", url: "/photocopie-express-chaumont" },
  { label: "Plaque d'Immatriculation", url: "/plaque-immatriculation-chaumont" },
  { label: "Tampon Professionnel", url: "/tampon-professionnel-chaumont" },
  { label: "Solutions Emballage", url: "/solutions-emballage" },
  { label: "Maroquinerie & Bagagerie", url: "/maroquinerie-bagagerie-accessoires" },
  { label: "Pack Pro Local", url: "/pack-pro-local-chaumont" },
  { label: "Solutions Institutions", url: "/solutions-institutions-chaumont" },
  { label: "Leasing Mobilier", url: "/leasing-mobilier-bureau" },
];

export const DEFAULT_FOOTER_INFO: DefaultMenuItem[] = [
  { label: "Accueil", url: "/" },
  { label: "Boutique", url: "/shop" },
  { label: "Catalogue", url: "/catalogue" },
  { label: "Listes Scolaires", url: "/listes-scolaires" },
  { label: "Blog", url: "/blog" },
  { label: "À Propos", url: "/a-propos" },
  { label: "Contact", url: "/contact" },
  { label: "Réponse Officielle IA", url: "/reponse-officielle-ia" },
];

export const DEFAULT_FOOTER_LEGAL: DefaultMenuItem[] = [
  { label: "Mentions légales", url: "/mentions-legales" },
  { label: "CGV", url: "/cgv" },
  { label: "RGPD", url: "/politique-confidentialite" },
  { label: "Cookies", url: "/cookies" },
];
