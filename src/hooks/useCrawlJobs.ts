import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";
import { env } from "@/config/env";
import { useToast } from "@/hooks/use-toast";

export interface CrawlJob {
  id: string;
  source: string;
  start_urls: string[];
  status: string;
  max_pages: number;
  max_images: number;
  delay_ms: number;
  pages_visited: number;
  images_found: number;
  images_uploaded: number;
  phase: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlImage {
  id: string;
  job_id: string;
  page_url: string | null;
  source_url: string;
  storage_path: string | null;
  storage_public_url: string | null;
  content_type: string | null;
  sha256: string | null;
  bytes: number | null;
  created_at: string;
  signed_url?: string | null;
}

export interface CrawlJobDetail {
  job: CrawlJob;
  images: CrawlImage[];
  total_images: number;
  total_pages: number;
  limit: number;
  offset: number;
}

export function useCrawlJobs(source?: string) {
  return useQuery({
    queryKey: ["crawl-jobs", source],
    queryFn: async () => {
      let query = supabase
        .from("crawl_jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (source) {
        query = query.eq("source", source);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CrawlJob[];
    },
    refetchInterval: 5000, // Poll every 5s for running jobs
  });
}

export function useCrawlJobDetail(jobId: string | null, search = "", limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["crawl-job-detail", jobId, search, limit, offset],
    queryFn: async () => {
      if (!jobId) return null;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const url = new URL(
        `${SUPABASE_PROJECT_URL}/functions/v1/get-crawl-job`
      );
      url.searchParams.set("jobId", jobId);
      url.searchParams.set("limit", limit.toString());
      url.searchParams.set("offset", offset.toString());
      if (search) url.searchParams.set("search", search);

      const resp = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Erreur lors du chargement du job");
      }

      return (await resp.json()) as CrawlJobDetail;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.job?.status === "running" || d?.job?.status === "queued") return 5000;
      return false;
    },
  });
}

export function useStartCrawl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      source: string;
      start_urls: string[];
      max_pages: number;
      max_images: number;
      delay_ms: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("start-crawl", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Crawl lancé",
        description: `Job ${data.job_id} créé avec succès`,
      });
      queryClient.invalidateQueries({ queryKey: ["crawl-jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}


export function useCancelCrawl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("cancel-crawl", {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Crawl annulé",
        description: "Le crawl va s'arrêter sous quelques secondes.",
      });
      queryClient.invalidateQueries({ queryKey: ["crawl-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["crawl-job-detail"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
export function useTriggerAlkorSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trigger-alkor-sync", {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Alkor lancé",
        description: "Le workflow GitHub Actions a été déclenché. Le crawl va démarrer sous quelques secondes.",
      });
      queryClient.invalidateQueries({ queryKey: ["crawl-jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTriggerMrsSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trigger-mrs-sync", {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sync MRS lancé",
        description: "Le crawl de ma-rentree-scolaire.fr va démarrer sous quelques secondes.",
      });
      queryClient.invalidateQueries({ queryKey: ["crawl-jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCrawlJobs(source: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Delete related crawl_images and crawl_pages first, then jobs
      const { data: jobs } = await supabase
        .from("crawl_jobs")
        .select("id")
        .eq("source", source);

      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map((j) => j.id);
        await supabase.from("crawl_images").delete().in("job_id", jobIds);
        await supabase.from("crawl_pages").delete().in("job_id", jobIds);
        const { error } = await supabase.from("crawl_jobs").delete().in("id", jobIds);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Historique supprimé", description: "Tous les crawls ont été supprimés." });
      queryClient.invalidateQueries({ queryKey: ["crawl-jobs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });
}

export function useSetAlkorCookie() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cookieValue: string) => {
      const { data, error } = await supabase.functions.invoke("set-alkor-cookie", {
        body: { cookie_value: cookieValue },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Cookie mis à jour",
        description: "Le cookie de session AlkorShop a été enregistré côté serveur.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSetAlkorCredentials() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { client_code: string; username: string; password: string; base_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("set-alkor-cookie", {
        body: { mode: "credentials", ...params },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Identifiants enregistrés",
        description: "Les identifiants Alkor B2B ont été sauvegardés. Le crawl se connectera automatiquement.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function exportCrawlImagesCsv(images: CrawlImage[], jobId: string) {
  const headers = ["source_url", "page_url", "storage_url", "content_type", "sha256", "bytes"];
  const rows = images.map((img) => [
    img.source_url,
    img.page_url || "",
    img.signed_url || img.storage_public_url || "",
    img.content_type || "",
    img.sha256 || "",
    img.bytes?.toString() || "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `crawl-images-${jobId}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

