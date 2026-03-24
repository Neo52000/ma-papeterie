import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Eye, DollarSign, FlaskConical, ChevronDown, ChevronUp, Play, ClipboardList, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImportLogs } from "@/hooks/useImportLogs";
import { toast } from "sonner";
import { COLUMN_MAP, PRICE_COLUMN_MAP, PO_COLUMN_MAP } from "@/data/alkor-mappings";
import { normalizeHeader } from "@/lib/text-utils";
import { SyncB2BTab } from "@/components/admin/alkor/SyncB2BTab";

async function parseXlsx(file: ArrayBuffer, columnMap: Record<string, string>) {
  const { readExcel } = await import('@/lib/excel');
  const rawData = await readExcel(file) as Record<string, string>[];

  if (rawData.length === 0) return null;

  const rawHeaders = Object.keys(rawData[0]);
  const headerMap: Record<string, string> = {};
  for (const rh of rawHeaders) {
    const normalized = normalizeHeader(rh);
    for (const [pattern, key] of Object.entries(columnMap)) {
      if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern))) {
        headerMap[rh] = key;
        break;
      }
    }
  }

  const mappedRows = rawData.map(row => {
    const mapped: Record<string, string> = {};
    for (const [origHeader, value] of Object.entries(row)) {
      const key = headerMap[origHeader];
      if (key) mapped[key] = String(value || '').trim();
    }
    return mapped;
  });

  return { rows: mappedRows, headers: [...new Set(Object.values(headerMap))], totalRows: mappedRows.length };
}

interface ParsedData { rows: Record<string, string>[]; headers: string[]; totalRows: number; }

interface PurchaseOrderParsed {
  metadata: {
    orderRef: string;
    date: string;
    totalHt: string;
    client: string;
  };
  rows: Record<string, string>[];
  headers: string[];
  totalRows: number;
}

async function parsePurchaseOrderXlsx(file: ArrayBuffer): Promise<PurchaseOrderParsed | null> {
  const { readExcel } = await import('@/lib/excel');
  const rawData = await readExcel(file, { header: 'array' }) as (string | number | null)[][];

  if (rawData.length === 0) return null;

  // 1. Find header row: scan for row containing "Référence" AND "Désignation"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawData.length, 30); i++) {
    const row = rawData[i] as (string | number | null)[];
    const normalized = row.map(c => normalizeHeader(String(c ?? '')));
    const hasRef = normalized.some(c => c === 'reference' || c === 'ref');
    const hasDesig = normalized.some(c => c.includes('designation'));
    if (hasRef && hasDesig) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return null;

  // 2. Extract metadata from rows above header
  const metadata = { orderRef: '', date: '', totalHt: '', client: '' };
  for (let i = 0; i < headerRowIndex; i++) {
    const row = rawData[i] as (string | number | null)[];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim();
      const nextCell = j + 1 < row.length ? String(row[j + 1] ?? '').trim() : '';
      const norm = normalizeHeader(cell);
      if (norm.includes('reference commande') || norm.includes('ref commande'))
        metadata.orderRef = nextCell || cell.split(':').pop()?.trim() || '';
      if ((norm === 'date' || norm.includes('date commande')) && nextCell)
        metadata.date = nextCell;
      if (norm.includes('montant') && norm.includes('ht'))
        metadata.totalHt = nextCell || cell.split(':').pop()?.trim() || '';
      if (norm.includes('client') || norm.includes('raison sociale'))
        metadata.client = nextCell || cell.split(':').pop()?.trim() || '';
    }
  }

  // 3. Map headers using PO_COLUMN_MAP
  const rawHeaders = (rawData[headerRowIndex] as (string | number | null)[]).map(c => String(c ?? '').trim());
  const headerMap: Record<number, string> = {};
  for (let idx = 0; idx < rawHeaders.length; idx++) {
    const normalized = normalizeHeader(rawHeaders[idx]);
    if (!normalized) continue;
    for (const [pattern, key] of Object.entries(PO_COLUMN_MAP)) {
      if (normalized === normalizeHeader(pattern) || normalized.includes(normalizeHeader(pattern))) {
        headerMap[idx] = key;
        break;
      }
    }
  }

  // 4. Parse data rows
  const mappedRows: Record<string, string>[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i] as (string | number | null)[];
    const mapped: Record<string, string> = {};
    for (const [idxStr, key] of Object.entries(headerMap)) {
      const val = row[parseInt(idxStr)];
      mapped[key] = String(val ?? '').trim();
    }
    if (!mapped.ref_art?.trim()) continue;
    mappedRows.push(mapped);
  }

  if (mappedRows.length === 0) return null;

  return {
    metadata,
    rows: mappedRows,
    headers: [...new Set(Object.values(headerMap))],
    totalRows: mappedRows.length,
  };
}

// ─── Diagnostic queries ────────────────────────────────────────────────────────
const DIAGNOSTICS = [
  {
    id: 'pvp_comlandi',
    title: 'Test 1 — PVP_COMLANDI',
    description: 'COMLANDI remplit pvp_ttc → prix public = PVP_COMLANDI',
    query: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, public_price_ttc, public_price_source')
        .eq('public_price_source', 'PVP_COMLANDI')
        .limit(5);
      if (error) throw error;
      return { rows: data, expected: 'public_price_source = PVP_COMLANDI' };
    },
    expectedLabel: 'Attendu : lignes avec public_price_source = PVP_COMLANDI',
  },
  {
    id: 'price_distribution',
    title: 'Test 2 — Distribution des sources de prix',
    description: 'Répartition des sources PVP_ALKOR / PVP_COMLANDI / PVP_SOFT / COEF',
    query: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('public_price_source')
        .not('public_price_source', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data || []) {
        const src = r.public_price_source || 'null';
        counts[src] = (counts[src] || 0) + 1;
      }
      return { rows: Object.entries(counts).map(([source, count]) => ({ source, count })), expected: 'distribution' };
    },
    expectedLabel: 'Attendu : PVP_COMLANDI > PVP_SOFT > COEF si ALKOR sans prix',
  },
  {
    id: 'coef_count',
    title: 'Test 3 — Produits sans PVP (COEF)',
    description: 'Aucun PVP → calcul par coefficient',
    query: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('public_price_source', 'COEF');
      if (error) throw error;
      const { count: nullCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .is('public_price_source', null)
        .eq('is_active', true);
      return { rows: [{ source: 'COEF', count }, { source: 'Sans prix (null)', count: nullCount }], expected: 'count' };
    },
    expectedLabel: 'Attendu : COEF = produits sans PVP fournisseur ; null = produits sans offres',
  },
  {
    id: 'stock_availability',
    title: 'Test 4 — Cohérence stock/disponibilité',
    description: 'Stock > 0 sur n\'importe quel fournisseur → is_available = true',
    query: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, is_available, available_qty_total')
        .gt('available_qty_total', 0)
        .eq('is_available', false)
        .limit(10);
      if (error) throw error;
      return { rows: data, expected: '0 lignes = cohérence parfaite' };
    },
    expectedLabel: 'Attendu : 0 lignes (incohérence si résultats présents)',
  },
];

export default function AdminAlkor() {
  // ── Catalogue import state ──
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState<'create' | 'enrich'>('create');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Prix import state ──
  const [priceParsed, setPriceParsed] = useState<ParsedData | null>(null);
  const [priceImporting, setPriceImporting] = useState(false);
  const [priceProgress, setPriceProgress] = useState('');
  const [priceResult, setPriceResult] = useState<Record<string, unknown> | null>(null);
  const priceFileRef = useRef<HTMLInputElement>(null);

  // ── Bon de commande import state ──
  const [poParsed, setPoParsed] = useState<PurchaseOrderParsed | null>(null);
  const [poImporting, setPoImporting] = useState(false);
  const [poProgress, setPoProgress] = useState('');
  const [poResult, setPoResult] = useState<Record<string, unknown> | null>(null);
  const poFileRef = useRef<HTMLInputElement>(null);

  // ── Diagnostic state ──
  const [diagResults, setDiagResults] = useState<Record<string, { rows: Record<string, unknown>[]; expected: string } | null>>({});
  const [diagRunning, setDiagRunning] = useState<Record<string, boolean>>({});
  const [guideOpen, setGuideOpen] = useState(false);

  const { logs } = useImportLogs();
  const alkorLogs = logs.filter(l => l.format === 'alkor-catalogue');
  const alkorPriceLogs = logs.filter(l => l.format === 'alkor-prices');
  const alkorPoLogs = logs.filter(l => l.format === 'alkor-bon-commande');

  // ── Catalogue file select ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const data = await parseXlsx(buffer, COLUMN_MAP);
      if (!data) { toast.error("Fichier vide ou format non reconnu"); return; }
      setParsed(data);
      setResult(null);
      toast.success(`${data.totalRows} lignes analysées`, { description: `${data.headers.length} colonnes mappées` });
    } catch (err) {
      toast.error("Erreur lecture fichier", { description: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  };

  // ── Prix file select ──
  const handlePriceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const data = await parseXlsx(buffer, PRICE_COLUMN_MAP);
      if (!data) { toast.error("Fichier vide ou format non reconnu"); return; }
      setPriceParsed(data);
      setPriceResult(null);
      // Check if ref_art column was detected
      if (!data.headers.includes('ref_art')) {
        toast.warning("Colonne référence non détectée", {
          description: "Vérifiez que le fichier contient une colonne 'Réf Art 6' ou 'Référence'"
        });
      }
      toast.success(`${data.totalRows} lignes analysées`, { description: `Colonnes détectées : ${data.headers.join(', ')}` });
    } catch (err) {
      toast.error("Erreur lecture fichier", { description: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  };

  // ── Invoke with retry (exponential backoff) ──
  const invokeWithRetry = async (fnName: string, body: Record<string, unknown>, maxRetries = 2): Promise<unknown> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (!error) return data;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  };

  // ── Catalogue import ──
  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setResult(null);
    setImportProgress('');
    try {
      const BATCH = 100;
      const totalBatches = Math.ceil(parsed.rows.length / BATCH);
      const totals = { created: 0, updated: 0, skipped: 0, errors: 0, rollups_recomputed: 0, details: [] as string[] };
      for (let i = 0; i < parsed.rows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setImportProgress(`Lot ${batchNum}/${totalBatches} (${Math.min(i + BATCH, parsed.rows.length)}/${parsed.rows.length} lignes)`);
        const data = await invokeWithRetry('import-alkor', {
          rows: parsed.rows.slice(i, i + BATCH),
          mode,
        });
        totals.created += data.created || 0;
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.rollups_recomputed += data.rollups_recomputed || 0;
        totals.details.push(...(data.details || []));
      }
      setResult(totals);
      toast[totals.errors > 0 ? 'warning' : 'success'](`Import terminé : ${totals.created} créés, ${totals.updated} enrichis${totals.rollups_recomputed ? `, ${totals.rollups_recomputed} rollups recalculés` : ''}`);
    } catch (err) {
      toast.error("Erreur import", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  // ── Prix import ──
  const handlePriceImport = async () => {
    if (!priceParsed) return;
    setPriceImporting(true);
    setPriceResult(null);
    setPriceProgress('');
    try {
      const BATCH = 100;
      const totalBatches = Math.ceil(priceParsed.rows.length / BATCH);
      const totals = { updated: 0, skipped: 0, errors: 0, rollups_recomputed: 0, details: [] as string[] };
      for (let i = 0; i < priceParsed.rows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setPriceProgress(`Lot ${batchNum}/${totalBatches} (${Math.min(i + BATCH, priceParsed.rows.length)}/${priceParsed.rows.length} lignes)`);
        const data = await invokeWithRetry('import-alkor-prices', {
          rows: priceParsed.rows.slice(i, i + BATCH),
        });
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.rollups_recomputed += data.rollups_recomputed || 0;
        totals.details.push(...(data.details || []));
      }
      setPriceResult(totals);
      toast[totals.errors > 0 ? 'warning' : 'success'](
        `Import prix terminé : ${totals.updated} offres mises à jour, ${totals.rollups_recomputed} rollups recalculés`
      );
    } catch (err) {
      toast.error("Erreur import prix", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setPriceImporting(false);
      setPriceProgress('');
    }
  };

  // ── Bon de commande file select ──
  const handlePoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const data = await parsePurchaseOrderXlsx(buffer);
      if (!data) {
        toast.error("Format non reconnu", {
          description: "Impossible de trouver les en-têtes du bon de commande (Référence + Désignation)"
        });
        return;
      }
      setPoParsed(data);
      setPoResult(null);
      toast.success(`${data.totalRows} lignes détectées`, {
        description: data.metadata.orderRef
          ? `Commande ${data.metadata.orderRef}`
          : `${data.headers.length} colonnes mappées`
      });
    } catch (err) {
      toast.error("Erreur lecture fichier", { description: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  };

  // ── Bon de commande import ──
  const handlePoImport = async () => {
    if (!poParsed) return;
    setPoImporting(true);
    setPoResult(null);
    setPoProgress('');
    try {
      // Transform PO rows → AlkorPriceRow format for import-alkor-prices
      const priceRows = poParsed.rows.map(row => ({
        ref_art: row.ref_art,
        purchase_price_ht: row.purchase_price_ht || row.prix_article_ht || '',
      }));

      const BATCH = 100;
      const totalBatches = Math.ceil(priceRows.length / BATCH);
      const totals = { updated: 0, skipped: 0, errors: 0, rollups_recomputed: 0, details: [] as string[] };

      for (let i = 0; i < priceRows.length; i += BATCH) {
        const batchNum = Math.floor(i / BATCH) + 1;
        setPoProgress(`Lot ${batchNum}/${totalBatches} (${Math.min(i + BATCH, priceRows.length)}/${priceRows.length} lignes)`);
        const data = await invokeWithRetry('import-alkor-prices', {
          rows: priceRows.slice(i, i + BATCH),
          format: 'alkor-bon-commande',
        });
        totals.updated += data.updated || 0;
        totals.skipped += data.skipped || 0;
        totals.errors += data.errors || 0;
        totals.rollups_recomputed += data.rollups_recomputed || 0;
        totals.details.push(...(data.details || []));
      }
      setPoResult(totals);
      toast[totals.errors > 0 ? 'warning' : 'success'](
        `Import BdC terminé : ${totals.updated} prix mis à jour, ${totals.rollups_recomputed} rollups recalculés`
      );
    } catch (err) {
      toast.error("Erreur import BdC", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setPoImporting(false);
      setPoProgress('');
    }
  };

  // ── Diagnostic run ──
  const runDiagnostic = async (diagId: string) => {
    const diag = DIAGNOSTICS.find(d => d.id === diagId);
    if (!diag) return;
    setDiagRunning(prev => ({ ...prev, [diagId]: true }));
    try {
      const result = await diag.query();
      setDiagResults(prev => ({ ...prev, [diagId]: result }));
    } catch (err) {
      toast.error(`Erreur diagnostic ${diagId}`, { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setDiagRunning(prev => ({ ...prev, [diagId]: false }));
    }
  };

  const renderImportResult = (res: { errors: number; created?: number; updated?: number; skipped: number; rollups_recomputed?: number; details?: string[] }) => (
    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center gap-2">
        {res.errors === 0
          ? <CheckCircle2 className="h-4 w-4 text-primary" />
          : <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="font-medium text-sm">Résultat de l'import</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {res.created !== undefined && <div><span className="text-muted-foreground">Créés :</span> <strong>{res.created}</strong></div>}
        {res.updated !== undefined && <div><span className="text-muted-foreground">Maj :</span> <strong>{res.updated}</strong></div>}
        <div><span className="text-muted-foreground">Ignorés :</span> <strong>{res.skipped}</strong></div>
        <div><span className="text-muted-foreground">Erreurs :</span> <strong className={res.errors > 0 ? 'text-destructive' : ''}>{res.errors}</strong></div>
        {res.rollups_recomputed > 0 && (
          <div><span className="text-muted-foreground">Rollups :</span> <strong className="text-primary">{res.rollups_recomputed}</strong></div>
        )}
      </div>
      {res.details?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Voir les détails ({res.details.length})</summary>
          <ul className="mt-2 space-y-1 max-h-[150px] overflow-auto">
            {res.details.map((d: string, i: number) => <li key={i}>• {d}</li>)}
          </ul>
        </details>
      )}
    </div>
  );

  return (
    <AdminLayout title="Import ALKOR / Burolike" description="Importation du catalogue et des prix fournisseur ALKOR">
      <div className="space-y-6">
        <Tabs defaultValue="catalogue">
          <TabsList>
            <TabsTrigger value="catalogue">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Catalogue mensuel
            </TabsTrigger>
            <TabsTrigger value="prix">
              <DollarSign className="h-4 w-4 mr-2" />
              Import Prix ALKOR
            </TabsTrigger>
            <TabsTrigger value="bon-commande">
              <ClipboardList className="h-4 w-4 mr-2" />
              Bon de commande
            </TabsTrigger>
            <TabsTrigger value="diagnostic">
              <FlaskConical className="h-4 w-4 mr-2" />
              Diagnostic prix
            </TabsTrigger>
            <TabsTrigger value="sync-b2b">
              <Globe className="h-4 w-4 mr-2" />
              Sync B2B
            </TabsTrigger>
          </TabsList>

          {/* ── ONGLET CATALOGUE ── */}
          <TabsContent value="catalogue" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Fichier mensuel adhérents</CardTitle>
                    <CardDescription>Catalogue ALKOR/Burolike au format XLSX — sans prix, enrichissement descriptif</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
                    <Upload className="h-4 w-4" />Charger un fichier XLSX
                  </Button>
                  {parsed && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />{parsed.totalRows} articles détectés
                    </Badge>
                  )}
                </div>
                {parsed && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" onClick={() => setMode('create')}>Créer + Enrichir</Button>
                      <Button variant={mode === 'enrich' ? 'default' : 'outline'} size="sm" onClick={() => setMode('enrich')}>Enrichir uniquement (par EAN)</Button>
                    </div>
                    <div className="border rounded-lg overflow-auto max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {['ref_art', 'ean', 'description', 'famille', 'marque_produit', 'cycle_vie'].map(h => (
                              <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsed.rows.slice(0, 10).map((row, i) => (
                            <TableRow key={i}>
                              {['ref_art', 'ean', 'description', 'famille', 'marque_produit', 'cycle_vie'].map(h => (
                                <TableCell key={h} className="text-xs max-w-[200px] truncate">{row[h] || '—'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">Aperçu des 10 premières lignes sur {parsed.totalRows}</p>
                    <div className="flex items-center gap-3">
                      <Button onClick={handleImport} disabled={importing} className="gap-2">
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {importing ? 'Import en cours...' : `Importer ${parsed.totalRows} articles`}
                      </Button>
                      {importing && importProgress && (
                        <span className="text-xs text-muted-foreground animate-pulse">{importProgress}</span>
                      )}
                    </div>
                  </div>
                )}
                {result && !importing && renderImportResult(result)}
              </CardContent>
            </Card>

            {/* Historique catalogue */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Historique imports catalogue ALKOR</CardTitle></CardHeader>
              <CardContent>
                {alkorLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun import ALKOR encore effectué</p>
                ) : (
                  <div className="space-y-2">
                    {alkorLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(log.imported_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-primary text-xs">✓ {log.success_count}</span>
                          {(log.error_count || 0) > 0 && <span className="text-destructive text-xs">✗ {log.error_count}</span>}
                          <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ONGLET IMPORT PRIX ── */}
          <TabsContent value="prix" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Fichier prix ALKOR</CardTitle>
                    <CardDescription>
                      Fichier dédié avec les prix d'achat HT, PVP TTC et éco-contributions — mis en correspondance via la Réf Art 6
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Info box */}
                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p className="font-medium">Colonnes détectées automatiquement :</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-muted-foreground mt-1">
                    {[
                      ['Réf Art 6 / Référence', '→ ref_art (clé de matching)'],
                      ['Prix achat HT / PA HT', '→ purchase_price_ht'],
                      ['PVP TTC / Prix public', '→ pvp_ttc'],
                      ['TVA / Taux TVA', '→ vat_rate'],
                      ['D3E / DEEE', '→ tax_breakdown.d3e'],
                      ['COP / Sorecop / Eco', '→ tax_breakdown'],
                    ].map(([k, v]) => (
                      <div key={k}><span className="font-mono bg-muted px-1 rounded">{k}</span> {v}</div>
                    ))}
                  </div>
                </div>

                <input ref={priceFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handlePriceFileSelect} />
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="gap-2" onClick={() => priceFileRef.current?.click()} disabled={priceImporting}>
                    <Upload className="h-4 w-4" />Charger le fichier prix XLSX
                  </Button>
                  {priceParsed && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />{priceParsed.totalRows} lignes
                    </Badge>
                  )}
                </div>

                {priceParsed && (
                  <div className="space-y-4">
                    {/* Colonnes détectées */}
                    <div className="flex flex-wrap gap-1">
                      {priceParsed.headers.map(h => (
                        <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                      ))}
                      {!priceParsed.headers.includes('ref_art') && (
                        <Badge variant="destructive" className="text-xs">⚠ ref_art manquant</Badge>
                      )}
                    </div>

                    {/* Preview */}
                    <div className="border rounded-lg overflow-auto max-h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {['ref_art', 'purchase_price_ht', 'pvp_ttc', 'vat_rate', 'd3e', 'cop'].map(h => (
                              <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceParsed.rows.slice(0, 8).map((row, i) => (
                            <TableRow key={i}>
                              {['ref_art', 'purchase_price_ht', 'pvp_ttc', 'vat_rate', 'd3e', 'cop'].map(h => (
                                <TableCell key={h} className="text-xs font-mono">{row[h] || '—'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">Aperçu des 8 premières lignes sur {priceParsed.totalRows}</p>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handlePriceImport}
                        disabled={priceImporting || !priceParsed.headers.includes('ref_art')}
                        className="gap-2"
                      >
                        {priceImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                        {priceImporting ? 'Import en cours...' : `Importer ${priceParsed.totalRows} prix + recalcul rollups`}
                      </Button>
                      {priceImporting && priceProgress && (
                        <span className="text-xs text-muted-foreground animate-pulse">{priceProgress}</span>
                      )}
                    </div>
                  </div>
                )}

                {priceResult && !priceImporting && renderImportResult(priceResult)}
              </CardContent>
            </Card>

            {/* Historique prix */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Historique imports prix ALKOR</CardTitle></CardHeader>
              <CardContent>
                {alkorPriceLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun import de prix ALKOR encore effectué</p>
                ) : (
                  <div className="space-y-2">
                    {alkorPriceLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(log.imported_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-primary text-xs">✓ {log.success_count} mises à jour</span>
                          {(log.error_count || 0) > 0 && <span className="text-destructive text-xs">✗ {log.error_count}</span>}
                          <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ONGLET BON DE COMMANDE ── */}
          <TabsContent value="bon-commande" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Bon de commande ALKOR</CardTitle>
                    <CardDescription>
                      Importer un bon de commande ALKOR pour mettre à jour les prix d'achat HT dans les offres fournisseur
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p className="font-medium">Format attendu :</p>
                  <p className="text-xs text-muted-foreground">
                    Fichier XLSX avec en-têtes de commande (référence, date, montant…), puis un tableau avec les colonnes
                    Référence, Désignation, Prix unitaire HT, etc. Les en-têtes sont détectés automatiquement.
                  </p>
                </div>

                <input ref={poFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handlePoFileSelect} />
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="gap-2" onClick={() => poFileRef.current?.click()} disabled={poImporting}>
                    <Upload className="h-4 w-4" />Charger le bon de commande XLSX
                  </Button>
                  {poParsed && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />{poParsed.totalRows} articles
                    </Badge>
                  )}
                </div>

                {poParsed && (
                  <div className="space-y-4">
                    {/* Order metadata summary */}
                    {(poParsed.metadata.orderRef || poParsed.metadata.date || poParsed.metadata.totalHt) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30">
                        {poParsed.metadata.orderRef && (
                          <div>
                            <span className="text-xs text-muted-foreground">Réf. commande</span>
                            <p className="font-medium text-sm">{poParsed.metadata.orderRef}</p>
                          </div>
                        )}
                        {poParsed.metadata.date && (
                          <div>
                            <span className="text-xs text-muted-foreground">Date</span>
                            <p className="font-medium text-sm">{poParsed.metadata.date}</p>
                          </div>
                        )}
                        {poParsed.metadata.totalHt && (
                          <div>
                            <span className="text-xs text-muted-foreground">Total HT</span>
                            <p className="font-medium text-sm">{poParsed.metadata.totalHt}</p>
                          </div>
                        )}
                        {poParsed.metadata.client && (
                          <div>
                            <span className="text-xs text-muted-foreground">Client</span>
                            <p className="font-medium text-sm">{poParsed.metadata.client}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detected columns */}
                    <div className="flex flex-wrap gap-1">
                      {poParsed.headers.map(h => (
                        <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                      ))}
                      {!poParsed.headers.includes('ref_art') && (
                        <Badge variant="destructive" className="text-xs">ref_art manquant</Badge>
                      )}
                    </div>

                    {/* Preview table */}
                    <div className="border rounded-lg overflow-auto max-h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {['ref_art', 'designation', 'quantity', 'prix_article_ht', 'taux_remis', 'purchase_price_ht', 'total_ht'].map(h => (
                              <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {poParsed.rows.slice(0, 8).map((row, i) => (
                            <TableRow key={i}>
                              {['ref_art', 'designation', 'quantity', 'prix_article_ht', 'taux_remis', 'purchase_price_ht', 'total_ht'].map(h => (
                                <TableCell key={h} className="text-xs font-mono">{row[h] || '—'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">Aperçu des 8 premières lignes sur {poParsed.totalRows}</p>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handlePoImport}
                        disabled={poImporting || !poParsed.headers.includes('ref_art')}
                        className="gap-2"
                      >
                        {poImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                        {poImporting ? 'Import en cours...' : `Mettre à jour ${poParsed.totalRows} prix d'achat`}
                      </Button>
                      {poImporting && poProgress && (
                        <span className="text-xs text-muted-foreground animate-pulse">{poProgress}</span>
                      )}
                    </div>
                  </div>
                )}

                {poResult && !poImporting && renderImportResult(poResult)}
              </CardContent>
            </Card>

            {/* Historique BdC */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Historique imports BdC ALKOR</CardTitle></CardHeader>
              <CardContent>
                {alkorPoLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun import de BdC ALKOR encore effectué</p>
                ) : (
                  <div className="space-y-2">
                    {alkorPoLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(log.imported_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-primary text-xs">{log.success_count} mises à jour</span>
                          {(log.error_count || 0) > 0 && <span className="text-destructive text-xs">{log.error_count} erreurs</span>}
                          <span className="text-muted-foreground text-xs">{log.total_rows} lignes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ONGLET DIAGNOSTIC ── */}
          <TabsContent value="diagnostic" className="space-y-4 mt-4">
            {/* Guide de validation */}
            <Card>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setGuideOpen(o => !o)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      📋 Guide de validation sans prix ALKOR
                    </CardTitle>
                    <CardDescription>Comment tester le système de pricing quand ALKOR n'a pas encore de fichier prix</CardDescription>
                  </div>
                  {guideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {guideOpen && (
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-3">
                    {[
                      {
                        step: '1',
                        title: 'COMLANDI ou SOFT fournit pvp_ttc',
                        detail: 'Si COMLANDI a un PVP → public_price_source = PVP_COMLANDI. Si SOFT seulement → PVP_SOFT.',
                        action: 'Vérifier via Test 2 ci-dessous',
                      },
                      {
                        step: '2',
                        title: 'Aucun PVP → calcul par coefficient',
                        detail: 'Le rollup multiplie cost_price (prix achat HT) par le coefficient liderpapel_pricing_coefficients selon famille/sous-famille.',
                        action: 'Vérifier que liderpapel_pricing_coefficients contient des lignes',
                      },
                      {
                        step: '3',
                        title: 'Stock mutualisé',
                        detail: 'Un produit est Disponible si au moins une offre (ALKOR OU COMLANDI OU SOFT) a stock_qty > 0.',
                        action: 'Test 4 doit retourner 0 lignes',
                      },
                      {
                        step: '4',
                        title: 'Quand ALKOR aura un fichier prix',
                        detail: 'Utiliser l\'onglet "Import Prix ALKOR" pour uploader le fichier prix dédié. Les rollups seront recalculés automatiquement.',
                        action: 'PVP ALKOR aura priorité sur COMLANDI et SOFT',
                      },
                    ].map(item => (
                      <div key={item.step} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {item.step}
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-muted-foreground text-xs mt-1">{item.detail}</p>
                          <p className="text-primary text-xs mt-1 font-medium">→ {item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Diagnostic queries */}
            <div className="grid gap-4">
              {DIAGNOSTICS.map(diag => {
                const diagResult = diagResults[diag.id];
                const isRunning = diagRunning[diag.id];
                return (
                  <Card key={diag.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <CardTitle className="text-base">{diag.title}</CardTitle>
                          <CardDescription className="text-xs mt-1">{diag.description}</CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-shrink-0"
                          onClick={() => runDiagnostic(diag.id)}
                          disabled={isRunning}
                        >
                          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Exécuter
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3 italic">{diag.expectedLabel}</p>
                      {diagResult ? (
                        <div className="border rounded-lg overflow-auto max-h-[200px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(diagResult.rows[0] || {}).map(k => (
                                  <TableHead key={k} className="text-xs">{k}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {diagResult.rows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">
                                    <Badge className="bg-primary/10 text-primary gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> 0 lignes — cohérence parfaite ✓
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                diagResult.rows.map((row: Record<string, unknown>, i: number) => (
                                  <TableRow key={i}>
                                    {Object.values(row).map((v: unknown, j: number) => (
                                      <TableCell key={j} className="text-xs font-mono">{String(v ?? '—')}</TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Cliquez sur "Exécuter" pour lancer le test
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── ONGLET SYNC B2B ── */}
          <TabsContent value="sync-b2b" className="space-y-4 mt-4">
            <SyncB2BTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

