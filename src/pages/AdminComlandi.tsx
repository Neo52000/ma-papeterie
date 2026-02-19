import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, Eye, Plus, Trash2, Download, Server, Wifi, WifiOff, Lock } from "lucide-react";
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
}

export default function AdminComlandi() {
  return (
    <AdminLayout title="Import COMLANDI / LIDERPAPEL" description="Gestion des imports fournisseurs COMLANDI et LIDERPAPEL">
      <Tabs defaultValue="comlandi" className="space-y-6">
        <TabsList>
          <TabsTrigger value="comlandi">COMLANDI</TabsTrigger>
          <TabsTrigger value="liderpapel">LIDERPAPEL</TabsTrigger>
        </TabsList>

        <TabsContent value="comlandi">
          <ComlandiTab />
        </TabsContent>

        <TabsContent value="liderpapel">
          <LiderpapelTab />
        </TabsContent>
      </Tabs>
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
  const { logs } = useImportLogs();

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
      for (const rh of rawHeaders) {
        const normalized = normalizeHeader(rh);
        for (const [pattern, key] of Object.entries(COLUMN_MAP)) {
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
          if (key && !key.startsWith('_')) {
            mapped[key] = String(value || '').trim();
          }
        }
        return mapped;
      });

      const mappedHeaders = [...new Set(Object.values(headerMap).filter(k => !k.startsWith('_')))];

      setParsed({ rows: mappedRows, headers: mappedHeaders, totalRows: mappedRows.length });
      setResult(null);
      toast.success(`${mappedRows.length} lignes analysées`, { description: `${mappedHeaders.length} colonnes mappées` });
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
  const [result, setResult] = useState<any>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  const pricesRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [pricesFile, setPricesFile] = useState<File | null>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);

  const { logs } = useImportLogs();
  const liderpapelLogs = logs.filter(l => l.format === 'liderpapel-catalogue');

  const { coefficients, isLoading: coeffLoading, addCoefficient, deleteCoefficient } = useLiderpapelCoefficients();
  const [newFamily, setNewFamily] = useState("");
  const [newSubfamily, setNewSubfamily] = useState("");
  const [newCoeff, setNewCoeff] = useState("2.0");

  const handleManualImport = async () => {
    if (!catalogFile && !pricesFile) {
      toast.error("Veuillez charger au moins Catalog.csv ou Prices.csv");
      return;
    }
    setManualLoading(true);
    setResult(null);
    try {
      const body: Record<string, string> = {};
      if (catalogFile) body.catalog_csv = await catalogFile.text();
      if (pricesFile) body.prices_csv = await pricesFile.text();
      if (stockFile) body.stock_csv = await stockFile.text();

      const { data, error } = await supabase.functions.invoke('fetch-liderpapel-sftp', { body });
      if (error) throw error;
      setResult(data);
      toast.success(`Import terminé : ${data.created} créés, ${data.updated} modifiés`);
    } catch (err: any) {
      toast.error("Erreur import", { description: err.message });
    } finally {
      setManualLoading(false);
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
            Téléchargez les fichiers CSV depuis le serveur SFTP via un client (FileZilla, WinSCP...) puis importez-les ci-dessous.
          </p>
        </CardContent>
      </Card>

      {/* Import CSV manuel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Import fichiers CSV</CardTitle>
              <CardDescription>Chargez les fichiers CSV Liderpapel (Catalog.csv, Prices.csv, Stock.csv) — séparateur point-virgule</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input ref={catalogRef} type="file" accept=".csv" className="hidden" onChange={e => setCatalogFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => catalogRef.current?.click()}>
                <Upload className="h-3 w-3" /> {catalogFile ? catalogFile.name : "Catalog.csv"}
              </Button>
            </div>
            <div>
              <input ref={pricesRef} type="file" accept=".csv" className="hidden" onChange={e => setPricesFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => pricesRef.current?.click()}>
                <Upload className="h-3 w-3" /> {pricesFile ? pricesFile.name : "Prices.csv"}
              </Button>
            </div>
            <div>
              <input ref={stockRef} type="file" accept=".csv" className="hidden" onChange={e => setStockFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => stockRef.current?.click()}>
                <Upload className="h-3 w-3" /> {stockFile ? stockFile.name : "Stock.csv (opt.)"}
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
