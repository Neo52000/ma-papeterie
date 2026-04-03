import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Loader2, FileText, Package, Database, BarChart3, RefreshCw,
  FlaskConical, Wifi, Play, AlertCircle, FolderTree, Calculator, Trash2, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSoftCarrierImport } from "@/hooks/useSoftCarrierImport";
import { useImportLogs } from "@/hooks/useImportLogs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  type SoftCarrierSource,
  type ParsedData,
  parsePreislis,
  parseArtx,
  parseTarifsB2B,
  parseHerstinfo,
  parseLagerbestand,
  PREISLIS_PREVIEW_COLS,
  TARIFSB2B_EXPECTED_COLS,
} from "@/lib/softcarrier-parsers";
import { SoftCarrierPreview } from "@/components/admin/softcarrier/SoftCarrierPreview";
import { ImportResultCard, type ImportResult } from "@/components/admin/softcarrier/ImportResultCard";
import { SoftCarrierCategoryMapping } from "@/components/admin/softcarrier/SoftCarrierCategoryMapping";
import { useSoftCarrierCoefficients } from "@/hooks/useSoftCarrierCoefficients";

// ── Diagnostic queries ──────────────────────────────────────────────────────

const DIAGNOSTICS = [
  {
    id: 'total-products',
    label: 'Produits Soft Carrier',
    description: 'Nombre de produits avec ref_softcarrier',
    run: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('ref_softcarrier', 'is', null);
      if (error) throw error;
      return { count, detail: '' };
    },
  },
  {
    id: 'missing-price',
    label: 'Sans prix',
    description: 'Produits Soft Carrier avec prix HT = 0 ou null',
    run: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, ref_softcarrier, name')
        .not('ref_softcarrier', 'is', null)
        .or('price_ht.is.null,price_ht.eq.0')
        .limit(20);
      if (error) throw error;
      return { count: data?.length ?? 0, rows: data, detail: 'Attendu : 0' };
    },
  },
  {
    id: 'missing-description',
    label: 'Sans description',
    description: 'Produits Soft Carrier sans description (ARTX non importé)',
    run: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('ref_softcarrier', 'is', null)
        .or('description.is.null,description.eq.');
      if (error) throw error;
      return { count: count ?? 0, detail: '' };
    },
  },
  {
    id: 'stock-freshness',
    label: 'Fraîcheur stock',
    description: 'Dernier snapshot stock reçu',
    run: async () => {
      const { data, error } = await supabase
        .from('supplier_stock_snapshots')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const ago = data?.fetched_at
        ? `Il y a ${Math.round((Date.now() - new Date(data.fetched_at).getTime()) / 60000)} min`
        : 'Aucun snapshot';
      return { count: null as number | null, detail: ago };
    },
  },
  {
    id: 'margin-check',
    label: 'Marge < 10%',
    description: 'Produits en dessous de la marge minimum obligatoire',
    run: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, ref_softcarrier, name, price_ht, cost_price')
        .not('ref_softcarrier', 'is', null)
        .not('cost_price', 'is', null)
        .gt('cost_price', 0)
        .gt('price_ht', 0)
        .limit(100);
      if (error) throw error;
      const violations = (data || []).filter(p => {
        const margin = ((p.price_ht - p.cost_price) / p.price_ht) * 100;
        return margin < 10;
      });
      return { count: violations.length, rows: violations.slice(0, 20), detail: 'Attendu : 0' };
    },
  },
];

// ── Import log history component ────────────────────────────────────────────

function ImportHistory({ format, logs }: { format: string; logs: ReturnType<typeof useImportLogs>['logs'] }) {
  const filtered = logs.filter(l => l.format === format);
  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucun import encore effectué</p>;
  }
  return (
    <div className="space-y-2">
      {filtered.slice(0, 10).map(log => (
        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
          <span className="text-muted-foreground">
            {new Date(log.imported_at || '').toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminSoftCarrier() {
  // ── Per-tab state ──
  const [preislisParsed, setPreislisParsed] = useState<ParsedData | null>(null);
  const [artxParsed, setArtxParsed] = useState<ParsedData | null>(null);
  const [b2bParsed, setB2bParsed] = useState<ParsedData | null>(null);
  const [herstParsed, setHerstParsed] = useState<ParsedData | null>(null);
  const [stockParsed, setStockParsed] = useState<ParsedData | null>(null);

  const [preislisResult, setPreislisResult] = useState<ImportResult | null>(null);
  const [artxResult, setArtxResult] = useState<ImportResult | null>(null);
  const [b2bResult, setB2bResult] = useState<ImportResult | null>(null);
  const [herstResult, setHerstResult] = useState<ImportResult | null>(null);
  const [stockResult, setStockResult] = useState<ImportResult | null>(null);

  // File refs
  const preislisRef = useRef<HTMLInputElement>(null);
  const artxRef = useRef<HTMLInputElement>(null);
  const b2bRef = useRef<HTMLInputElement>(null);
  const herstRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);

  // Hook
  const { importRows, importing, importProgress } = useSoftCarrierImport();
  const { logs } = useImportLogs();
  const { coefficients, isLoading: coeffLoading, addCoefficient, updateCoefficient, deleteCoefficient } = useSoftCarrierCoefficients();

  // Coefficient form state
  const [newCoeffFamily, setNewCoeffFamily] = useState('');
  const [newCoeffSubfamily, setNewCoeffSubfamily] = useState('');
  const [newCoeffValue, setNewCoeffValue] = useState('1.619');
  const [editingCoeffId, setEditingCoeffId] = useState<string | null>(null);
  const [editingCoeffValue, setEditingCoeffValue] = useState('');

  // ── FTP sync state ──
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [ftpSources, setFtpSources] = useState<Record<string, boolean>>({
    herstinfo: true, preislis: true, artx: true, tarifsb2b: true, lagerbestand: true,
  });

  // ── Diagnostic state ──
  const [diagResults, setDiagResults] = useState<Record<string, any>>({});
  const [diagRunning, setDiagRunning] = useState<Record<string, boolean>>({});

  // ── File handlers ──

  const handleCP850File = async (
    parser: (buf: ArrayBuffer) => ParsedData,
    setter: (d: ParsedData | null) => void,
    resultSetter: (r: ImportResult | null) => void,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const data = parser(buffer);
      if (data.rows.length === 0) { toast.error("Fichier vide ou format non reconnu"); return; }
      setter(data);
      resultSetter(null);
      toast.success(`${data.totalRows} lignes analysées`, { description: `${data.headers.length} colonnes détectées` });
    } catch (err) {
      toast.error("Erreur lecture fichier", { description: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  };

  const handleTextFile = async (
    parser: (text: string) => ParsedData,
    setter: (d: ParsedData | null) => void,
    resultSetter: (r: ImportResult | null) => void,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = parser(text);
      if (data.rows.length === 0) { toast.error("Fichier vide ou format non reconnu"); return; }
      setter(data);
      resultSetter(null);
      toast.success(`${data.totalRows} lignes analysées`, { description: `${data.headers.length} colonnes détectées` });
    } catch (err) {
      toast.error("Erreur lecture fichier", { description: err instanceof Error ? err.message : String(err) });
    }
    e.target.value = '';
  };

  // ── Import handler ──

  const handleImport = async (source: SoftCarrierSource, parsed: ParsedData, resultSetter: (r: ImportResult | null) => void) => {
    try {
      const result = await importRows(source, parsed.rows);
      resultSetter(result);
    } catch {
      // Error already handled in hook
    }
  };

  // ── FTP sync ──

  const handleFtpSync = async (testOnly = false) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const selectedSources = Object.entries(ftpSources)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const { data, error } = await supabase.functions.invoke("sync-softcarrier-ftp", {
        body: { sources: selectedSources, test_only: testOnly },
      });
      if (error) throw error;
      setSyncResult(data);
      if (data?.error) {
        toast.error(data.error);
      } else if (testOnly) {
        toast.success("Test connexion FTP réussi");
      } else {
        const fileCount = Object.keys(data?.files || {}).length;
        toast.success(`Sync FTP terminée — ${fileCount} fichier(s) traité(s)`);
      }
    } catch (err) {
      toast.error(`Erreur FTP : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Diagnostic runner ──

  const runDiag = async (id: string, runFn: () => Promise<any>) => {
    setDiagRunning(prev => ({ ...prev, [id]: true }));
    try {
      const result = await runFn();
      setDiagResults(prev => ({ ...prev, [id]: result }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as any).message) : JSON.stringify(err);
      toast.error(`Erreur diagnostic`, { description: msg });
    } finally {
      setDiagRunning(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Render helpers ──

  const renderImportTab = (
    source: SoftCarrierSource,
    icon: React.ComponentType<{ className?: string }>,
    title: string,
    description: string,
    accept: string,
    fileRef: React.RefObject<HTMLInputElement | null>,
    parsed: ParsedData | null,
    result: ImportResult | null,
    resultSetter: (r: ImportResult | null) => void,
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    previewColumns: string[],
    infoContent?: React.ReactNode,
  ) => {
    const Icon = icon;
    const isImporting = importing === source;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {infoContent}

            <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={isImporting}>
                <Upload className="h-4 w-4" />Charger un fichier
              </Button>
              {parsed && (
                <Badge variant="secondary" className="gap-1">
                  {parsed.totalRows} lignes détectées
                </Badge>
              )}
            </div>

            {parsed && (
              <div className="space-y-4">
                <SoftCarrierPreview
                  rows={parsed.rows}
                  columns={previewColumns}
                  totalRows={parsed.totalRows}
                />
                <div className="flex items-center gap-3">
                  <Button onClick={() => handleImport(source, parsed, resultSetter)} disabled={isImporting} className="gap-2">
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {isImporting ? 'Import en cours...' : `Importer ${parsed.totalRows} éléments`}
                  </Button>
                  {isImporting && importProgress && (
                    <span className="text-xs text-muted-foreground animate-pulse">{importProgress}</span>
                  )}
                </div>
              </div>
            )}

            {result && !isImporting && <ImportResultCard result={result} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Historique</CardTitle></CardHeader>
          <CardContent>
            <ImportHistory format={`softcarrier-${source}`} logs={logs} />
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AdminLayout title="Soft Carrier France" description="Import et synchronisation du catalogue fournisseur">
      <div className="space-y-6">
        <Tabs defaultValue="catalogue">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="catalogue">
              <BarChart3 className="h-4 w-4 mr-2" />Catalogue
            </TabsTrigger>
            <TabsTrigger value="descriptions">
              <FileText className="h-4 w-4 mr-2" />Descriptions
            </TabsTrigger>
            <TabsTrigger value="b2b">
              <Package className="h-4 w-4 mr-2" />Tarifs B2B
            </TabsTrigger>
            <TabsTrigger value="marques">
              <Database className="h-4 w-4 mr-2" />Marques
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Package className="h-4 w-4 mr-2" />Stock
            </TabsTrigger>
            <TabsTrigger value="ftp">
              <Wifi className="h-4 w-4 mr-2" />Sync FTP
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderTree className="h-4 w-4 mr-2" />Catégories
            </TabsTrigger>
            <TabsTrigger value="coefficients">
              <Calculator className="h-4 w-4 mr-2" />Coefficients
            </TabsTrigger>
            <TabsTrigger value="diagnostic">
              <FlaskConical className="h-4 w-4 mr-2" />Diagnostic
            </TabsTrigger>
          </TabsList>

          {/* ── CATALOGUE (PREISLIS) ── */}
          <TabsContent value="catalogue" className="mt-4">
            {renderImportTab(
              'preislis', BarChart3,
              'PREISLIS.TXT — Catalogue produits',
              'Liste de prix principale avec paliers tarifaires (TSV, encodage CP850)',
              '.txt,.TXT',
              preislisRef, preislisParsed, preislisResult, setPreislisResult,
              (e) => handleCP850File(parsePreislis, setPreislisParsed, setPreislisResult, e),
              PREISLIS_PREVIEW_COLS,
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="font-medium">Colonnes principales attendues (format TSV) :</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-muted-foreground mt-1">
                  {[
                    ['Col 0-1', 'Catégorie / Sous-catégorie'],
                    ['Col 2', 'Référence article (clé)'],
                    ['Col 3', 'Nom produit'],
                    ['Col 4-8', 'Description (5 blocs)'],
                    ['Col 9-20', '6 paliers (qté + prix)'],
                    ['Col 27', 'Marque'],
                    ['Col 29', 'Code EAN'],
                    ['Col 36', 'Stock disponible'],
                    ['Col 37', 'Code TVA'],
                  ].map(([k, v]) => (
                    <div key={k}><span className="font-mono bg-muted px-1 rounded">{k}</span> {v}</div>
                  ))}
                </div>
              </div>,
            )}
          </TabsContent>

          {/* ── DESCRIPTIONS (ARTX) ── */}
          <TabsContent value="descriptions" className="mt-4">
            {renderImportTab(
              'artx', FileText,
              'ARTX.IMP — Descriptions produits',
              'Descriptions multilingues en format largeur fixe (CP850). Seules les lignes françaises (code 003) sont importées.',
              '.imp,.IMP,.txt,.TXT',
              artxRef, artxParsed, artxResult, setArtxResult,
              (e) => handleCP850File(parseArtx, setArtxParsed, setArtxResult, e),
              ['ref', 'description'],
              artxParsed ? (
                <Badge variant="outline">
                  {artxParsed.totalRows} descriptions FR détectées
                </Badge>
              ) : undefined,
            )}
          </TabsContent>

          {/* ── TARIFS B2B ── */}
          <TabsContent value="b2b" className="mt-4">
            {renderImportTab(
              'tarifsb2b', Package,
              'TarifsB2B.csv — Enrichissement B2B',
              'Conditionnements, PVP, taxes (COP/D3E) et catégories (CSV point-virgule, UTF-8 BOM)',
              '.csv,.CSV',
              b2bRef, b2bParsed, b2bResult, setB2bResult,
              (e) => handleTextFile(parseTarifsB2B, setB2bParsed, setB2bResult, e),
              b2bParsed?.headers || ['ref', 'code', 'description', 'pvp', 'brand', 'category'],
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="font-medium">Colonnes détectées automatiquement parmi :</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {TARIFSB2B_EXPECTED_COLS.map(col => (
                    <Badge key={col} variant="outline" className="text-[10px]">{col}</Badge>
                  ))}
                </div>
                {b2bParsed && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">Colonnes trouvées : </span>
                    {b2bParsed.headers.map(h => (
                      <Badge key={h} variant="secondary" className="text-[10px] mr-1">{h}</Badge>
                    ))}
                  </div>
                )}
              </div>,
            )}
          </TabsContent>

          {/* ── MARQUES (HERSTINFO) ── */}
          <TabsContent value="marques" className="mt-4">
            {renderImportTab(
              'herstinfo', Database,
              'HERSTINFO.TXT — Référentiel marques',
              'Table de référence des fabricants et marques (TSV, encodage CP850)',
              '.txt,.TXT',
              herstRef, herstParsed, herstResult, setHerstResult,
              (e) => handleCP850File(parseHerstinfo, setHerstParsed, setHerstResult, e),
              ['name', 'company', 'country', 'website'],
            )}
          </TabsContent>

          {/* ── STOCK (LAGERBESTAND) ── */}
          <TabsContent value="stock" className="mt-4">
            {renderImportTab(
              'lagerbestand', Package,
              'LAGERBESTAND.csv — Stock temps réel',
              'Fichier de stock mis à jour toutes les 10 minutes (CSV point-virgule, UTF-8)',
              '.csv,.CSV',
              stockRef, stockParsed, stockResult, setStockResult,
              (e) => handleTextFile(parseLagerbestand, setStockParsed, setStockResult, e),
              ['ref', 'qty_available', 'delivery_week'],
            )}
          </TabsContent>

          {/* ── SYNC FTP ── */}
          <TabsContent value="ftp" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wifi className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Synchronisation FTP</CardTitle>
                    <CardDescription>
                      Télécharge et importe automatiquement les fichiers depuis le serveur FTP Soft Carrier.
                      Programmé tous les jours à 2h du matin (UTC).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Fichiers à synchroniser :</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { key: 'herstinfo', label: 'HERSTINFO.TXT (Marques)' },
                      { key: 'preislis', label: 'PREISLIS.TXT (Catalogue)' },
                      { key: 'artx', label: 'ARTX.IMP (Descriptions)' },
                      { key: 'tarifsb2b', label: 'TarifsB2B.csv (B2B)' },
                      { key: 'lagerbestand', label: 'LAGERBESTAND.csv (Stock)' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={ftpSources[key]}
                          onCheckedChange={(checked) =>
                            setFtpSources(prev => ({ ...prev, [key]: !!checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => handleFtpSync(true)} disabled={syncing} variant="outline" className="gap-2">
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Tester la connexion
                  </Button>
                  <Button onClick={() => handleFtpSync(false)} disabled={syncing} className="gap-2">
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {syncing ? 'Sync en cours...' : 'Lancer la synchronisation'}
                  </Button>
                </div>

                {syncResult && (
                  <div className="space-y-3">
                    {syncResult.error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {syncResult.error}
                      </div>
                    )}
                    {syncResult.files && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {Object.entries(syncResult.files || {}).map(([source, stats]: [string, any]) => (
                          <div key={source} className="p-2 rounded-lg bg-muted/30 text-xs space-y-1">
                            <div className="font-medium">{source}</div>
                            <div className="text-muted-foreground">
                              {stats.lines} lignes · {stats.sizeMb} Mo
                            </div>
                            <div>
                              <span className="text-primary">✓ {stats.success}</span>
                              {stats.errors > 0 && <span className="text-destructive ml-2">✗ {stats.errors}</span>}
                              {stats.skipped > 0 && <span className="text-muted-foreground ml-2">⊘ {stats.skipped}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {syncResult.test_only && syncResult.file_list && (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <p className="font-medium mb-2">Fichiers trouvés sur le FTP :</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {syncResult.file_list.map((f: any, i: number) => (
                            <li key={i}>📄 {f.name} — {f.size ? `${(f.size / 1024).toFixed(0)} Ko` : 'taille inconnue'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {syncResult.duration_ms && (
                      <p className="text-xs text-muted-foreground">
                        Durée : {(syncResult.duration_ms / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Historique sync FTP</CardTitle></CardHeader>
              <CardContent>
                <ImportHistory format="softcarrier-ftp" logs={logs} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CATÉGORIES (MAPPING) ── */}
          <TabsContent value="categories" className="mt-4">
            <SoftCarrierCategoryMapping />
          </TabsContent>

          {/* ── COEFFICIENTS PA → PV ── */}
          <TabsContent value="coefficients" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coefficients PA → PV HT</CardTitle>
                <CardDescription>
                  Coefficient multiplicateur appliqué au prix d'achat pour calculer le prix de vente HT.
                  Le coefficient global (*) s'applique à toutes les familles sans coefficient spécifique.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add form */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground">Famille</label>
                    <Input
                      value={newCoeffFamily} onChange={(e) => setNewCoeffFamily(e.target.value)}
                      placeholder="* (global) ou nom famille" className="w-48"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sous-famille (optionnel)</label>
                    <Input
                      value={newCoeffSubfamily} onChange={(e) => setNewCoeffSubfamily(e.target.value)}
                      placeholder="Sous-famille" className="w-48"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Coefficient</label>
                    <Input
                      type="number" step="0.001" min="1"
                      value={newCoeffValue} onChange={(e) => setNewCoeffValue(e.target.value)}
                      className="w-28"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!newCoeffFamily.trim() || addCoefficient.isPending}
                    onClick={() => {
                      addCoefficient.mutate({
                        family: newCoeffFamily.trim(),
                        subfamily: newCoeffSubfamily.trim() || undefined,
                        coefficient: parseFloat(newCoeffValue) || 1.619,
                      }, {
                        onSuccess: () => {
                          setNewCoeffFamily('');
                          setNewCoeffSubfamily('');
                          setNewCoeffValue('1.619');
                        },
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />Ajouter
                  </Button>
                </div>

                {/* Table */}
                {coeffLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : coefficients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun coefficient défini</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Famille</th>
                          <th className="text-left p-3 font-medium">Sous-famille</th>
                          <th className="text-right p-3 font-medium">Coefficient</th>
                          <th className="text-right p-3 font-medium">Marge implicite</th>
                          <th className="text-right p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coefficients.map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="p-3">{c.family === '*' ? <Badge variant="secondary">Global</Badge> : c.family}</td>
                            <td className="p-3 text-muted-foreground">{c.subfamily || '—'}</td>
                            <td className="p-3 text-right">
                              {editingCoeffId === c.id ? (
                                <Input
                                  type="number" step="0.001" min="1"
                                  value={editingCoeffValue}
                                  onChange={(e) => setEditingCoeffValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateCoefficient.mutate({ id: c.id, coefficient: parseFloat(editingCoeffValue) || c.coefficient });
                                      setEditingCoeffId(null);
                                    }
                                    if (e.key === 'Escape') setEditingCoeffId(null);
                                  }}
                                  onBlur={() => {
                                    updateCoefficient.mutate({ id: c.id, coefficient: parseFloat(editingCoeffValue) || c.coefficient });
                                    setEditingCoeffId(null);
                                  }}
                                  className="w-24 ml-auto"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:text-primary"
                                  onClick={() => { setEditingCoeffId(c.id); setEditingCoeffValue(String(c.coefficient)); }}
                                >
                                  ×{c.coefficient}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {((1 - 1 / c.coefficient) * 100).toFixed(1)}%
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost" size="sm"
                                disabled={c.family === '*' || deleteCoefficient.isPending}
                                onClick={() => deleteCoefficient.mutate(c.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p><strong>Formule :</strong> Prix de vente HT = Prix d'achat HT × Coefficient</p>
                  <p><strong>Résolution :</strong> Famille + Sous-famille → Famille seule → Global (*) → 1.619</p>
                  <p><strong>Exemple (coeff 1.619) :</strong> PA 9.75€ → PV HT 15.79€ → Marge 38.2%</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DIAGNOSTIC ── */}
          <TabsContent value="diagnostic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {DIAGNOSTICS.map(diag => (
                <Card key={diag.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{diag.label}</CardTitle>
                    <CardDescription className="text-xs">{diag.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={diagRunning[diag.id]}
                      onClick={() => runDiag(diag.id, diag.run)}
                    >
                      {diagRunning[diag.id] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Exécuter
                    </Button>
                    {diagResults[diag.id] && (
                      <div className="text-sm space-y-1">
                        {diagResults[diag.id].count !== null && diagResults[diag.id].count !== undefined && (
                          <div className="font-medium">{diagResults[diag.id].count} résultat(s)</div>
                        )}
                        {diagResults[diag.id].detail && (
                          <div className="text-xs text-muted-foreground">{diagResults[diag.id].detail}</div>
                        )}
                        {diagResults[diag.id].rows?.length > 0 && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer">Voir les détails</summary>
                            <ul className="mt-1 space-y-0.5 max-h-[150px] overflow-auto">
                              {diagResults[diag.id].rows.map((r: any, i: number) => (
                                <li key={i}>• {r.ref_softcarrier || r.id} — {r.name?.substring(0, 50)}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
