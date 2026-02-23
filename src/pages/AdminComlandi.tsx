import { useState, useRef, useCallback, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Eye, Plus, Trash2, Download, Server, Wifi, WifiOff, Lock, ImageIcon, FileText, Link2, RefreshCw, CloudUpload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { useLiderpapelCoefficients } from "@/hooks/useLiderpapelCoefficients";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import * as tus from "tus-js-client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Gzip-compress a File/Blob using the browser's native CompressionStream API.
// JSON compresses ~10:1, so a 90 MB file becomes ~9 MB — bypasses Supabase's
// 50 MB global storage limit on free-tier projects.
async function compressJsonFile(file: File): Promise<Blob> {
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return new Blob(chunks, { type: 'application/gzip' });
}

// Upload via TUS protocol (chunked — supports files > 500 MB, bypass HTTP body limit)
function tusUpload(
  blob: File | Blob,
  storagePath: string,
  onProgress: (pct: number) => void,
  authToken: string,
  isGzipped = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${authToken}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "liderpapel-enrichment",
        objectName: storagePath,
        contentType: isGzipped ? "application/gzip" : "application/json",
        cacheControl: "3600",
      },
      // 5 MB — must be a multiple of 256 KB (Supabase requirement)
      chunkSize: 5 * 1024 * 1024,
      onError: (err) => reject(new Error(String(err))),
      onProgress: (uploaded, total) => {
        if (total > 0) onProgress(Math.round((uploaded / total) * 100));
      },
      onSuccess: () => resolve(),
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

// CSV header → internal key (semicolon-separated) — Comlandi mapping
const COLUMN_MAP: Record<string, string> = {
  "code": "code",
  "référence": "reference",
  "reference": "reference",
  "catégorie": "categorie",
  "categorie": "categorie",
  "sous-catégorie": "sous_categorie",
  "sous-categorie": "sous_categorie",
  "description": "description",
  "prix": "prix",
  "tarif": "tarif",
  "pvp conseillé": "pvp_conseille",
  "pvp conseille": "pvp_conseille",
  "tva": "tva",
  "taxe cop": "taxe_cop",
  "taxe d3e": "taxe_d3e",
  "taxe mob": "taxe_mob",
  "taxe scm": "taxe_scm",
  "taxe sod": "taxe_sod",
  "page gpa": "_page_gpa",
  "page cat. scolaire": "_page_scolaire",
  "umv": "umv",
  "uve": "uve",
  "env": "env",
  "emb": "emb",
  "palette": "palette",
  "ean umv": "ean_umv",
  "ean unité": "ean_unite",
  "ean unite": "ean_unite",
  "ean uve": "ean_uve",
  "ean env": "ean_env",
  "ean emb": "ean_emb",
  "ean palette": "ean_palette",
  "indisponible depuis le": "indisponible",
  "brève description (60 caractères maximum)": "description_breve",
  "breve description": "description_breve",
  "longue description": "description_longue",
  "marque": "marque",
  "poids umv (gr)": "poids_umv",
  "poids umv": "poids_umv",
  "poids uve (gr)": "poids_uve",
  "poids uve": "poids_uve",
  "poids env (gr)": "poids_env",
  "poids env": "poids_env",
  "poids emb (gr)": "poids_emb",
  "poids emb": "poids_emb",
  "umv dim": "umv_dim",
  "env dim": "env_dim",
  "emb dim": "emb_dim",
  "palette dim": "palette_dim",
  "code douane": "code_douane",
  "pays d'origine": "pays_origine",
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/["\t]/g, "")
    .trim();
}

interface ParsedData {
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
  mappedHeaders: { original: string; mapped: string }[];
  unmappedHeaders: string[];
}

export default function AdminComlandi() {
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [backfillDryRun, setBackfillDryRun] = useState(false);

  const handleBackfill = useCallback(async (dryRun: boolean) => {
    setBackfillLoading(true);
    setBackfillResult(null);
    setBackfillDryRun(dryRun);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-supplier-products', {
        body: { dry_run: dryRun, sources: ['liderpapel', 'comlandi'] },
      });
      if (error) throw error;
      setBackfillResult(data);
      if (dryRun) {
        toast.info(`Simulation : ${data.stats?.inserted ?? 0} entrées seraient créées sur ${data.stats?.total_products_scanned ?? 0} produits scannés`);
      } else {
        toast.success(`Rétroaction terminée : ${data.stats?.inserted ?? 0} entrées créées dans supplier_products`);
      }
    } catch (err: any) {
      toast.error("Erreur rétroaction", { description: err.message });
    } finally {
      setBackfillLoading(false);
    }
  }, []);

  return (
    <AdminLayout title="Import COMLANDI / LIDERPAPEL" description="CS Group (Comlandi / Liderpapel) — un seul fournisseur, deux formats d'import">
      <div className="space-y-6">
        {/* ─── Info fournisseur unifié ─── */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm flex gap-3 items-start">
          <div className="text-primary mt-0.5">ℹ️</div>
          <div>
            <strong>Comlandi et Liderpapel sont le même fournisseur</strong> — CS Group S.A. opère sous ces deux marques.
            Tous les produits sont liés à un seul fournisseur <code className="text-xs bg-muted px-1 rounded">CS Group (Comlandi / Liderpapel)</code> dans la base.
          </div>
        </div>

        {/* ─── Rétroaction supplier_products ─── */}
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <RefreshCw className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Rétroaction — Liaison fournisseur CS Group</CardTitle>
                <CardDescription>
                  Crée les entrées manquantes dans <code className="text-xs bg-muted px-1 rounded">supplier_products</code> pour les produits déjà importés
                  (Comlandi CSV + Liderpapel JSON). Les deux sources sont fusionnées vers le fournisseur unique CS Group.
                  À exécuter après chaque import pour maintenir la liaison fournisseur à jour.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleBackfill(true)}
                disabled={backfillLoading}
              >
                {backfillLoading && backfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Simuler (dry-run)
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => handleBackfill(false)}
                disabled={backfillLoading}
              >
                {backfillLoading && !backfillDryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {backfillLoading && !backfillDryRun ? "Rétroaction en cours..." : "Lancer la rétroaction"}
              </Button>
            </div>

            {backfillResult && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">{backfillResult.stats?.dry_run ? 'Résultat simulation' : 'Résultat rétroaction'}</span>
                  {backfillResult.stats?.dry_run && <Badge variant="secondary">dry-run</Badge>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><span className="text-muted-foreground">Produits scannés :</span> <strong>{backfillResult.stats?.total_products_scanned ?? 0}</strong></div>
                  <div><span className="text-muted-foreground">{backfillResult.stats?.dry_run ? 'À créer' : 'Créés'} :</span> <strong className="text-primary">{backfillResult.stats?.inserted ?? 0}</strong></div>
                  <div><span className="text-muted-foreground">Déjà liés :</span> <strong>{backfillResult.stats?.already_linked ?? 0}</strong></div>
                  <div><span className="text-muted-foreground">Erreurs :</span> <strong className={backfillResult.stats?.errors > 0 ? 'text-destructive' : ''}>{backfillResult.stats?.errors ?? 0}</strong></div>
                </div>
                {backfillResult.stats?.skipped_no_supplier > 0 && (
                  <p className="text-xs text-muted-foreground">⚠️ {backfillResult.stats.skipped_no_supplier} produits ignorés : fournisseur introuvable dans la table suppliers</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

// ─── Comlandi Tab (original logic, unchanged) ───

function ComlandiTab() {
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'enrich'>('create');
  const fileRef = useRef<HTMLInputElement>(null);
  const { logs, refetch: refetchLogs } = useImportLogs();

  const comlandiLogs = logs.filter(l => l.format === 'comlandi-catalogue');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rawData: Record<string, any>[];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { toast.error("Fichier vide"); return; }

        const headerLine = lines[0].replace(/^\uFEFF/, '');
        const rawHeaders = headerLine.split(';').map(h => h.trim());

        rawData = lines.slice(1).map(line => {
          const vals = line.split(';');
          const obj: Record<string, string> = {};
          rawHeaders.forEach((h, idx) => { obj[h] = vals[idx]?.trim() || ''; });
          return obj;
        });
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      }

      if (rawData.length === 0) { toast.error("Fichier vide ou format non reconnu"); return; }

      const rawHeaders = Object.keys(rawData[0]);
      const headerMap: Record<string, string> = {};
      const mappedHeaders: { original: string; mapped: string }[] = [];
      const unmappedHeaders: string[] = [];

      for (const rh of rawHeaders) {
        const normalized = normalizeHeader(rh);
        let found = false;
        for (const [pattern, key] of Object.entries(COLUMN_MAP)) {
          if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern))) {
            headerMap[rh] = key;
            if (!key.startsWith('_')) {
              mappedHeaders.push({ original: rh, mapped: key });
            }
            found = true;
            break;
          }
        }
        if (!found) {
          unmappedHeaders.push(rh);
        }
      }

      const mappedRows = rawData.map(row => {
        const mapped: Record<string, string> = {};
        for (const [origHeader, value] of Object.entries(row)) {
          const key = headerMap[origHeader];
          if (key && !key.startsWith('_')) {
            mapped[key] = String(value || '').trim();
          }
        }
        return mapped;
      });

      const mappedHeaderKeys = [...new Set(Object.values(headerMap).filter(k => !k.startsWith('_')))];

      setParsed({ rows: mappedRows, headers: mappedHeaderKeys, totalRows: mappedRows.length, mappedHeaders, unmappedHeaders });
      setResult(null);

      if (unmappedHeaders.length > 0) {
        toast.warning(`${unmappedHeaders.length} colonne(s) non reconnue(s)`, {
          description: `Ignorées : ${unmappedHeaders.slice(0, 5).join(', ')}${unmappedHeaders.length > 5 ? '…' : ''}`,
        });
      } else {
        toast.success(`${mappedRows.length} lignes analysées`, { description: `${mappedHeaderKeys.length} colonnes mappées` });
      }
    } catch (err: any) {
      toast.error("Erreur lecture fichier", { description: err.message });
    }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setResult(null);

    try {
      const BATCH = 500;
      const totals = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[] };
      const totalBatches = Math.ceil(parsed.rows.length / BATCH);

      for (let i = 0; i < parsed.rows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setProgress(`Batch ${batchNum}/${totalBatches}...`);
        const batch = parsed.rows.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke('import-comlandi', {
          body: { rows: batch, mode },
        });
        if (error) throw error;
        totals.created += data.created || 0;
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.details.push(...(data.details || []));
      }

      setResult(totals);
      if (totals.errors > 0) {
        toast.warning(`Import terminé avec ${totals.errors} erreurs`);
      } else {
        toast.success(`Import terminé : ${totals.created} créés, ${totals.updated} enrichis`);
      }
      refetchLogs();
    } catch (err: any) {
      toast.error("Erreur import", { description: err.message });
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  const previewCols = ['code', 'reference', 'ean_unite', 'description', 'categorie', 'prix', 'marque'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Tarifs B2B COMLANDI</CardTitle>
              <CardDescription>Catalogue COMLANDI avec prix, taxes, EAN et conditionnements — CSV (;) ou XLS</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" /> Charger un fichier CSV / XLS
            </Button>
            {parsed && (
              <Badge variant="secondary" className="gap-1">
                <Eye className="h-3 w-3" /> {parsed.totalRows} articles détectés
              </Badge>
            )}
          </div>

          {parsed && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setMode('create')}>Créer + Enrichir</Button>
                <Button variant={mode === 'enrich' ? 'default' : 'outline'} size="sm" onClick={() => setMode('enrich')}>Enrichir uniquement (par EAN)</Button>
              </div>

              {/* Rapport de mapping des colonnes */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Rapport de mapping — {parsed.mappedHeaders.length} colonne(s) reconnue(s) / {parsed.mappedHeaders.length + parsed.unmappedHeaders.length} total
                </div>
                <div className="flex flex-wrap gap-1">
                  {parsed.mappedHeaders.map(({ original, mapped }) => (
                    <Badge key={original} variant="secondary" className="text-xs gap-1">
                      <span className="text-muted-foreground">{original}</span>
                      <span>→</span>
                      <span className="font-mono text-primary">{mapped}</span>
                    </Badge>
                  ))}
                </div>
                {parsed.unmappedHeaders.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                      <AlertCircle className="h-3 w-3" />
                      {parsed.unmappedHeaders.length} colonne(s) ignorée(s) (non reconnues)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parsed.unmappedHeaders.map(h => (
                        <Badge key={h} variant="destructive" className="text-xs opacity-80">{h}</Badge>
                      ))}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Ces colonnes ne correspondent à aucun pattern dans COLUMN_MAP. Si une colonne importante est ignorée (ex: "Prix d'achat"), ajoutez son alias dans le mapping.
                    </p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>{previewCols.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {previewCols.map(h => <TableCell key={h} className="text-xs max-w-[200px] truncate">{row[h] || '—'}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">Aperçu des 10 premières lignes sur {parsed.totalRows}</p>
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? `Import en cours... ${progress}` : `Importer ${parsed.totalRows} articles (${mode === 'create' ? 'créer + enrichir' : 'enrichir uniquement'})`}
              </Button>
            </div>
          )}

          {result && !importing && <ImportResult result={result} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Historique imports COMLANDI</CardTitle></CardHeader>
        <CardContent>
          <ImportLogsList logs={comlandiLogs} emptyText="Aucun import COMLANDI encore effectué" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Types for enrichment jobs ───

interface EnrichJob {
  id: string;
  file: File;
  fileType: 'descriptions_json' | 'multimedia_json' | 'relations_json';
  label: string;
  status: 'idle' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error';
  uploadProgress: number;
  processedRows: number;
  totalRows: number;
  result: any;
  errorMessage?: string;
  jobId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Liderpapel Tab ───

function LiderpapelTab() {
  const [sftpLoading, setSftpLoading] = useState<'daily' | 'enrich' | 'full' | null>(null);
  const [sftpResult, setSftpResult] = useState<any>(null);
  const [lastSync, setLastSync] = useState<any>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [auxLoading, setAuxLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [auxResult, setAuxResult] = useState<any>(null);

  // Load last sync status on mount
  useEffect(() => {
    supabase
      .from('cron_job_logs')
      .select('*')
      .eq('job_name', 'sync-liderpapel-sftp')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setLastSync(data); });
  }, [sftpLoading]);

  const handleSftpSync = useCallback(async (mode: 'daily' | 'enrich' | 'full') => {
    setSftpLoading(mode);
    setSftpResult(null);
    try {
      const body =
        mode === 'daily' ? { includeEnrichment: false } :
        mode === 'enrich' ? { includeEnrichment: true, enrichmentOnly: true } :
        { includeEnrichment: true };
      const { data, error } = await supabase.functions.invoke('sync-liderpapel-sftp', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSftpResult(data);
      if (data?.errors?.length > 0) {
        toast.warning(`Sync SFTP partielle`, {
          description: `${data.errors.length} erreur(s)`,
        });
      } else {
        const desc = mode === 'enrich'
          ? `Enrichissement lancé en arrière-plan`
          : `${data.daily?.created || 0} créés, ${data.daily?.updated || 0} modifiés`;
        toast.success(`Sync SFTP terminée`, { description: desc });
      }
    } catch (err: any) {
      toast.error("Erreur sync SFTP", { description: err.message });
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
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval);
    };
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<EnrichJob>) => {
    setEnrichJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
  }, []);

  const startPolling = useCallback((localJobId: string, remoteJobId: string) => {
    if (pollingRefs.current[localJobId]) clearInterval(pollingRefs.current[localJobId]);

    const pollStart = Date.now();
    const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 min — job stuck in uploading/pending

    pollingRefs.current[localJobId] = setInterval(async () => {
      const { data: job } = await supabase
        .from('enrich_import_jobs')
        .select('*')
        .eq('id', remoteJobId)
        .single();

      if (!job) return;

      // Detect stuck job: if still in a pre-processing state after 5 min,
      // the Edge Function was likely never triggered (complete network failure).
      if (
        (job.status === 'uploading' || job.status === 'pending') &&
        Date.now() - pollStart > STUCK_TIMEOUT_MS
      ) {
        clearInterval(pollingRefs.current[localJobId]);
        delete pollingRefs.current[localJobId];
        const msg = "La fonction de traitement n'a pas démarré (timeout 5 min). Réessayez.";
        updateJob(localJobId, { status: 'error', errorMessage: msg });
        await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', remoteJobId);
        toast.error('Enrichissement échoué', { description: msg });
        return;
      }

      updateJob(localJobId, {
        processedRows: job.processed_rows || 0,
        totalRows: job.total_rows || 0,
        status: job.status as EnrichJob['status'],
        result: job.result,
        errorMessage: job.error_message || undefined,
      });

      if (job.status === 'done' || job.status === 'error') {
        clearInterval(pollingRefs.current[localJobId]);
        delete pollingRefs.current[localJobId];

        if (job.status === 'done') {
          const r = (job.result as any) || {};
          toast.success(`Enrichissement terminé`, {
            description: `${r.updated || 0} mis à jour, ${r.created || 0} créés, ${r.skipped || 0} ignorés`,
          });
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
        console.log(`[enrich] Compressed ${job.file.name}: ${job.file.size} → ${uploadBlob.size} bytes`);
      } catch (cErr: any) {
        // Compression failed — fall back to uncompressed upload
        console.warn('[enrich] Compression failed, uploading raw:', cErr.message);
        uploadBlob = job.file;
        isGzipped = false;
      }
      updateJob(job.id, { status: 'uploading' });
    }

    try {
      await tusUpload(uploadBlob, storagePath, (pct) => {
        updateJob(job.id, { uploadProgress: pct });
      }, authToken, isGzipped);
    } catch (err: any) {
      const msg = err?.message || String(err);
      updateJob(job.id, { status: 'error', errorMessage: msg });
      await supabase.from('enrich_import_jobs').update({ status: 'error', error_message: msg }).eq('id', dbJob.id);
      return;
    }

    updateJob(job.id, { status: 'processing', uploadProgress: 100 });

    // 3. Trigger edge function (fire & forget — returns 200 in < 1s via waitUntil)
    // Any network/gateway error (FunctionsFetchError, "Failed to fetch", "Load failed",
    // relay timeout…) is treated as "function started but connection dropped" — we always
    // fall through to polling. The DB (enrich_import_jobs) is the source of truth.
    supabase.functions.invoke('process-enrich-file', {
      body: { storagePath, fileType: job.fileType, jobId: dbJob.id },
    }).then(({ error: fnError }) => {
      if (fnError) {
        console.warn('[enrich] invoke process-enrich-file error (polling anyway):', fnError.message);
      }
    }).catch((e: any) => {
      console.warn('[enrich] invoke process-enrich-file threw (polling anyway):', e?.message);
    });

    // 4. Start polling immediately — don't wait for the invoke response
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
        let catalogProducts: any[] = [];
        let pricesProducts: any[] = [];
        let stockProducts: any[] = [];

        const extractProducts = (json: any, containerKey: string) => {
          const root = json?.root || json;
          // Handle nested array structure: root > Products > [{ Product: [...] }]
          const container = root?.[containerKey] || root?.[containerKey.toLowerCase()] || root;
          if (Array.isArray(container)) {
            // root.Products is an array of { Product: [...] }
            const allProducts: any[] = [];
            for (const item of container) {
              const prods = item?.Product || item?.product || [];
              const prodList = Array.isArray(prods) ? prods : [prods];
              allProducts.push(...prodList);
            }
            return allProducts;
          }
          const products = container?.Product || container?.product || [];
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
          const json = JSON.parse(await stockFile.text());
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
        const totals = { created: 0, updated: 0, skipped: 0, errors: 0, details: [] as string[], price_changes: [] as any[] };

        for (let i = 0; i < maxLen; i += BATCH) {
          const body: Record<string, any> = {};
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
        }

        setResult({ ...totals, format: 'json', catalog_count: catalogProducts.length, prices_count: pricesProducts.length, stock_count: stockProducts.length, merged_total: maxLen });
        toast.success(`Import terminé (json) : ${totals.created} créés, ${totals.updated} modifiés`);
        refetchLogs();
      } else {
        // CSV: send as-is (usually smaller)
        const body: Record<string, any> = {};
        if (catalogFile) body.catalog_csv = await catalogFile.text();
        if (pricesFile) body.prices_csv = await pricesFile.text();
        if (stockFile) body.stock_csv = await stockFile.text();
        const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
        if (error) throw error;
        setResult(data);
        toast.success(`Import terminé (csv) : ${data.created} créés, ${data.updated} modifiés`);
        refetchLogs();
      }
    } catch (err: any) {
      toast.error("Erreur import", { description: err.message });
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
      const body: Record<string, any> = {};
      if (categoriesFile) body.categories_json = await categoriesFile.text();
      if (deliveryFile) body.delivery_orders_json = await deliveryFile.text();
      if (accountFile) body.my_account_json = await accountFile.text();
      const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
      if (error) throw error;
      setAuxResult(data);
      const parts = [];
      if (data.categories) parts.push(`${data.categories.total} catégories`);
      if (data.delivery_orders) parts.push(`${data.delivery_orders.total} BL`);
      if (data.my_account) parts.push(`Compte: ${data.my_account.name}`);
      toast.success(`Import auxiliaire terminé : ${parts.join(', ')}`);
    } catch (err: any) {
      toast.error("Erreur import", { description: err.message });
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
              onClick={() => handleSftpSync('daily')}
              disabled={sftpLoading !== null}
            >
              {sftpLoading === 'daily' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {sftpLoading === 'daily' ? "Synchronisation..." : "Catalog + Prix + Stock"}
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => handleSftpSync('enrich')}
              disabled={sftpLoading !== null}
            >
              {sftpLoading === 'enrich' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {sftpLoading === 'enrich' ? "Enrichissement..." : "Enrichissement seul"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleSftpSync('full')}
              disabled={sftpLoading !== null}
            >
              {sftpLoading === 'full' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
              {sftpLoading === 'full' ? "Sync complète..." : "Complète + Enrichissement"}
            </Button>
          </div>

          {sftpResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {(sftpResult.errors?.length || 0) === 0
                  ? <CheckCircle2 className="h-4 w-4 text-primary" />
                  : <AlertCircle className="h-4 w-4 text-warning" />}
                <span className="font-medium">Résultat synchronisation</span>
                {sftpResult.duration_ms && (
                  <Badge variant="secondary" className="text-xs">{(sftpResult.duration_ms / 1000).toFixed(1)}s</Badge>
                )}
              </div>
              {sftpResult.daily && (
                <div className="grid grid-cols-4 gap-3">
                  <div><span className="text-muted-foreground">Créés :</span> <strong>{sftpResult.daily.created || 0}</strong></div>
                  <div><span className="text-muted-foreground">Modifiés :</span> <strong>{sftpResult.daily.updated || 0}</strong></div>
                  <div><span className="text-muted-foreground">Ignorés :</span> <strong>{sftpResult.daily.skipped || 0}</strong></div>
                  <div><span className="text-muted-foreground">Erreurs :</span> <strong className={sftpResult.daily.errors > 0 ? 'text-destructive' : ''}>{sftpResult.daily.errors || 0}</strong></div>
                </div>
              )}
              {sftpResult.errors?.length > 0 && (
                <div className="text-xs text-destructive space-y-0.5">
                  {sftpResult.errors.map((e: string, i: number) => <p key={i}>- {e}</p>)}
                </div>
              )}
              {Object.keys(sftpResult.enrichment || {}).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Enrichissement lancé en arrière-plan : {Object.keys(sftpResult.enrichment).join(', ')}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Les identifiants SFTP sont stockés dans les secrets Supabase (LIDERPAPEL_SFTP_USER, LIDERPAPEL_SFTP_PASSWORD).
            L'import manuel ci-dessous reste disponible si le SFTP n'est pas configuré.
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
                            {auxResult.delivery_orders.orders.map((o: any, i: number) => (
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
                      {auxResult.my_account.addresses.map((a: any, i: number) => (
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
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const r = job.result as any;
                            const parts = [];
                            if (r.updated) parts.push(`${r.updated} mis à jour`);
                            if (r.created) parts.push(`${r.created} créés`);
                            if (r.skipped) parts.push(`${r.skipped} ignorés`);
                            return parts.join(' · ');
                          })()}
                          {(job.result as any)?.truncated && (
                            <span className="ml-1 text-warning-foreground">⚠️ fichier tronqué</span>
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

function ImportResult({ result }: { result: any }) {
  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        {result.errors === 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="font-medium text-sm">Résultat de l'import</span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div><span className="text-muted-foreground">Créés :</span> <strong>{result.created}</strong></div>
        <div><span className="text-muted-foreground">Modifiés :</span> <strong>{result.updated}</strong></div>
        <div><span className="text-muted-foreground">Ignorés :</span> <strong>{result.skipped}</strong></div>
        <div><span className="text-muted-foreground">Erreurs :</span> <strong className={result.errors > 0 ? 'text-destructive' : ''}>{result.errors}</strong></div>
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
                {result.price_changes.slice(0, 50).map((pc: any, i: number) => (
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
    </div>
  );
}

function ImportLogsList({ logs, emptyText }: { logs: any[]; emptyText: string }) {
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
