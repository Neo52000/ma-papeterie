import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Champs internes disponibles pour le mapping ───────────────────────────────

export const IMPORT_FIELDS = [
  { key: "name",              label: "Nom produit",                required: true  },
  { key: "ean",               label: "EAN (code-barres)",          required: false },
  { key: "sku_interne",       label: "Référence interne",          required: false },
  { key: "manufacturer_ref",  label: "Référence fabricant",        required: false },
  { key: "description",       label: "Description",                required: false },
  { key: "category",          label: "Catégorie",                  required: false },
  { key: "brand",             label: "Marque",                     required: false },
  { key: "price_ht",          label: "Prix HT (€)",                required: false },
  { key: "price_ttc",         label: "Prix TTC (€)",               required: false },
  { key: "tva_rate",          label: "Taux TVA (%)",               required: false },
  { key: "stock_quantity",    label: "Stock",                      required: false },
  { key: "image_url",         label: "URL Image",                  required: false },
  { key: "weight_kg",         label: "Poids (kg)",                 required: false },
  { key: "supplier_reference",label: "Réf. fournisseur",           required: false },
  { key: "supplier_price",    label: "Prix fournisseur HT (€)",    required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ImportJobStatus =
  | "staging" | "applying" | "done" | "error" | "rolled_back";

export type ImportRowStatus =
  | "staging" | "invalid" | "applied" | "error" | "rolled_back";

export interface ImportJob {
  id: string;
  supplier_id: string | null;
  filename: string;
  status: ImportJobStatus;
  total_rows: number;
  ok_rows: number;
  error_rows: number;
  created_by: string | null;
  created_at: string;
  applied_at: string | null;
  rolled_back_at: string | null;
  // joined
  supplier?: { id: string; name: string } | null;
}

export interface ImportJobRow {
  id: string;
  job_id: string;
  row_index: number;
  raw_data: Record<string, string>;
  mapped_data: Record<string, string>;
  status: ImportRowStatus;
  error_messages: string[];
  product_id: string | null;
}

export interface ImportMappingTemplate {
  id: string;
  supplier_id: string | null;
  name: string;
  mapping: Record<string, string>;
  created_at: string;
}

// ── Parsing XLSX/CSV ──────────────────────────────────────────────────────────

export interface ParsedFile {
  headers: string[];
  /** Toutes les lignes comme objects { header: value } */
  rows: Record<string, string>[];
  /** 5 premières lignes pour la prévisualisation */
  preview: Record<string, string>[];
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // sheet_to_json avec header: 1 → tableau de tableaux
  const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: "",
    raw: false, // tout en string
  });

  if (rawData.length === 0) throw new Error("Fichier vide ou non lisible");

  const headers = (rawData[0] as (string | number | null)[])
    .map((h) => String(h ?? "").trim())
    .filter((h) => h !== "");

  if (headers.length === 0) throw new Error("Aucun en-tête détecté dans le fichier");

  const dataRows = rawData.slice(1).filter((row) =>
    (row as (string | number | null)[]).some((v) => v !== null && v !== ""),
  );

  const rows: Record<string, string>[] = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String((row as (string | number | null)[])[i] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows, preview: rows.slice(0, 5) };
}

// ── Auto-détection du mapping ─────────────────────────────────────────────────

/** Tente de mapper automatiquement les colonnes du fichier vers les champs internes */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const ALIASES: Record<ImportFieldKey, string[]> = {
    name:               ["nom", "name", "désignation", "designation", "libellé", "libelle", "article", "produit", "label"],
    ean:                ["ean", "code-barres", "code barres", "barcode", "gtin", "ean13", "ean8"],
    sku_interne:        ["sku", "référence", "reference", "réf", "ref", "code", "art"],
    manufacturer_ref:   ["ref fabricant", "réf fabricant", "fabricant ref", "manufacturer ref", "maker ref"],
    description:        ["description", "desc", "détail", "detail"],
    category:           ["catégorie", "categorie", "category", "famille", "family", "rayon"],
    brand:              ["marque", "brand", "fabricant", "manufacturer", "maker"],
    price_ht:           ["prix ht", "price ht", "ht", "prix hors taxe", "tarif ht"],
    price_ttc:          ["prix ttc", "price ttc", "ttc", "prix toutes taxes", "tarif ttc"],
    tva_rate:           ["tva", "vat", "taxe", "tax rate", "taux tva"],
    stock_quantity:     ["stock", "quantité", "quantite", "qty", "qté", "inventory"],
    image_url:          ["image", "image url", "photo", "url image", "photo url", "img"],
    weight_kg:          ["poids", "weight", "kg", "masse", "poids kg"],
    supplier_reference: ["ref fournisseur", "réf fournisseur", "supplier ref", "supplier reference"],
    supplier_price:     ["prix achat", "prix fournisseur", "cost", "coût", "achat ht"],
  };

  for (const field of IMPORT_FIELDS) {
    const aliases = ALIASES[field.key] ?? [];
    for (const header of headers) {
      const h = header.toLowerCase().trim();
      if (aliases.some((a) => h.includes(a) || a.includes(h))) {
        mapping[field.key] = header;
        break;
      }
    }
  }

  return mapping;
}

/** Applique le mapping à une liste de lignes brutes → lignes mappées */
export function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
): Record<string, string>[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [fieldKey, sourceCol] of Object.entries(mapping)) {
      if (sourceCol && row[sourceCol] !== undefined) {
        mapped[fieldKey] = row[sourceCol];
      }
    }
    return mapped;
  });
}

// ── Validation côté client ────────────────────────────────────────────────────

export function validateMappedRow(mapped: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!mapped.name?.trim()) errors.push("Nom requis");
  if (mapped.ean?.trim() && !/^\d{8}$|^\d{13}$/.test(mapped.ean.trim())) errors.push("EAN invalide");
  if (mapped.price_ht && Number(mapped.price_ht) <= 0) errors.push("Prix HT ≤ 0");
  if (mapped.price_ttc && Number(mapped.price_ttc) <= 0) errors.push("Prix TTC ≤ 0");
  if (mapped.stock_quantity && Number(mapped.stock_quantity) < 0) errors.push("Stock < 0");
  if (mapped.image_url && !/^https?:\/\/.+/.test(mapped.image_url)) errors.push("URL image invalide");
  return errors;
}

// ── Hooks React Query ─────────────────────────────────────────────────────────

/** Liste des fournisseurs actifs */
export const useSuppliersList = () =>
  useQuery({
    queryKey: ["suppliers-list"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

/** Historique des jobs d'import */
export const useImportJobs = () =>
  useQuery({
    queryKey: ["import-jobs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("import_jobs")
        .select("*, supplier:suppliers(id, name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ImportJob[];
    },
  });

/** Lignes d'un job */
export const useImportJobRows = (jobId: string | null) =>
  useQuery({
    queryKey: ["import-job-rows", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("import_job_rows")
        .select("*")
        .eq("job_id", jobId!)
        .order("row_index");
      if (error) throw error;
      return data as ImportJobRow[];
    },
  });

/** Templates de mapping pour un fournisseur */
export const useImportTemplates = (supplierId: string | null) =>
  useQuery({
    queryKey: ["import-templates", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("import_mapping_templates")
        .select("*")
        .eq("supplier_id", supplierId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ImportMappingTemplate[];
    },
  });

/** Création d'un job */
export const useCreateImportJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      supplier_id: string | null;
      filename: string;
      total_rows: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("import_jobs")
        .insert([{ ...values, created_by: user?.id ?? null }])
        .select()
        .single();
      if (error) throw error;
      return data as ImportJob;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["import-jobs"] }),
  });
};

/** Insertion en masse des lignes (chunks de 500) */
export const useInsertJobRows = () =>
  useMutation({
    mutationFn: async ({
      jobId,
      rows,
    }: {
      jobId: string;
      rows: { row_index: number; raw_data: Record<string, string>; mapped_data: Record<string, string> }[];
    }) => {
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK).map((r) => ({
          job_id: jobId,
          row_index: r.row_index,
          raw_data: r.raw_data,
          mapped_data: r.mapped_data,
          status: "staging",
        }));
        const { error } = await (supabase as any).from("import_job_rows").insert(chunk);
        if (error) throw error;
      }
    },
  });

/** Sauvegarde d'un template de mapping */
export const useSaveTemplate = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      supplier_id: string | null;
      name: string;
      mapping: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("import_mapping_templates")
        .insert([{ ...values, created_by: user?.id ?? null }])
        .select()
        .single();
      if (error) throw error;
      return data as ImportMappingTemplate;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["import-templates", vars.supplier_id] });
      toast({ title: "Template sauvegardé" });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
};

/** Appel edge function apply */
export const useApplyImportJob = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("import-fournisseur-apply", {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok_rows: number; error_rows: number; total_rows: number; status: string };
    },
    onSuccess: (data, jobId) => {
      qc.invalidateQueries({ queryKey: ["import-jobs"] });
      qc.invalidateQueries({ queryKey: ["import-job-rows", jobId] });
      toast({
        title: `Import terminé : ${data.ok_rows} OK, ${data.error_rows} erreur(s)`,
      });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur import", description: e.message, variant: "destructive" }),
  });
};

/** Appel edge function rollback */
export const useRollbackImportJob = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("import-fournisseur-rollback", {
        body: { job_id: jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { restored: number; errors: number };
    },
    onSuccess: (data, jobId) => {
      qc.invalidateQueries({ queryKey: ["import-jobs"] });
      qc.invalidateQueries({ queryKey: ["import-job-rows", jobId] });
      toast({ title: `Rollback effectué : ${data.restored} produit(s) restauré(s)` });
    },
    onError: (e: Error) =>
      toast({ title: "Erreur rollback", description: e.message, variant: "destructive" }),
  });
};
