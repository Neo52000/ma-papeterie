import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Eye, Plus, Trash2, Download, Server, Wifi, WifiOff, Lock, ImageIcon, FileText, Link2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { useLiderpapelCoefficients } from "@/hooks/useLiderpapelCoefficients";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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
    <AdminLayout title="Import COMLANDI / LIDERPAPEL" description="Gestion des imports fournisseurs COMLANDI et LIDERPAPEL">
      <div className="space-y-6">
        {/* ─── Rétroaction supplier_products ─── */}
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <RefreshCw className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Rétroaction — Liaison fournisseurs (supplier_products)</CardTitle>
                <CardDescription>
                  Crée les entrées manquantes dans <code className="text-xs bg-muted px-1 rounded">supplier_products</code> pour les produits déjà importés
                  (Liderpapel + Comlandi). À exécuter une seule fois pour le stock existant.
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

// ─── Liderpapel Tab ───

function LiderpapelTab() {
  const [manualLoading, setManualLoading] = useState(false);
  const [auxLoading, setAuxLoading] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichProgressText, setEnrichProgressText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [auxResult, setAuxResult] = useState<any>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);
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
  const [descriptionsFile, setDescriptionsFile] = useState<File | null>(null);
  const [multimediaFile, setMultimediaFile] = useState<File | null>(null);
  const [relationsFile, setRelationsFile] = useState<File | null>(null);

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

  // Helper: extract products from large JSON, parse client-side
  const extractProducts = (json: any): any[] => {
    const root = json?.root || json;
    const container = root?.Products || root?.products || root;
    const products = container?.Product || container?.product || [];
    return Array.isArray(products) ? products : products ? [products] : [];
  };

  const handleEnrichImport = async () => {
    if (!descriptionsFile && !multimediaFile && !relationsFile) {
      toast.error("Veuillez charger au moins un fichier d'enrichissement");
      return;
    }
    setEnrichLoading(true);
    setEnrichResult(null);
    setEnrichProgress(0);
    setEnrichProgressText("Lecture des fichiers...");

    try {
      const BATCH = 500;
      const aggregated: Record<string, any> = {};

      // Process each file type with batching
      const filesToProcess: Array<{ file: File; key: string; label: string }> = [];
      if (descriptionsFile) filesToProcess.push({ file: descriptionsFile, key: 'descriptions_json', label: 'Descriptions' });
      if (multimediaFile) filesToProcess.push({ file: multimediaFile, key: 'multimedia_json', label: 'MultimediaLinks' });
      if (relationsFile) filesToProcess.push({ file: relationsFile, key: 'relations_json', label: 'RelationedProducts' });

      let totalBatches = 0;
      let completedBatches = 0;

      // Pre-count total batches
      const parsedFiles: Array<{ key: string; label: string; products: any[] }> = [];
      for (const { file, key, label } of filesToProcess) {
        setEnrichProgressText(`Parsing ${label}...`);
        const text = await file.text();
        const json = JSON.parse(text);
        const products = extractProducts(json);
        parsedFiles.push({ key, label, products });
        totalBatches += Math.ceil(products.length / BATCH);
      }

      // Send batches
      for (const { key, label, products } of parsedFiles) {
        const batchCount = Math.ceil(products.length / BATCH);
        const resultKey = key.replace('_json', '').replace('descriptions', 'descriptions').replace('multimedia', 'multimedia').replace('relations', 'relations');

        for (let i = 0; i < products.length; i += BATCH) {
          const batchNum = Math.floor(i / BATCH) + 1;
          completedBatches++;
          setEnrichProgressText(`${label} — batch ${batchNum}/${batchCount}`);
          setEnrichProgress(Math.round((completedBatches / totalBatches) * 100));

          const batch = products.slice(i, i + BATCH);
          const body: Record<string, any> = {};
          body[key] = { Products: { Product: batch } };

          const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
          if (error) throw error;

          // Aggregate results
          for (const [rk, rv] of Object.entries(data || {})) {
            if (!aggregated[rk]) {
              aggregated[rk] = { ...(rv as any) };
            } else {
              const existing = aggregated[rk];
              const incoming = rv as any;
              existing.total = (existing.total || 0) + (incoming.total || 0);
              existing.updated = (existing.updated || 0) + (incoming.updated || 0);
              existing.created = (existing.created || 0) + (incoming.created || 0);
              existing.skipped = (existing.skipped || 0) + (incoming.skipped || 0);
              existing.errors = (existing.errors || 0) + (incoming.errors || 0);
            }
          }
        }
      }

      setEnrichProgress(100);
      setEnrichProgressText("Terminé !");
      setEnrichResult(aggregated);
      
      const parts = [];
      if (aggregated.descriptions) parts.push(`${aggregated.descriptions.updated} descriptions`);
      if (aggregated.multimedia) parts.push(`${aggregated.multimedia.created} images`);
      if (aggregated.relations) parts.push(`${aggregated.relations.created} relations`);
      toast.success(`Enrichissement terminé : ${parts.join(', ')}`);
    } catch (err: any) {
      toast.error("Erreur enrichissement", { description: err.message });
    } finally {
      setEnrichLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connexion SFTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Connexion SFTP Liderpapel</CardTitle>
              <CardDescription>Paramètres de connexion au serveur de fichiers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                <p className="text-xs text-muted-foreground">Port</p>
                <p className="text-sm font-medium font-mono">22</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium text-amber-600">Manuel uniquement</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⚠️ La connexion SFTP directe n'est pas disponible dans l'environnement Edge Functions. 
            Téléchargez les fichiers JSON depuis le serveur SFTP via un client (FileZilla, WinSCP...) puis importez-les ci-dessous.
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

      {/* Enrichissement produits (Descriptions, Images, Relations) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Enrichissement produits</CardTitle>
              <CardDescription>Descriptions, images et relations produits — fichiers volumineux avec parsing client et envoi par lots</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input ref={descriptionsRef} type="file" accept=".json" className="hidden" onChange={e => setDescriptionsFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => descriptionsRef.current?.click()} disabled={enrichLoading}>
                <FileText className="h-3 w-3" /> {descriptionsFile ? descriptionsFile.name : "Descriptions_fr.json"}
              </Button>
            </div>
            <div>
              <input ref={multimediaRef} type="file" accept=".json" className="hidden" onChange={e => setMultimediaFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => multimediaRef.current?.click()} disabled={enrichLoading}>
                <ImageIcon className="h-3 w-3" /> {multimediaFile ? multimediaFile.name : "MultimediaLinks_fr.json"}
              </Button>
            </div>
            <div>
              <input ref={relationsRef} type="file" accept=".json" className="hidden" onChange={e => setRelationsFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => relationsRef.current?.click()} disabled={enrichLoading}>
                <Link2 className="h-3 w-3" /> {relationsFile ? relationsFile.name : "RelationedProducts_fr.json"}
              </Button>
            </div>
          </div>

          {enrichLoading && (
            <div className="space-y-2">
              <Progress value={enrichProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{enrichProgressText}</p>
            </div>
          )}

          <Button onClick={handleEnrichImport} disabled={enrichLoading || (!descriptionsFile && !multimediaFile && !relationsFile)} className="gap-2">
            {enrichLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {enrichLoading ? `Enrichissement... ${enrichProgress}%` : "Importer l'enrichissement"}
          </Button>

          {enrichResult && !enrichLoading && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Résultat enrichissement</span>
              </div>
              {enrichResult.descriptions && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Descriptions :</span>{" "}
                  <strong>{enrichResult.descriptions.updated}</strong> mises à jour,{" "}
                  <span className="text-muted-foreground">{enrichResult.descriptions.skipped} ignorés</span>
                  {enrichResult.descriptions.errors > 0 && <span className="text-destructive ml-2">{enrichResult.descriptions.errors} erreurs</span>}
                </div>
              )}
              {enrichResult.multimedia && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Images :</span>{" "}
                  <strong>{enrichResult.multimedia.created}</strong> ajoutées,{" "}
                  <span className="text-muted-foreground">{enrichResult.multimedia.skipped} ignorés</span>
                  {enrichResult.multimedia.errors > 0 && <span className="text-destructive ml-2">{enrichResult.multimedia.errors} erreurs</span>}
                </div>
              )}
              {enrichResult.relations && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Relations :</span>{" "}
                  <strong>{enrichResult.relations.created}</strong> créées,{" "}
                  <span className="text-muted-foreground">{enrichResult.relations.skipped} ignorés</span>
                  {enrichResult.relations.errors > 0 && <span className="text-destructive ml-2">{enrichResult.relations.errors} erreurs</span>}
                </div>
              )}
            </div>
          )}
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
