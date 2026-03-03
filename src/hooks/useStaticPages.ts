import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Block Settings ───────────────────────────────────────────────────────────

export interface BlockSettings {
  backgroundColor?: string;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  customClass?: string;
  anchor?: string;
  visibility?: "all" | "desktop" | "mobile";
}

// ── Block Types ──────────────────────────────────────────────────────────────

export type BlockType =
  | "heading" | "paragraph" | "list" | "faq" | "cta"
  | "hero" | "service_grid" | "image_text" | "video_embed"
  | "icon_features" | "testimonials" | "pricing_table"
  | "separator" | "image" | "gallery" | "columns";

export interface BaseBlock {
  id: string;
  type: BlockType;
  settings?: BlockSettings;
}

// Original blocks (backward compatible)
export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level?: 2 | 3;
  content?: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content?: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  ordered?: boolean;
  items?: string[];
}

export interface FaqBlock extends BaseBlock {
  type: "faq";
  questions?: { q: string; a: string }[];
}

export interface CtaBlock extends BaseBlock {
  type: "cta";
  title?: string;
  description?: string;
  link?: string;
  button?: string;
}

// New blocks
export interface HeroBlock extends BaseBlock {
  type: "hero";
  slides: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonLink?: string;
  }[];
  autoplay?: boolean;
  interval?: number;
}

export interface ServiceGridBlock extends BaseBlock {
  type: "service_grid";
  columns?: 2 | 3 | 4;
  displayMode?: "icon" | "image-card";
  cardHeight?: "sm" | "md" | "lg";
  services: {
    icon: string;
    title: string;
    description: string;
    link?: string;
    features?: string[];
    imageUrl?: string;
  }[];
}

export interface ImageTextBlock extends BaseBlock {
  type: "image_text";
  imageUrl?: string;
  imageAlt?: string;
  imagePosition: "left" | "right";
  title?: string;
  text?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface VideoEmbedBlock extends BaseBlock {
  type: "video_embed";
  url: string;
  title?: string;
  caption?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1";
}

export interface IconFeaturesBlock extends BaseBlock {
  type: "icon_features";
  columns?: 2 | 3 | 4;
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export interface TestimonialsBlock extends BaseBlock {
  type: "testimonials";
  testimonials: {
    name: string;
    role?: string;
    quote: string;
    avatarUrl?: string;
    rating?: number;
  }[];
}

export interface PricingTableBlock extends BaseBlock {
  type: "pricing_table";
  plans: {
    name: string;
    price: string;
    period?: string;
    features: string[];
    highlighted?: boolean;
    buttonText?: string;
    buttonLink?: string;
  }[];
}

export interface SeparatorBlock extends BaseBlock {
  type: "separator";
  style?: "line" | "dots" | "space";
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url?: string;
  alt?: string;
  caption?: string;
  width?: "sm" | "md" | "lg" | "full";
  link?: string;
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  images: { url: string; alt?: string; caption?: string }[];
  columns?: 2 | 3 | 4;
}

export interface ColumnsBlock extends BaseBlock {
  type: "columns";
  layout: {
    widths: number[];
    columns: ContentBlock[][];
  };
}

// Discriminated union
export type ContentBlock =
  | HeadingBlock | ParagraphBlock | ListBlock | FaqBlock | CtaBlock
  | HeroBlock | ServiceGridBlock | ImageTextBlock | VideoEmbedBlock
  | IconFeaturesBlock | TestimonialsBlock | PricingTableBlock
  | SeparatorBlock | ImageBlock | GalleryBlock | ColumnsBlock;

// ── Migration helper ─────────────────────────────────────────────────────────

export function migrateBlocks(blocks: any[]): ContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => ({
    ...b,
    id: b.id ?? crypto.randomUUID(),
  }));
}

// ── Page types ───────────────────────────────────────────────────────────────

export type PageStatus = "draft" | "published" | "archived";
export type SchemaType = "WebPage" | "Service" | "FAQPage" | "Article" | "LocalBusiness" | "HowTo";
export type PageLayout = "article" | "full-width";

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  content: ContentBlock[];
  json_ld: Record<string, unknown> | null;
  schema_type: SchemaType;
  status: PageStatus;
  layout: PageLayout;
  published_at: string | null;
  ai_generated: boolean;
  seo_score: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratePageInput {
  slug: string;
  brief: string;
  keywords: string[];
  location?: string;
  schema_type?: SchemaType;
  tone?: "professional" | "friendly" | "informative";
}

export interface GeneratedPageContent {
  meta_title: string;
  meta_description: string;
  h1: string;
  content: ContentBlock[];
  json_ld: Record<string, unknown>;
  seo_score: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QK = {
  all: ["static-pages"] as const,
  lists: () => [...QK.all, "list"] as const,
  page: (slug: string) => [...QK.all, slug] as const,
};

function db() {
  return (supabase as any).from("static_pages");
}

/** Strip the `layout` field if the DB column doesn't exist yet (migration pending) */
function withoutLayout(input: Record<string, unknown>): Record<string, unknown> {
  const { layout, ...rest } = input;
  return rest;
}

function hydratePage(raw: any): StaticPage {
  return {
    ...raw,
    layout: raw.layout ?? "article",
    content: migrateBlocks(raw.content ?? []),
  };
}

// ── Hooks publics ──────────────────────────────────────────────────────────────

export function usePublicPage(slug: string | undefined) {
  return useQuery({
    queryKey: QK.page(slug ?? ""),
    enabled: !!slug,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StaticPage | null> => {
      const { data, error } = await db()
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data ? hydratePage(data) : null;
    },
  });
}

// ── Hooks admin ───────────────────────────────────────────────────────────────

export function useAdminPages() {
  return useQuery({
    queryKey: QK.lists(),
    staleTime: 60_000,
    queryFn: async (): Promise<StaticPage[]> => {
      const { data, error } = await db()
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(hydratePage);
    },
  });
}

export function useAdminPage(id: string | undefined) {
  return useQuery({
    queryKey: [...QK.all, "id", id],
    enabled: !!id,
    queryFn: async (): Promise<StaticPage | null> => {
      const { data, error } = await db()
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? hydratePage(data) : null;
    },
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StaticPage>): Promise<StaticPage> => {
      // Try with layout first; if column doesn't exist yet (migration pending), retry without it
      const { data, error } = await db().insert(input).select().single();
      if (error && error.message?.includes("layout")) {
        const { data: d2, error: e2 } = await db().insert(withoutLayout(input)).select().single();
        if (e2) throw e2;
        return hydratePage(d2);
      }
      if (error) throw error;
      return hydratePage(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<StaticPage> & { id: string }): Promise<StaticPage> => {
      const { data, error } = await db().update(patch).eq("id", id).select().single();
      if (error && error.message?.includes("layout")) {
        const { data: d2, error: e2 } = await db().update(withoutLayout(patch)).eq("id", id).select().single();
        if (e2) throw e2;
        return hydratePage(d2);
      }
      if (error) throw error;
      return hydratePage(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

export function usePublishPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await db()
        .update({
          status: publish ? "published" : "draft",
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

export function useSeedPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pages: Omit<StaticPage, "id" | "created_at" | "updated_at" | "created_by" | "published_at" | "ai_generated" | "seo_score" | "layout">[]): Promise<{ created: number; skipped: number }> => {
      // Fetch existing slugs to avoid duplicates
      const { data: existing } = await db().select("slug");
      const existingSlugs = new Set((existing ?? []).map((p: any) => p.slug));

      let created = 0;
      let skipped = 0;

      for (const page of pages) {
        if (existingSlugs.has(page.slug)) {
          skipped++;
          continue;
        }
        const payload = { ...page, ai_generated: false };
        const { error } = await db().insert(withoutLayout(payload));
        if (error) {
          // If a unique constraint violation, skip
          if (error.code === "23505") { skipped++; continue; }
          throw error;
        }
        created++;
      }

      return { created, skipped };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

export function useGeneratePageContent() {
  return useMutation({
    mutationFn: async (input: GeneratePageInput): Promise<GeneratedPageContent> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous");

      const resp = await supabase.functions.invoke("generate-page-content", {
        body: input,
      });

      if (resp.error) throw new Error(resp.error.message ?? "Erreur edge function");
      return resp.data as GeneratedPageContent;
    },
  });
}
