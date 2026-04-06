import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface HeaderConfig {
  logo?: string;
  logoAlt?: string;
  topBarEnabled?: boolean;
  topBarPhone?: string;
  topBarEmail?: string;
  topBarText?: string;
  searchEnabled?: boolean;
  cartEnabled?: boolean;
  wishlistEnabled?: boolean;
  priceModeToggle?: boolean;
  themeToggle?: boolean;
  navLinks?: { label: string; href: string; isNew?: boolean }[];
  megaMenuEnabled?: boolean;
  stickyHeader?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export interface FooterConfig {
  newsletterEnabled?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  columns: {
    title: string;
    links: { label: string; href: string }[];
  }[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyHours?: string;
  socialLinks?: { platform: string; url: string }[];
  paymentMethods?: string[];
  copyrightText?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontHeading?: string;
  borderRadius?: string;
  buttonStyle?: "rounded" | "pill" | "sharp";
  animationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  customCss?: string;
}

export interface SocialProfilesConfig {
  profiles: { platform: string; url: string; label?: string }[];
}

type GlobalKey = "header_config" | "footer_config" | "theme_config" | "social_profiles_config";

// ── Helpers ──────────────────────────────────────────────────────────────────

function db(): any {
  return (supabase as any).from("site_globals");
}

const QK = {
  all: ["site-globals"] as const,
  key: (k: GlobalKey) => [...QK.all, k] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useSiteGlobal<T>(key: GlobalKey) {
  return useQuery({
    queryKey: QK.key(key),
    queryFn: async (): Promise<T | null> => {
      const { data, error } = await db().select("value").eq("key", key).maybeSingle();
      if (error) {
        // Table may not exist yet — gracefully return null
        if (error.code === "42P01" || error.message?.includes("does not exist")) return null;
        throw error;
      }
      return (data?.value as T) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSiteGlobal<T>(key: GlobalKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: T) => {
      // Upsert — insert or update on conflict
      const { error } = await db().upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) {
        const msg = error.message ?? error.details ?? JSON.stringify(error);
        throw new Error(msg);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.key(key) });
    },
  });
}

// ── Typed shortcuts ──────────────────────────────────────────────────────────

export function useHeaderConfig() {
  return useSiteGlobal<HeaderConfig>("header_config");
}

export function useUpdateHeaderConfig() {
  return useUpdateSiteGlobal<HeaderConfig>("header_config");
}

export function useFooterConfig() {
  return useSiteGlobal<FooterConfig>("footer_config");
}

export function useUpdateFooterConfig() {
  return useUpdateSiteGlobal<FooterConfig>("footer_config");
}

export function useThemeConfig() {
  return useSiteGlobal<ThemeConfig>("theme_config");
}

export function useUpdateThemeConfig() {
  return useUpdateSiteGlobal<ThemeConfig>("theme_config");
}

export function useSocialProfilesConfig() {
  return useSiteGlobal<SocialProfilesConfig>("social_profiles_config");
}

export function useUpdateSocialProfilesConfig() {
  return useUpdateSiteGlobal<SocialProfilesConfig>("social_profiles_config");
}

// ── Default configs ──────────────────────────────────────────────────────────

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  topBarEnabled: true,
  topBarPhone: "03 10 96 02 24",
  topBarEmail: "contact@ma-papeterie.fr",
  searchEnabled: true,
  cartEnabled: true,
  wishlistEnabled: true,
  priceModeToggle: true,
  themeToggle: true,
  megaMenuEnabled: true,
  stickyHeader: true,
  navLinks: [
    { label: "Catalogue", href: "/catalogue" },
    { label: "Services", href: "/services" },
    { label: "Promotions", href: "/promotions" },
    { label: "Professionnels", href: "/inscription-pro" },
  ],
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  newsletterEnabled: true,
  newsletterTitle: "Restez informé",
  newsletterDescription: "Recevez nos offres et nouveautés par email",
  columns: [
    {
      title: "Services",
      links: [
        { label: "Impression express", href: "/services" },
        { label: "Photocopies", href: "/services" },
        { label: "Photos d'identité", href: "/services" },
        { label: "Tampons personnalisés", href: "/services" },
      ],
    },
    {
      title: "Informations",
      links: [
        { label: "À propos", href: "/a-propos" },
        { label: "FAQ", href: "/faq" },
        { label: "Livraison", href: "/livraison" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Légal",
      links: [
        { label: "Mentions légales", href: "/mentions-legales" },
        { label: "CGV", href: "/cgv" },
        { label: "Politique de confidentialité", href: "/politique-confidentialite" },
        { label: "Cookies", href: "/cookies" },
      ],
    },
  ],
  companyName: "Ma Papeterie",
  companyAddress: "10 rue Toupot de Beveaux, 52000 Chaumont",
  companyPhone: "03 10 96 02 24",
  companyEmail: "contact@ma-papeterie.fr",
  companyHours: "Lun-Ven 9h-19h, Sam 9h-18h",
  socialLinks: [
    { platform: "facebook", url: "https://facebook.com/mapapeterie" },
    { platform: "instagram", url: "https://instagram.com/mapapeterie" },
  ],
  copyrightText: "Ma Papeterie — Tous droits réservés",
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: "215 85% 35%",
  secondaryColor: "45 95% 65%",
  accentColor: "215 85% 35%",
  fontFamily: "Poppins",
  fontHeading: "Poppins",
  borderRadius: "0.75rem",
  buttonStyle: "rounded",
  animationsEnabled: true,
  darkModeEnabled: true,
};
