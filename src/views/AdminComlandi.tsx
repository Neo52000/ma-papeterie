import { useState, useRef, useCallback, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Plus, Trash2, Download, Server, Wifi, WifiOff, Lock, ImageIcon, FileText, Link2, RefreshCw, CloudUpload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { useLiderpapelCoefficients } from "@/hooks/useLiderpapelCoefficients";
import { toast } from "sonner";
import type { ImportLog } from "@/hooks/useImportLogs";
import { tusUpload, compressJsonFile } from "@/lib/tus-uploader";
import { ComlandiBackfillSection } from "@/components/admin/comlandi/ComlandiBackfillSection";
import { ComlandiTab } from "@/components/admin/comlandi/ComlandiTab";
import type { ImportResultData, PriceChange } from "@/components/admin/comlandi/ComlandiShared";
import { getErrorMessage } from "@/components/admin/comlandi/ComlandiShared";

interface SyncHistoryEntry {
  id: string;
  executed_at: string;
  status: string;
  duration_ms?: number;
  result?: {
    daily?: { created?: number; updated?: number; skipped?: number };
    parsing?: { catalog: number; prices: number; stocks_total: number; stocks_with_qty: number };
    enrichment_descriptions?: { updated: number };
    enrichment_multimedia?: { images_synced: number };
    errors?: string[];
    files?: Record<string, { status: string; size_mb: number }>;
    files_downloaded?: Record<string, { size_mb?: number }>;
  };
}

interface AuxResult {
  categories?: { total: number };
  delivery_orders?: {
    total: number;
    orders: DeliveryOrder[];
  };
  my_account?: {
    name: string;
    code: string;
    addresses?: Address[];
  };
}

interface DeliveryOrder {
  code: string;
  date: string;
  ownCode?: string;
  orderCode?: string;
  lines_count: number;
  total?: number;
}

interface Address {
  address: string;
  zipCode: string;
  location: string;
}

interface LiderpapelProduct {
  Product?: LiderpapelProduct[] | LiderpapelProduct;
  product?: LiderpapelProduct[] | LiderpapelProduct;
  [key: string]: unknown;
}

interface LiderpapelJsonRoot {
  root?: Record<string, unknown>;
  Products?: LiderpapelProduct[];
  Storage?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function AdminComlandi() {
  return (
    <AdminLayout title="Import COMLANDI / LIDERPAPEL" description="CS Group (Comlandi / Liderpapel) — un seul fournisseur, deux formats d'import">
      <div className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm flex gap-3 items-start">
          <div className="text-primary mt-0.5">ℹ️</div>
          <div>
            <strong>Comlandi et Liderpapel sont le même fournisseur</strong> — CS Group S.A. opère sous ces deux marques.
            Tous les produits sont liés à un seul fournisseur <code className="text-xs bg-muted px-1 rounded">CS Group (Comlandi / Liderpapel)</code> dans la base.
          </div>
        </div>

        <ComlandiBackfillSection />

        <Tabs defaultValue="comlandi">
          <TabsList>
            <TabsTrigger value="comlandi">COMLANDI</TabsTrigger>
            <TabsTrigger value="liderpapel">LIDERPAPEL</TabsTrigger>
          </TabsList>

          <TabsContent value="comlandi" className="mt-6">
            <ComlandiTab />
          </TabsContent>

          <TabsContent value="liderpapel" className="mt-6">
            <LiderpapelTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ─── Types for enrichment jobs ───

interface EnrichJobResult {
  updated?: number;
  created?: number;
  images_synced?: number;
  names_fixed?: number;
  skipped?: number;
  truncated?: boolean;
  skip_reasons?: {
    not_found: number;
    no_images: number;
    no_content: number;
    no_id: number;
    no_relations: number;
  };
  sample_not_found?: string[];
}

interface EnrichJob {
  id: string;
  file: File;
  fileType: 'descriptions_json' | 'multimedia_json' | 'relations_json';
  label: string;
  status: 'idle' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error';
  uploadProgress: number;
  processedRows: number;
  totalRows: number;
  result: EnrichJobResult | null;
  errorMessage?: string;
  jobId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Liderpapel Tab ───

function LiderpapelTab() {
  const [sftpLoading, setSftpLoading] = useState<'daily' | 'full' | null>(null);
  const [lastSync, setLastSync] = useState<SyncHistoryEntry | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [auxLoading, setAuxLoading] = useState(false);
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [auxResult, setAuxResult] = useState<AuxResult | null>(null);

  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);

  // Load sync history (last 5) on mount and after trigger
  useEffect(() => {
    supabase
      .from('cron_job_logs')
      .select('*')
      .eq('job_name', 'sync-liderpapel-sftp')
      .order('executed_at', { ascending: false })
      .limit(15)
      .then(({ data }) => { if (data) { const entries = data as unknown as SyncHistoryEntry[]; setSyncHistory(entries); if (entries[0]) setLastSync(entries[0]); } });
  }, [sftpLoading]);

  const handleTriggerSync = useCallback(async (includeEnrichment = false) => {
    setSftpLoading(includeEnrichment ? 'full' : 'daily');
    try {
      const { data, error } = await supabase.functions.invoke('trigger-liderpapel-sync', {
        body: { include_enrichment: includeEnrichment },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Sync lancée", { description: "Le workflow GitHub Actions a été déclenché. Résultats dans quelques minutes." });
    } catch (err: unknown) {
      // Fallback: open GitHub Actions page
      const msg = getErrorMessage(err);
      if (msg.includes('GITHUB_PAT')) {
        window.open('https://github.com/Neo52000/ma-papeterie/actions/workflows/sync-liderpapel.yml', '_blank');
        toast.info("Ouvrez GitHub Actions pour lancer manuellement", { description: "Ajoutez GITHUB_PAT aux secrets Supabase pour le déclenchement automatique." });
      } else {
        toast.error("Erreur déclenchement sync", { description: msg });
      }
    } finally {
      setSftpLoading(null);
    }
  }, []);
  const catalogRef = useRef<HTMLInputElement>(null);
  const pricesRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLInputElement>(null);
  const deliveryRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLInputElement>(null);
  const descriptionsRef = useRef<HTMLInputElement>(null);
  const multimediaRef = useRef<HTMLInputElement>(null);
  const relationsRef = useRef<HTMLInputElement>(null);
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [pricesFile, setPricesFile] = useState<File | null>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [categoriesFile, setCategoriesFile] = useState<File | null>(null);
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [accountFile, setAccountFile] = useState<File | null>(null);

  // ─── Enrichment jobs (new upload-to-storage flow) ───
  const [enrichJobs, setEnrichJobs] = useState<EnrichJob[]>([]);
  const pollingRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Cleanup polling intervals on unmount
  useEffect(() => {
    const refs = pollingRefs.current;
    return () => {
      Object.values(refs).forEach(clearInterval);
    };
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<EnrichJob>) => {
    setEnrichJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
  }, []);

  const startPolling = useCallback((localJobId: string, remoteJobId: string) => {
    if (pollingRefs.current[localJobId]) clearInterval(pollingRefs.current[localJobId]);

    const pollStart = Date.now();
    // Pre-start timeout: if never reaches 'processing' after 5 min → function never started
    const PRE_START_TIMEOUT_MS  = 5  * 60 * 1000;
    // Processing timeout: if stuck in 'processing' after 12 min → edge function timed out
    const PROCESSING_TIMEOUT_MS = 12 * 60 * 1000;

    pollingRefs.current[localJobId] = setInterval(async () => {
      const { data: job } = await supabase
        .from('enrich_import_jobs')
        .select('*')
        .eq('id', remoteJobId)
        .single();

      if (!job) return;

      // Detect job stuck before processing started (network failure / function not triggered)
      if (
        (job.status === 'uploading' || job.status === 'pending') &&
        Date.now() - pollStart > PRE_START_TIMEOUT_MS
      ) {
        clearInterval(pollingRefs.current[localJobId]);
        delete pollingRefs.current[localJobId];
        const msg = "La fonction de traitement n'a pas démarré (timeout 5 min). Réessayez.";
        updateJob(localJobId, { status: 'error', errorMessage: msg });
        await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', remoteJobId);
        toast.error('Enrichissement échoué', { description: msg });
        return;
      }

      // Detect job stuck in processing (edge function timed out without updating status)
      if (
        job.status === 'processing' &&
        Date.now() - pollStart > PROCESSING_TIMEOUT_MS
      ) {
        clearInterval(pollingRefs.current[localJobId]);
        delete pollingRefs.current[localJobId];
        const msg = "Traitement trop long (>12 min) — la fonction serveur a probablement expiré. Réessayez ou découpez le fichier.";
        updateJob(localJobId, { status: 'error', errorMessage: msg });
        await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', remoteJobId);
        toast.error('Enrichissement échoué', { description: msg });
        return;
      }

      updateJob(localJobId, {
        processedRows: job.processed_rows || 0,
        totalRows: job.total_rows || 0,
        status: job.status as EnrichJob['status'],
        result: job.result as unknown as EnrichJobResult | null,
        errorMessage: job.error_message || undefined,
      });

      if (job.status === 'done' || job.status === 'error') {
        clearInterval(pollingRefs.current[localJobId]);
        delete pollingRefs.current[localJobId];

        if (job.status === 'done') {
          const r: EnrichJobResult = (job.result as EnrichJobResult) || {};
          const details = [
            r.updated       ? `${r.updated} mis à jour`          : '',
            r.created       ? `${r.created} créés`               : '',
            r.images_synced ? `${r.images_synced} images sync.`  : '',
            r.names_fixed   ? `${r.names_fixed} noms corrigés`   : '',
            r.skipped       ? `${r.skipped} ignorés`             : '',
          ].filter(Boolean).join(' · ');
          toast.success(`Enrichissement terminé`, { description: details || 'Traitement OK' });
        } else {
          toast.error(`Erreur enrichissement`, { description: job.error_message });
        }
      }
    }, 3000);
  }, [updateJob]);

  const handleEnrichFileSelect = useCallback((
    file: File,
    fileType: EnrichJob['fileType'],
    label: string,
  ) => {
    const localId = `${fileType}-${Date.now()}`;
    setEnrichJobs(prev => {
      // Replace existing job for same fileType
      const filtered = prev.filter(j => j.fileType !== fileType);
      return [...filtered, {
        id: localId,
        file,
        fileType,
        label,
        status: 'idle',
        uploadProgress: 0,
        processedRows: 0,
        totalRows: 0,
        result: null,
      }];
    });
  }, []);

  const handleEnrichUploadAndProcess = useCallback(async (job: EnrichJob) => {
    const storagePath = `enrich-${Date.now()}-${job.file.name}`;

    // 1. Create job record in DB
    const { data: dbJob, error: insertError } = await supabase
      .from('enrich_import_jobs')
      .insert({
        storage_path: storagePath,
        file_type: job.fileType,
        file_name: job.file.name,
        status: 'uploading',
      })
      .select('id')
      .single();

    if (insertError || !dbJob) {
      updateJob(job.id, { status: 'error', errorMessage: insertError?.message || 'Erreur création job' });
      return;
    }

    updateJob(job.id, { status: 'uploading', jobId: dbJob.id });

    // 2. Upload via TUS (chunked — supports files of several hundred MB)
    //    Files > 20 MB are gzip-compressed before upload (JSON compresses ~10:1)
    //    to stay under Supabase's global 50 MB storage limit on free-tier projects.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      updateJob(job.id, { status: 'error', errorMessage: 'Session expirée — reconnectez-vous' });
      return;
    }
    const authToken = session.access_token;

    const COMPRESS_THRESHOLD = 20 * 1024 * 1024; // 20 MB
    let uploadBlob: File | Blob = job.file;
    let isGzipped = false;

    if (job.file.size > COMPRESS_THRESHOLD) {
      updateJob(job.id, { status: 'compressing' });
      try {
        uploadBlob = await compressJsonFile(job.file);
        isGzipped = true;
      } catch (cErr: unknown) {
        if (import.meta.env.DEV) console.warn('[enrich] Compression failed, uploading raw:', getErrorMessage(cErr));
        uploadBlob = job.file;
        isGzipped = false;
      }
      updateJob(job.id, { status: 'uploading' });
    }

    try {
      await tusUpload(uploadBlob, storagePath, (pct) => {
        updateJob(job.id, { uploadProgress: pct });
      }, authToken, isGzipped);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      updateJob(job.id, { status: 'error', errorMessage: msg });
      await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', dbJob.id);
      return;
    }

    updateJob(job.id, { status: 'processing', uploadProgress: 100 });

    // Large files (>20 MB): use chunked processing to avoid Edge Function timeout
    const CHUNKED_THRESHOLD = 20 * 1024 * 1024; // 20 MB
    if (job.file.size > CHUNKED_THRESHOLD) {
      try {
        // Step 1: Prepare — split file into chunks stored in Storage
        const { data: prepData, error: prepError } = await supabase.functions.invoke('process-enrich-file', {
          body: { storagePath, fileType: job.fileType, jobId: dbJob.id, action: 'prepare' },
        });
        if (prepError) throw new Error(prepError.message);
        if (!prepData?.chunkCount) throw new Error('prepare did not return chunkCount');

        const { chunkCount, chunksPrefix, totalProducts } = prepData;
        updateJob(job.id, { totalRows: totalProducts, processedRows: 0 });

        // Step 2: Process each chunk sequentially
        for (let i = 0; i < chunkCount; i++) {
          const { data: _chunkData, error: chunkError } = await supabase.functions.invoke('process-enrich-file', {
            body: {
              action: 'process_chunk',
              chunksPrefix,
              chunkIndex: i,
              chunkCount,
              fileType: job.fileType,
              jobId: dbJob.id,
            },
          });
          if (chunkError) throw new Error(`Chunk ${i + 1}/${chunkCount}: ${chunkError.message}`);

          const processed = Math.min((i + 1) * (prepData.chunkSize || 5000), totalProducts);
          updateJob(job.id, { processedRows: processed });
        }

        // All chunks done — mark as complete
        updateJob(job.id, { status: 'done', processedRows: totalProducts });
        const { data: finalJob } = await supabase.from('enrich_import_jobs').select('result').eq('id', dbJob.id).single();
        if (finalJob?.result) {
          updateJob(job.id, { result: finalJob.result as unknown as EnrichJobResult });
        }
        toast.success('Enrichissement terminé', { description: `${totalProducts} produits traités en ${chunkCount} étapes` });
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        updateJob(job.id, { status: 'error', errorMessage: msg });
        await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', dbJob.id);
        toast.error('Enrichissement échoué', { description: msg });
      }
      return;
    }

    // Small files: legacy single-pass mode (fire & forget + polling)
    supabase.functions.invoke('process-enrich-file', {
      body: { storagePath, fileType: job.fileType, jobId: dbJob.id },
    }).catch(() => {
      // fire-and-forget — polling handles status
    });

    // Start polling immediately — don't wait for the invoke response
    startPolling(job.id, dbJob.id);
  }, [updateJob, startPolling]);

  const handleEnrichAll = useCallback(async () => {
    const idleJobs = enrichJobs.filter(j => j.status === 'idle');
    if (idleJobs.length === 0) {
      toast.error("Aucun fichier en attente — chargez au moins un fichier");
      return;
    }
    // Process all idle jobs in parallel
    await Promise.all(idleJobs.map(handleEnrichUploadAndProcess));
  }, [enrichJobs, handleEnrichUploadAndProcess]);

  const { logs, refetch: refetchLogs } = useImportLogs();
  const liderpapelLogs = logs.filter(l => l.format === 'liderpapel-catalogue');

  const { coefficients, isLoading: coeffLoading, addCoefficient, deleteCoefficient } = useLiderpapelCoefficients();
  const [newFamily, setNewFamily] = useState("");
  const [newSubfamily, setNewSubfamily] = useState("");
  const [newCoeff, setNewCoeff] = useState("2.0");

  const isJsonFile = (file: File) => file.name.toLowerCase().endsWith('.json');

  const handleManualImport = async () => {
    if (!catalogFile && !pricesFile) {
      toast.error("Veuillez charger au moins Catalog.json ou Prices.json");
      return;
    }
    setManualLoading(true);
    setResult(null);
    try {
      const useJson = (catalogFile && isJsonFile(catalogFile)) || (pricesFile && isJsonFile(pricesFile));

      if (useJson) {
        // Client-side batching for large JSON files
        let catalogProducts: LiderpapelProduct[] = [];
        let pricesProducts: LiderpapelProduct[] = [];
        let stockProducts: LiderpapelProduct[] = [];

        const extractProducts = (json: LiderpapelJsonRoot, containerKey: string): LiderpapelProduct[] => {
          const root = json?.root || json;
          // Handle nested array structure: root > Products > [{ Product: [...] }]
          const container = (root as Record<string, unknown>)?.[containerKey] || (root as Record<string, unknown>)?.[containerKey.toLowerCase()] || root;
          if (Array.isArray(container)) {
            // root.Products is an array of { Product: [...] }
            const allProducts: LiderpapelProduct[] = [];
            for (const item of container) {
              const prods = item?.Product || item?.product || [];
              const prodList = Array.isArray(prods) ? prods : [prods];
              allProducts.push(...prodList);
            }
            return allProducts;
          }
          const typedContainer = container as LiderpapelProduct | undefined;
          const products = typedContainer?.Product || typedContainer?.product || [];
          return Array.isArray(products) ? products : products ? [products] : [];
        };

        if (catalogFile) {
          const json = JSON.parse(await catalogFile.text());
          catalogProducts = extractProducts(json, 'Products');
        }
        if (pricesFile) {
          const json = JSON.parse(await pricesFile.text());
          pricesProducts = extractProducts(json, 'Products');
        }
        if (stockFile) {
          // Stock has different structure: Storage > Stocks > Products > Product
          const raw = JSON.parse(await stockFile.text());
          const storage = raw?.Storage || raw?.storage || raw?.root?.Storage || raw;
          const stocks = storage?.Stocks || storage?.stocks || [];
          const stocksList = Array.isArray(stocks) ? stocks : [stocks];
          stockProducts = [];
          for (const s of stocksList) {
            const prods = s?.Products?.Product || s?.products?.Product || [];
            stockProducts.push(...(Array.isArray(prods) ? prods : [prods]));
          }
        }

        const BATCH = 200;
        const maxLen = Math.max(catalogProducts.length, pricesProducts.length, 1);
        const totals = {
          created: 0,
          updated: 0,
          skipped: 0,
          errors: 0,
          details: [] as string[],
          price_changes: [] as unknown[],
          warnings_count: 0,
          warnings: [] as string[],
        };

        for (let i = 0; i < maxLen; i += BATCH) {
          const body: Record<string, unknown> = {};
          if (catalogProducts.length > 0) {
            const batch = catalogProducts.slice(i, i + BATCH);
            if (batch.length > 0) body.catalog_json = { Products: { Product: batch } };
          }
          if (pricesProducts.length > 0) {
            const batch = pricesProducts.slice(i, i + BATCH);
            if (batch.length > 0) body.prices_json = { Products: { Product: batch } };
          }
          if (stockProducts.length > 0) {
            const batch = stockProducts.slice(i, i + BATCH);
            if (batch.length > 0) body.stocks_json = { Storage: { Stocks: [{ Products: { Product: batch } }] } };
          }
          if (Object.keys(body).length === 0) continue;

          const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
          if (error) {
            totals.errors += BATCH;
            totals.details.push(`Batch ${Math.floor(i / BATCH) + 1} error: ${error.message}`);
            continue;
          }
          totals.created += data?.created || 0;
          totals.updated += data?.updated || 0;
          totals.skipped += data?.skipped || 0;
          totals.errors += data?.errors || 0;
          if (data?.details) totals.details.push(...data.details);
          if (data?.price_changes) totals.price_changes.push(...data.price_changes);
          totals.warnings_count += data?.warnings_count || 0;
          if (Array.isArray(data?.warnings)) {
            for (const warning of data.warnings) {
              if (totals.warnings.length >= 50) break;
              totals.warnings.push(String(warning));
            }
          }
        }

        setResult({ ...totals, format: 'json', catalog_count: catalogProducts.length, prices_count: pricesProducts.length, stock_count: stockProducts.length, merged_total: maxLen });
        if (totals.errors > 0) {
          toast.warning(`Import terminé (json) avec ${totals.errors} erreurs`, {
            description: totals.warnings_count > 0 ? `${totals.warnings_count} alerte(s) technique(s)` : undefined,
          });
        } else if (totals.warnings_count > 0) {
          toast.warning(`Import terminé (json) avec alertes`, {
            description: `${totals.warnings_count} alerte(s) technique(s)`,
          });
        } else {
          toast.success(`Import terminé (json) : ${totals.created} créés, ${totals.updated} modifiés`);
        }
        refetchLogs();
      } else {
        // CSV: send as-is (usually smaller)
        const body: Record<string, string> = {};
        if (catalogFile) body.catalog_csv = await catalogFile.text();
        if (pricesFile) body.prices_csv = await pricesFile.text();
        if (stockFile) body.stock_csv = await stockFile.text();
        const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
        if (error) throw error;
        const csvResult = {
          ...data,
          warnings_count: data?.warnings_count || 0,
          warnings: Array.isArray(data?.warnings) ? data.warnings.slice(0, 50) : [],
        };
        setResult(csvResult);
        if ((csvResult?.errors || 0) > 0) {
          toast.warning(`Import terminé (csv) avec ${csvResult.errors} erreurs`, {
            description: csvResult.warnings_count > 0 ? `${csvResult.warnings_count} alerte(s) technique(s)` : undefined,
          });
        } else if ((csvResult?.warnings_count || 0) > 0) {
          toast.warning(`Import terminé (csv) avec alertes`, {
            description: `${csvResult.warnings_count} alerte(s) technique(s)`,
          });
        } else {
          toast.success(`Import terminé (csv) : ${csvResult.created} créés, ${csvResult.updated} modifiés`);
        }
        refetchLogs();
      }
    } catch (err: unknown) {
      toast.error("Erreur import", { description: getErrorMessage(err) });
    } finally {
      setManualLoading(false);
    }
  };

  const handleAuxImport = async () => {
    if (!categoriesFile && !deliveryFile && !accountFile) {
      toast.error("Veuillez charger au moins un fichier");
      return;
    }
    setAuxLoading(true);
    setAuxResult(null);
    try {
      const body: Record<string, string> = {};
      if (categoriesFile) body.categories_json = await categoriesFile.text();
      if (deliveryFile) body.delivery_orders_json = await deliveryFile.text();
      if (accountFile) body.my_account_json = await accountFile.text();
      const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
      if (error) throw error;
      const auxData = data as AuxResult;
      setAuxResult(auxData);
      const parts: string[] = [];
      if (auxData.categories) parts.push(`${auxData.categories.total} catégories`);
      if (auxData.delivery_orders) parts.push(`${auxData.delivery_orders.total} BL`);
      if (auxData.my_account) parts.push(`Compte: ${auxData.my_account.name}`);
      toast.success(`Import auxiliaire terminé : ${parts.join(', ')}`);
    } catch (err: unknown) {
      toast.error("Erreur import", { description: getErrorMessage(err) });
    } finally {
      setAuxLoading(false);
    }
  };

  const handleAddCoeff = () => {
    if (!newFamily.trim()) { toast.error("Famille requise"); return; }
    addCoefficient.mutate({
      family: newFamily.trim(),
      subfamily: newSubfamily.trim() || undefined,
      coefficient: parseFloat(newCoeff) || 2.0,
    });
    setNewFamily("");
    setNewSubfamily("");
    setNewCoeff("2.0");
  };




  return (
    <div className="space-y-6">
      {/* Synchronisation SFTP automatique */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Synchronisation SFTP Liderpapel</CardTitle>
              <CardDescription>
                Connexion automatique au serveur SFTP — Catalog, Prices, Stocks tous les jours à minuit.
                Enrichissement complet (descriptions, images, relations) chaque dimanche à 1h.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Protocole</p>
                <p className="text-sm font-medium">SFTP (SSH)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Hôte</p>
                <p className="text-sm font-medium font-mono">sftp.liderpapel.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Server className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Cron quotidien</p>
                <p className="text-sm font-medium font-mono">00:00 UTC</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              {lastSync?.status === 'success' ? (
                <Wifi className="h-4 w-4 text-primary shrink-0" />
              ) : lastSync?.status === 'error' ? (
                <WifiOff className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Dernier sync</p>
                <p className="text-sm font-medium">
                  {lastSync
                    ? new Date(lastSync.executed_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })
                    : 'Aucun'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              className="gap-2"
              onClick={() => handleTriggerSync(false)}
              disabled={sftpLoading !== null}
            >
              {sftpLoading === 'daily' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {sftpLoading === 'daily' ? "Déclenchement..." : "Lancer sync maintenant"}
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => handleTriggerSync(true)}
              disabled={sftpLoading !== null}
            >
              {sftpLoading === 'full' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {sftpLoading === 'full' ? "Déclenchement..." : "Sync + Enrichissement"}
            </Button>
          </div>

          {/* Historique des syncs */}
          {syncHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historique récent</p>
              <div className="space-y-2">
                {syncHistory.map((sync: SyncHistoryEntry) => (
                  <div key={sync.id} className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                    sync.status === 'success' ? 'border-primary/20 bg-primary/5' :
                    sync.status === 'partial' ? 'border-yellow-500/20 bg-yellow-50' :
                    'border-destructive/20 bg-destructive/5'
                  }`}>
                    {sync.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> :
                     sync.status === 'partial' ? <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" /> :
                     <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {new Date(sync.executed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {sync.duration_ms && <Badge variant="outline" className="text-xs">{(sync.duration_ms / 1000).toFixed(0)}s</Badge>}
                        <Badge variant={sync.status === 'success' ? 'default' : sync.status === 'partial' ? 'secondary' : 'destructive'} className="text-xs">
                          {sync.status}
                        </Badge>
                      </div>
                      {sync.result?.daily && (
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          {/* Edge Function format: {created, updated, skipped} */}
                          {(sync.result.daily.created ?? 0) > 0 && <span className="text-primary">{sync.result.daily.created} créés</span>}
                          {(sync.result.daily.updated ?? 0) > 0 && <span className="text-blue-600">{sync.result.daily.updated} modifiés</span>}
                          {(sync.result.daily.skipped ?? 0) > 0 && <span>{sync.result.daily.skipped} inchangés</span>}
                          {/* SFTP script format: {Stocks: {status}, Prices: {status}, ...} */}
                          {(sync.result.daily as Record<string, unknown>).Stocks && Object.entries(sync.result.daily as Record<string, unknown>).map(([key, val]) => {
                            const v = val as { status?: string } | null;
                            return (
                              <span key={key} className={v?.status === 'ok' ? 'text-primary' : v?.status === 'not_found' ? 'text-muted-foreground' : 'text-destructive'}>
                                {key}: {v?.status === 'ok' ? '✓' : v?.status || '?'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {sync.result?.parsing && (
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Catalog: {sync.result.parsing.catalog}</span>
                          <span>Prix: {sync.result.parsing.prices}</span>
                          <span>Stocks: {sync.result.parsing.stocks_total} ({sync.result.parsing.stocks_with_qty} en stock)</span>
                        </div>
                      )}
                      {sync.result?.enrichment_descriptions && (
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Descriptions: {sync.result.enrichment_descriptions.updated} enrichies</span>
                          {sync.result.enrichment_multimedia && <span>Images: {sync.result.enrichment_multimedia.images_synced} sync.</span>}
                        </div>
                      )}
                      {sync.result?.files_downloaded && (
                        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {Object.entries(sync.result.files_downloaded as Record<string, unknown>).map(([name, info]) => {
                            const fi = info as { size_mb?: number } | null;
                            return <span key={name}>{name} ({fi?.size_mb} MB)</span>;
                          })}
                        </div>
                      )}
                      {sync.result?.errors?.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5">{sync.result.errors[0]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dernière sync détaillée */}
          {lastSync?.result?.files && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fichiers SFTP (dernier sync)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(lastSync.result.files).map(([name, info]: [string, { status: string; size_mb: number }]) => (
                  <div key={name} className={`flex items-center gap-2 p-2 rounded border text-xs ${info.status === 'ok' ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                    {info.status === 'ok' ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <AlertCircle className="h-3 w-3 text-destructive" />}
                    <span className="font-mono truncate">{name.replace(/_fr_FR_\d+/, '')}</span>
                    <span className="text-muted-foreground ml-auto">{info.size_mb} Mo</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Pipeline GitHub Actions (cron minuit Paris). Les identifiants SFTP sont dans les secrets GitHub.
            L'import manuel JSON ci-dessous reste disponible comme alternative.
          </p>
        </CardContent>
      </Card>

      {/* Import JSON/CSV manuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Import fichiers JSON / CSV</CardTitle>
              <CardDescription>Chargez les fichiers Liderpapel au format JSON (recommandé) ou CSV — Catalog, Prices, Stocks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input ref={catalogRef} type="file" accept=".json,.csv" className="hidden" onChange={e => setCatalogFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => catalogRef.current?.click()}>
                <Upload className="h-3 w-3" /> {catalogFile ? catalogFile.name : "Catalog.json"}
              </Button>
            </div>
            <div>
              <input ref={pricesRef} type="file" accept=".json,.csv" className="hidden" onChange={e => setPricesFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => pricesRef.current?.click()}>
                <Upload className="h-3 w-3" /> {pricesFile ? pricesFile.name : "Prices.json"}
              </Button>
            </div>
            <div>
              <input ref={stockRef} type="file" accept=".json,.csv" className="hidden" onChange={e => setStockFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => stockRef.current?.click()}>
                <Upload className="h-3 w-3" /> {stockFile ? stockFile.name : "Stocks.json (opt.)"}
              </Button>
            </div>
          </div>
          <Button onClick={handleManualImport} disabled={manualLoading} className="gap-2">
            {manualLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {manualLoading ? "Import en cours..." : "Importer les fichiers Liderpapel"}
          </Button>

          {result && !manualLoading && <ImportResult result={result} />}
        </CardContent>
      </Card>

      {/* Fichiers auxiliaires */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/50">
              <Download className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle>Fichiers auxiliaires</CardTitle>
              <CardDescription>Catégories, Bons de livraison, Compte client — JSON</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input ref={categoriesRef} type="file" accept=".json" className="hidden" onChange={e => setCategoriesFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => categoriesRef.current?.click()}>
                <Upload className="h-3 w-3" /> {categoriesFile ? categoriesFile.name : "Categories.json"}
              </Button>
            </div>
            <div>
              <input ref={deliveryRef} type="file" accept=".json" className="hidden" onChange={e => setDeliveryFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => deliveryRef.current?.click()}>
                <Upload className="h-3 w-3" /> {deliveryFile ? deliveryFile.name : "DeliveryOrders.json"}
              </Button>
            </div>
            <div>
              <input ref={accountRef} type="file" accept=".json" className="hidden" onChange={e => setAccountFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => accountRef.current?.click()}>
                <Upload className="h-3 w-3" /> {accountFile ? accountFile.name : "MyAccount.json"}
              </Button>
            </div>
          </div>
          <Button onClick={handleAuxImport} disabled={auxLoading} variant="secondary" className="gap-2">
            {auxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {auxLoading ? "Import en cours..." : "Importer fichiers auxiliaires"}
          </Button>

          {auxResult && !auxLoading && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Résultat import auxiliaire</span>
              </div>
              {auxResult.categories && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Catégories :</span>{" "}
                  <strong>{auxResult.categories.total}</strong> traitées
                </div>
              )}
              {auxResult.delivery_orders && (
                <div className="text-sm space-y-2">
                  <span className="text-muted-foreground">Bons de livraison :</span>{" "}
                  <strong>{auxResult.delivery_orders.total}</strong> BL
                  {auxResult.delivery_orders.orders?.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer">Voir les BL</summary>
                      <div className="mt-2 border rounded-lg overflow-auto max-h-[200px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">N° BL</TableHead>
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Commande</TableHead>
                              <TableHead className="text-xs">Lignes</TableHead>
                              <TableHead className="text-xs">Total €</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auxResult.delivery_orders.orders.map((o: DeliveryOrder, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs font-mono">{o.code}</TableCell>
                                <TableCell className="text-xs">{o.date}</TableCell>
                                <TableCell className="text-xs">{o.ownCode || o.orderCode}</TableCell>
                                <TableCell className="text-xs">{o.lines_count}</TableCell>
                                <TableCell className="text-xs">{o.total?.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  )}
                </div>
              )}
              {auxResult.my_account && (
                <div className="text-sm space-y-1">
                  <span className="text-muted-foreground">Compte :</span>{" "}
                  <strong>{auxResult.my_account.name}</strong> ({auxResult.my_account.code})
                  {auxResult.my_account.addresses?.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {auxResult.my_account.addresses.map((a: Address, i: number) => (
                        <p key={i}>{a.address}, {a.zipCode} {a.location}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrichissement produits — nouveau flux Storage + Edge Function */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CloudUpload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Enrichissement produits</CardTitle>
              <CardDescription>
                Descriptions, images et relations — upload direct vers Supabase Storage, traitement serveur en arrière-plan (supporte les fichiers &gt; 100 Mo)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(
              [
                { ref: descriptionsRef, fileType: 'descriptions_json' as const, label: 'Descriptions_fr.json', icon: <FileText className="h-4 w-4" /> },
                { ref: multimediaRef, fileType: 'multimedia_json' as const, label: 'MultimediaLinks_fr.json', icon: <ImageIcon className="h-4 w-4" /> },
                { ref: relationsRef, fileType: 'relations_json' as const, label: 'RelationedProducts_fr.json', icon: <Link2 className="h-4 w-4" /> },
              ]
            ).map(({ ref, fileType, label, icon }) => {
              const job = enrichJobs.find(j => j.fileType === fileType);
              const isActive = job && job.status !== 'idle';
              return (
                <div key={fileType} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <input
                    ref={ref}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleEnrichFileSelect(f, fileType, label);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium truncate">
                      {icon}
                      <span className="truncate">{job ? job.file.name : label}</span>
                    </div>
                    {job ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground"
                        onClick={() => setEnrichJobs(prev => prev.filter(j => j.fileType !== fileType))}
                        disabled={isActive}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs shrink-0 gap-1" onClick={() => ref.current?.click()}>
                        <Upload className="h-3 w-3" /> Choisir
                      </Button>
                    )}
                  </div>

                  {job && (
                    <div className="space-y-1.5">
                      {/* File size */}
                      <p className="text-xs text-muted-foreground">{formatFileSize(job.file.size)}</p>

                      {/* Status badge */}
                      <div className="flex items-center gap-1.5">
                        {job.status === 'idle' && <Badge variant="secondary" className="text-xs">En attente</Badge>}
                        {job.status === 'compressing' && (
                          <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300">
                            <Loader2 className="h-3 w-3 animate-spin" /> Compression...
                          </Badge>
                        )}
                        {job.status === 'uploading' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Upload...
                          </Badge>
                        )}
                        {job.status === 'processing' && (
                          <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/50">
                            <Loader2 className="h-3 w-3 animate-spin" /> Traitement serveur...
                          </Badge>
                        )}
                        {job.status === 'done' && (
                          <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                            <CheckCircle2 className="h-3 w-3" /> Terminé
                          </Badge>
                        )}
                        {job.status === 'error' && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" /> Erreur
                          </Badge>
                        )}
                      </div>

                      {/* Progress bar (uploading via TUS) */}
                      {job.status === 'uploading' && (
                        <div className="space-y-0.5">
                          <Progress value={job.uploadProgress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            Upload {job.uploadProgress}%
                          </p>
                        </div>
                      )}

                      {/* Progress bar (processing) */}
                      {job.status === 'processing' && job.totalRows > 0 && (
                        <div className="space-y-0.5">
                          <Progress
                            value={Math.round((job.processedRows / job.totalRows) * 100)}
                            className="h-1.5"
                          />
                          <p className="text-xs text-muted-foreground">
                            {job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()} produits
                          </p>
                        </div>
                      )}

                      {/* Result summary */}
                      {job.status === 'done' && job.result && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            {(() => {
                              const r = job.result;
                              const parts: string[] = [];
                              if (r.updated) parts.push(`${r.updated} mis à jour`);
                              if (r.created) parts.push(`${r.created} créés`);
                              if (r.skipped) parts.push(`${r.skipped} ignorés`);
                              if (r.images_synced) parts.push(`${r.images_synced} images`);
                              return parts.join(' · ');
                            })()}
                            {job.result.truncated && (
                              <span className="ml-1 text-warning-foreground">⚠️ fichier tronqué</span>
                            )}
                          </div>
                          {job.result.skip_reasons && (job.result.skipped ?? 0) > 0 && (
                            <details className="cursor-pointer">
                              <summary className="text-orange-600 hover:text-orange-700 select-none">
                                ⚠️ Détail des {job.result.skipped} ignorés
                              </summary>
                              <div className="mt-1 ml-2 space-y-1 text-[11px]">
                                {/* Multimedia */}
                                {job.result.skip_reasons.not_found > 0 && (
                                  <div>• <strong>{job.result.skip_reasons.not_found}</strong> références introuvables dans le catalogue</div>
                                )}
                                {job.result.skip_reasons.no_images > 0 && (
                                  <div>• <strong>{job.result.skip_reasons.no_images}</strong> produits sans image IMG active</div>
                                )}
                                {/* Descriptions */}
                                {job.result.skip_reasons.no_content > 0 && (
                                  <div>• <strong>{job.result.skip_reasons.no_content}</strong> produits sans aucun texte exploitable</div>
                                )}
                                {/* Relations */}
                                {job.result.skip_reasons.no_id > 0 && (
                                  <div>• <strong>{job.result.skip_reasons.no_id}</strong> produits sans identifiant</div>
                                )}
                                {job.result.skip_reasons.no_relations > 0 && (
                                  <div>• <strong>{job.result.skip_reasons.no_relations}</strong> produits sans relation associée</div>
                                )}
                                {/* Sample not found (Descriptions + Multimedia) */}
                                {(job.result.sample_not_found?.length ?? 0) > 0 && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer select-none text-muted-foreground">
                                      Échantillon références non trouvées ({job.result.sample_not_found!.length} / {job.result.skip_reasons.not_found})
                                    </summary>
                                    <div className="mt-1 max-h-28 overflow-y-auto bg-muted rounded p-1 font-mono text-[10px] leading-relaxed break-all">
                                      {job.result.sample_not_found!.join(', ')}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {job.status === 'error' && job.errorMessage && (
                        <p className="text-xs text-destructive truncate" title={job.errorMessage}>{job.errorMessage}</p>
                      )}
                    </div>
                  )}

                  {/* Add button if no job */}
                  {!job && (
                    <p className="text-xs text-muted-foreground">Aucun fichier sélectionné</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Global action button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleEnrichAll}
              disabled={enrichJobs.filter(j => j.status === 'idle').length === 0}
              className="gap-2"
            >
              <CloudUpload className="h-4 w-4" />
              {enrichJobs.filter(j => j.status === 'idle').length > 0
                ? `Lancer l'enrichissement (${enrichJobs.filter(j => j.status === 'idle').length} fichier${enrichJobs.filter(j => j.status === 'idle').length > 1 ? 's' : ''})`
                : "Chargez au moins un fichier"}
            </Button>
            {enrichJobs.some(j => j.status === 'done' || j.status === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => setEnrichJobs(prev => prev.filter(j => j.status !== 'done' && j.status !== 'error'))}
              >
                <X className="h-3 w-3" /> Effacer terminés
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Le fichier est uploadé directement sur le serveur — le navigateur ne lit pas le contenu. 
            Le traitement se fait en arrière-plan, vous pouvez suivre l'avancement en temps réel.
          </p>
        </CardContent>
      </Card>


      {/* Coefficients de marge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coefficients de marge Liderpapel</CardTitle>
          <CardDescription>Définissez le coefficient multiplicateur par famille/sous-famille pour calculer le prix de vente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Famille *</label>
              <Input value={newFamily} onChange={e => setNewFamily(e.target.value)} placeholder="ex: Ecriture" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Sous-famille</label>
              <Input value={newSubfamily} onChange={e => setNewSubfamily(e.target.value)} placeholder="ex: Stylos (optionnel)" />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">Coefficient</label>
              <Input type="number" step="0.1" value={newCoeff} onChange={e => setNewCoeff(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1" onClick={handleAddCoeff} disabled={addCoefficient.isPending}>
              <Plus className="h-3 w-3" /> Ajouter
            </Button>
          </div>

          {coeffLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : coefficients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun coefficient défini. Le coefficient par défaut (2.0) sera appliqué.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Famille</TableHead>
                    <TableHead>Sous-famille</TableHead>
                    <TableHead>Coefficient</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coefficients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.family}</TableCell>
                      <TableCell className="text-muted-foreground">{c.subfamily || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">×{c.coefficient}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCoefficient.mutate(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Historique imports Liderpapel</CardTitle></CardHeader>
        <CardContent>
          <ImportLogsList logs={liderpapelLogs} emptyText="Aucun import Liderpapel encore effectué" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared components ───

function ImportResult({ result }: { result: ImportResultData }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        {result.errors === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="font-medium text-sm">Résultat de l'import</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div><span className="text-muted-foreground">Créés :</span> <strong>{result.created}</strong></div>
        <div><span className="text-muted-foreground">Modifiés :</span> <strong>{result.updated}</strong></div>
        <div><span className="text-muted-foreground">Ignorés :</span> <strong>{result.skipped}</strong></div>
        <div><span className="text-muted-foreground">Erreurs :</span> <strong className={result.errors > 0 ? 'text-destructive' : ''}>{result.errors}</strong></div>
        <div><span className="text-muted-foreground">Alertes :</span> <strong className={(result.warnings_count || 0) > 0 ? 'text-warning-foreground' : ''}>{result.warnings_count || 0}</strong></div>
      </div>
      {result.price_changes?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Changements de prix ({result.price_changes.length})</summary>
          <div className="mt-2 max-h-[200px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Réf</TableHead>
                  <TableHead className="text-xs">Ancien PA</TableHead>
                  <TableHead className="text-xs">Nouveau PA</TableHead>
                  <TableHead className="text-xs">Ancien TTC</TableHead>
                  <TableHead className="text-xs">Nouveau TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.price_changes.slice(0, 50).map((pc: PriceChange, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{pc.ref || pc.ean}</TableCell>
                    <TableCell className="text-xs">{pc.old_cost?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.new_cost?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.old_ttc?.toFixed(2) ?? '—'} €</TableCell>
                    <TableCell className="text-xs">{pc.new_ttc?.toFixed(2) ?? '—'} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
      {result.details?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Voir les erreurs ({result.details.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {result.details.map((d: string, i: number) => <li key={i}>• {d}</li>)}
          </ul>
        </details>
      )}
      {result.warnings?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Alertes techniques ({result.warnings.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {result.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

function ImportLogsList({ logs, emptyText }: { logs: ImportLog[]; emptyText: string }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {logs.slice(0, 10).map(log => (
        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
          <span className="text-muted-foreground">
            {new Date(log.imported_at || '').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-primary text-xs">✓ {log.success_count}</span>
            {(log.error_count || 0) > 0 && <span className="text-destructive text-xs">✗ {log.error_count}</span>}
            <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
          </div>
        </div>
      ))}
    </div>
  );
}
