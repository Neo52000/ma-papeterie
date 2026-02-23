import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PageStatus = "draft" | "published" | "archived";
export type SchemaType = "WebPage" | "Service" | "FAQPage" | "Article" | "LocalBusiness" | "HowTo";

export interface ContentBlock {
  type: "heading" | "paragraph" | "list" | "faq" | "cta";
  level?: 2 | 3;
  content?: string;
  ordered?: boolean;
  items?: string[];
  questions?: { q: string; a: string }[];
  title?: string;
  description?: string;
  link?: string;
  button?: string;
}

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

// ── Hooks publics ──────────────────────────────────────────────────────────────

/** Lecture d'une page publiée par slug (usage public) */
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
      return data as StaticPage | null;
    },
  });
}

// ── Hooks admin ───────────────────────────────────────────────────────────────

/** Liste toutes les pages (admin) */
export function useAdminPages() {
  return useQuery({
    queryKey: QK.lists(),
    staleTime: 60_000,
    queryFn: async (): Promise<StaticPage[]> => {
      const { data, error } = await db()
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StaticPage[];
    },
  });
}

/** Lecture d'une page par ID (admin, toutes statuts) */
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
      return data as StaticPage | null;
    },
  });
}

/** Créer une page */
export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<StaticPage>): Promise<StaticPage> => {
      const { data, error } = await db().insert(input).select().single();
      if (error) throw error;
      return data as StaticPage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

/** Mettre à jour une page */
export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<StaticPage> & { id: string }): Promise<StaticPage> => {
      const { data, error } = await db().update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as StaticPage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.lists() }),
  });
}

/** Publier / dépublier une page */
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

/** Supprimer une page */
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

/** Génération IA via edge function */
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
