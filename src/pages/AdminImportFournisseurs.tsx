import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, ArrowRight, ArrowLeft, CheckCircle2, XCircle,
  RotateCcw, FileSpreadsheet, History, Save, Download,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import {
  useSuppliersList,
  useImportJobs,
  useImportJobRows,
  useImportTemplates,
  useCreateImportJob,
  useInsertJobRows,
  useSaveTemplate,
  useApplyImportJob,
  useRollbackImportJob,
  parseImportFile,
  autoDetectMapping,
  applyMapping,
  validateMappedRow,
  IMPORT_FIELDS,
  type ImportJob,
  type ImportJobRow,
  type ParsedFile,
} from "@/hooks/useImportJobs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ── Constantes ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  staging:     { label: "En attente",  variant: "secondary" },
  applying:    { label: "En cours…",   variant: "default" },
  done:        { label: "Terminé",     variant: "default" },
  error:       { label: "Erreur",      variant: "destructive" },
  rolled_back: { label: "Annulé",      variant: "outline" },
  invalid:     { label: "Invalide",    variant: "destructive" },
  applied:     { label: "Importé",     variant: "default" },
};

const ROW_STATUS_COLORS: Record<string, string> = {
  applied:     "text-emerald-600",
  invalid:     "text-destructive",
  error:       "text-destructive",
  rolled_back: "text-muted-foreground",
  staging:     "text-muted-foreground",
};

// ── Step 1 — Upload ────────────────────────────────────────────────────────────

interface Step1Props {
  supplierId: string | null;
  setSupplierId: (id: string | null) => void;
  parsedFile: ParsedFile | null;
  setParsedFile: (f: ParsedFile) => void;
  filename: string;
  setFilename: (n: string) => void;
  onNext: () => void;
}

function UploadStep({
  supplierId, setSupplierId, parsedFile, setParsedFile, filename, setFilename, onNext,
}: Step1Props) {
  const { data: suppliers } = useSuppliersList();
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setParsing(true);
    try {
      const parsed = await parseImportFile(file);
      setParsedFile(parsed);
      setFilename(file.name);
    } catch (e) {
      setParseError(String(e));
    } finally {
      setParsing(false);
    }
  }, [setParsedFile, setFilename]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Fournisseur */}
      <div className="space-y-2">
        <Label>Fournisseur (optionnel)</Label>
        <Select
          value={supplierId ?? "_none"}
          onValueChange={(v) => setSupplierId(v === "_none" ? null : v)}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Sélectionner…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Sans fournisseur —</SelectItem>
            {(suppliers ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Utile pour renseigner automatiquement les prix et références dans supplier_products.
        </p>
      </div>

      {/* Zone de dépôt */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Déposer un fichier ou cliquer pour parcourir</p>
        <p className="text-sm text-muted-foreground mt-1">XLSX, XLS ou CSV acceptés</p>
        {filename && (
          <p className="text-sm font-medium text-primary mt-2">{filename}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {parsing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Analyse du fichier…
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="h-4 w-4" />
          {parseError}
        </div>
      )}

      {/* Aperçu colonnes */}
      {parsedFile && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">
              {parsedFile.rows.length} ligne(s) détectée(s), {parsedFile.headers.length} colonne(s)
            </span>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsedFile.headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedFile.preview.map((row, i) => (
                    <TableRow key={i}>
                      {parsedFile.headers.map((h) => (
                        <TableCell key={h} className="text-xs max-w-[120px] truncate">{row[h] ?? ""}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!parsedFile}
        className="gap-2"
      >
        Continuer — Configurer le mapping
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 2 — Mapping ──────────────────────────────────────────────────────────

interface Step2Props {
  parsedFile: ParsedFile;
  supplierId: string | null;
  mapping: Record<string, string>;
  setMapping: (m: Record<string, string>) => void;
  onBack: () => void;
  onApply: () => void;
  isApplying: boolean;
}

function MappingStep({ parsedFile, supplierId, mapping, setMapping, onBack, onApply, isApplying }: Step2Props) {
  const { data: templates } = useImportTemplates(supplierId);
  const saveTemplate = useSaveTemplate();
  const [templateName, setTemplateName] = useState("Template par défaut");
  const [tplDialogOpen, setTplDialogOpen] = useState(false);

  const handleFieldChange = (fieldKey: string, sourceCol: string) => {
    setMapping({ ...mapping, [fieldKey]: sourceCol === "_none" ? "" : sourceCol });
  };

  const loadTemplate = (tpl: { mapping: Record<string, string> }) => {
    setMapping(tpl.mapping);
  };

  const handleSaveTemplate = async () => {
    await saveTemplate.mutateAsync({ supplier_id: supplierId, name: templateName, mapping });
    setTplDialogOpen(false);
  };

  // Statistiques du mapping actuel
  const mappedFieldsCount = IMPORT_FIELDS.filter((f) => mapping[f.key]).length;
  const hasName = !!mapping.name;
  const previewMapped = applyMapping(parsedFile.preview, mapping);

  return (
    <div className="space-y-6">
      {/* Actions templates */}
      <div className="flex items-center gap-3 flex-wrap">
        {templates && templates.length > 0 && (
          <Select onValueChange={(id) => {
            const tpl = templates.find((t) => t.id === id);
            if (tpl) loadTemplate(tpl);
          }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Charger un template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMapping(autoDetectMapping(parsedFile.headers))}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          Auto-détecter
        </Button>

        <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Save className="h-4 w-4" />
              Sauvegarder template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sauvegarder le template</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Label>Nom du template</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              <Button className="w-full" onClick={handleSaveTemplate} disabled={!templateName}>
                Sauvegarder
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <span className="text-sm text-muted-foreground ml-auto">
          {mappedFieldsCount}/{IMPORT_FIELDS.length} champs mappés
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grille de mapping */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Correspondance des colonnes</h3>
          {IMPORT_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <div className="w-44 shrink-0">
                <span className="text-sm">{field.label}</span>
                {field.required && <span className="text-destructive ml-1 text-xs">*</span>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={mapping[field.key] || "_none"}
                onValueChange={(v) => handleFieldChange(field.key, v)}
              >
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="— Non mappé —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Non mappé —</SelectItem>
                  {parsedFile.headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Aperçu lignes mappées */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Aperçu (5 premières lignes)</h3>
          <div className="border rounded-lg overflow-hidden">
            <ScrollArea className="h-96">
              <div className="space-y-2 p-3">
                {previewMapped.map((row, i) => {
                  const errors = validateMappedRow(row);
                  return (
                    <div key={i} className={`p-2 rounded-md border text-xs space-y-1
                      ${errors.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-muted"}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium text-muted-foreground">#{i + 1}</span>
                        {errors.length > 0 && (
                          <Badge variant="destructive" className="text-xs py-0 px-1">{errors.length} erreur(s)</Badge>
                        )}
                      </div>
                      {IMPORT_FIELDS.filter((f) => mapping[f.key] && row[f.key]).map((f) => (
                        <div key={f.key} className="flex gap-2">
                          <span className="text-muted-foreground shrink-0 w-28">{f.label}:</span>
                          <span className="font-medium truncate">{row[f.key]}</span>
                        </div>
                      ))}
                      {errors.map((e, ei) => (
                        <div key={ei} className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {e}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={onApply}
          disabled={!hasName || isApplying}
          className="gap-2"
        >
          {isApplying ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Import en cours…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Lancer l'import ({parsedFile.rows.length} lignes)
            </>
          )}
        </Button>
        {!hasName && (
          <span className="text-sm text-destructive">Mapper le champ "Nom produit" (requis)</span>
        )}
      </div>
    </div>
  );
}

// ── Step 3 — Rapport ──────────────────────────────────────────────────────────

interface ReportStepProps {
  job: ImportJob;
  onNewImport: () => void;
}

function ReportStep({ job, onNewImport }: ReportStepProps) {
  const { data: rows, isLoading } = useImportJobRows(job.id);
  const rollback = useRollbackImportJob();

  const pct = job.total_rows > 0 ? Math.round((job.ok_rows / job.total_rows) * 100) : 0;

  const canRollback = ["done", "error"].includes(job.status) && job.ok_rows > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête rapport */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{job.total_rows}</p>
          <p className="text-xs text-muted-foreground mt-1">Lignes totales</p>
        </div>
        <div className="border rounded-lg p-4 text-center bg-emerald-50">
          <p className="text-2xl font-bold text-emerald-600">{job.ok_rows}</p>
          <p className="text-xs text-muted-foreground mt-1">Importées</p>
        </div>
        <div className="border rounded-lg p-4 text-center bg-red-50">
          <p className="text-2xl font-bold text-destructive">{job.error_rows}</p>
          <p className="text-xs text-muted-foreground mt-1">Erreurs</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{pct} %</p>
          <p className="text-xs text-muted-foreground mt-1">Taux de succès</p>
        </div>
      </div>

      {job.total_rows > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span>{pct} %</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      {/* Table des lignes */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Erreurs</TableHead>
                  <TableHead>ID produit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((row: ImportJobRow) => {
                  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.staging;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-muted-foreground text-xs">{row.row_index}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">
                        {row.mapped_data?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.mapped_data?.ean ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cfg.variant}
                          className={`text-xs ${ROW_STATUS_COLORS[row.status] ?? ""}`}
                        >
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px]">
                        {row.error_messages?.join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.product_id ? row.product_id.slice(0, 8) + "…" : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={onNewImport} className="gap-2">
          <Upload className="h-4 w-4" />
          Nouvel import
        </Button>

        {canRollback && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-4 w-4" />
                Rollback ({job.ok_rows} produit(s))
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler cet import ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Les {job.ok_rows} produit(s) importés seront restaurés à leur état
                  précédant l'import. Cette opération est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => rollback.mutate(job.id)}
                  disabled={rollback.isPending}
                >
                  Confirmer le rollback
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {job.status === "rolled_back" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Rollback effectué le {job.rolled_back_at
              ? format(new Date(job.rolled_back_at), "dd/MM/yyyy HH:mm", { locale: fr })
              : "—"}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Historique ─────────────────────────────────────────────────────────────────

function HistoryPanel({ onReopen }: { onReopen: (job: ImportJob) => void }) {
  const { data: jobs, isLoading } = useImportJobs();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <History className="h-4 w-4" />
        Imports récents
      </h3>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">OK / Erreurs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!jobs || jobs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Aucun import
                  </TableCell>
                </TableRow>
              )}
              {(jobs ?? []).map((job) => {
                const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.staging;
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-sm truncate max-w-[160px]">{job.filename}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.supplier?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(job.created_at), "dd/MM HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="text-emerald-600">{job.ok_rows}</span>
                      {" / "}
                      <span className="text-destructive">{job.error_rows}</span>
                    </TableCell>
                    <TableCell>
                      {["done", "error", "rolled_back"].includes(job.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReopen(job)}
                          className="text-xs"
                        >
                          Voir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

export default function AdminImportFournisseurs() {
  const [step, setStep]           = useState<WizardStep>(1);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [filename, setFilename]   = useState<string>("");
  const [mapping, setMapping]     = useState<Record<string, string>>({});
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);

  const createJob     = useCreateImportJob();
  const insertRows    = useInsertJobRows();
  const applyJob      = useApplyImportJob();

  const resetWizard = () => {
    setStep(1);
    setParsedFile(null);
    setFilename("");
    setMapping({});
    setCurrentJob(null);
  };

  const handleGoToMapping = () => {
    if (!parsedFile) return;
    // Auto-détecter au premier passage si le mapping est vide
    if (Object.keys(mapping).length === 0) {
      setMapping(autoDetectMapping(parsedFile.headers));
    }
    setStep(2);
  };

  const handleApplyImport = async () => {
    if (!parsedFile) return;

    try {
      // 1. Créer le job
      const job = await createJob.mutateAsync({
        supplier_id: supplierId,
        filename,
        total_rows: parsedFile.rows.length,
      });

      // 2. Mapper toutes les lignes
      const mappedRows = applyMapping(parsedFile.rows, mapping);

      // 3. Insérer les lignes en staging
      await insertRows.mutateAsync({
        jobId: job.id,
        rows: parsedFile.rows.map((rawRow, idx) => ({
          row_index: idx + 1,
          raw_data: rawRow,
          mapped_data: mappedRows[idx] ?? {},
        })),
      });

      // 4. Appeler la fonction d'import
      await applyJob.mutateAsync(job.id);

      // 5. Aller au rapport (recharger le job depuis l'état mis à jour)
      // Le job aura été mis à jour par l'edge function, on le stocke localement avec les dernières infos
      setCurrentJob({ ...job, status: "done" });
      setStep(3);
    } catch {
      // Les erreurs sont gérées via toast dans les hooks
    }
  };

  const isApplying = createJob.isPending || insertRows.isPending || applyJob.isPending;

  const STEP_LABELS: Record<WizardStep, string> = {
    1: "1 · Fichier",
    2: "2 · Mapping",
    3: "3 · Rapport",
  };

  return (
    <AdminLayout
      title="Import fournisseurs"
      description="Importez des catalogues fournisseurs (XLSX/CSV) avec mapping, staging et rollback."
    >
      <div className="space-y-8">
        {/* Indicateur d'étape */}
        {step < 3 && (
          <div className="flex items-center gap-2">
            {([1, 2] as WizardStep[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold
                  ${step === s ? "bg-primary text-primary-foreground"
                    : step > s ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
                  {STEP_LABELS[s]}
                </span>
                {s < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        )}

        {/* Étapes */}
        {step === 1 && (
          <UploadStep
            supplierId={supplierId}
            setSupplierId={setSupplierId}
            parsedFile={parsedFile}
            setParsedFile={setParsedFile}
            filename={filename}
            setFilename={setFilename}
            onNext={handleGoToMapping}
          />
        )}

        {step === 2 && parsedFile && (
          <MappingStep
            parsedFile={parsedFile}
            supplierId={supplierId}
            mapping={mapping}
            setMapping={setMapping}
            onBack={() => setStep(1)}
            onApply={handleApplyImport}
            isApplying={isApplying}
          />
        )}

        {step === 3 && currentJob && (
          <>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Import de «{currentJob.filename}» terminé</span>
            </div>
            <ReportStep job={currentJob} onNewImport={resetWizard} />
          </>
        )}

        {/* Historique (toujours visible en bas sauf pendant step 2) */}
        {step !== 2 && (
          <HistoryPanel
            onReopen={(job) => {
              setCurrentJob(job);
              setStep(3);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
