import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ImageOff, Download, Upload } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  STAMP_TYPE_LABELS,
  INK_COLOR_LABELS,
  CASE_COLOR_LABELS,
} from "@/components/stamp-designer/constants";

// ── Types ────────────────────────────────────────────────────────────────────

interface StampModelRow {
  id: string;
  name: string;
  brand: string;
  type: string;
  slug: string;
  width_mm: number;
  height_mm: number;
  max_lines: number;
  supports_logo: boolean;
  base_price_ht: number;
  base_price_ttc: number;
  tva_rate: number;
  image_url: string | null;
  available_ink_colors: string[];
  available_case_colors: string[];
  is_active: boolean;
  stock_quantity: number;
  display_order: number;
  description: string | null;
}

interface StampModelForm {
  name: string;
  brand: string;
  type: string;
  slug: string;
  width_mm: string;
  height_mm: string;
  max_lines: string;
  supports_logo: boolean;
  base_price_ht: string;
  base_price_ttc: string;
  tva_rate: string;
  description: string;
  image_url: string;
  available_ink_colors: string[];
  available_case_colors: string[];
  stock_quantity: string;
  display_order: string;
}

const BRANDS = ["Trodat", "Colop", "Générique"] as const;
const TYPES = ["auto-encreur", "bois", "dateur", "cachet-rond", "numeroteur"] as const;

const emptyForm: StampModelForm = {
  name: "",
  brand: "",
  type: "",
  slug: "",
  width_mm: "",
  height_mm: "",
  max_lines: "4",
  supports_logo: true,
  base_price_ht: "",
  base_price_ttc: "",
  tva_rate: "20",
  description: "",
  image_url: "",
  available_ink_colors: ["noir", "bleu", "rouge", "vert", "violet"],
  available_case_colors: ["noir", "bleu", "rouge"],
  stock_quantity: "100",
  display_order: "0",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminStampModels() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<StampModelRow | null>(null);
  const [form, setForm] = useState<StampModelForm>(emptyForm);
  const [autoSlug, setAutoSlug] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: models = [], isLoading } = useQuery<StampModelRow[]>({
    queryKey: ["admin-stamp-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stamp_models")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        width_mm: Number(row.width_mm),
        height_mm: Number(row.height_mm),
        base_price_ht: Number(row.base_price_ht),
        base_price_ttc: Number(row.base_price_ttc),
        tva_rate: Number(row.tva_rate),
        available_ink_colors: row.available_ink_colors as string[],
        available_case_colors: row.available_case_colors as string[],
      }));
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      data: Record<string, unknown>;
    }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("stamp_models")
          .update(payload.data as Record<string, unknown>)
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stamp_models")
          .insert(payload.data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stamp-models"] });
      queryClient.invalidateQueries({ queryKey: ["stamp-models"] });
      toast.success(editingId ? "Modèle mis à jour" : "Modèle créé");
      closeForm();
    },
    onError: (err: unknown) => {
      toast.error("Erreur : " + (err instanceof Error ? err.message : "inconnue"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stamp_models")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stamp-models"] });
      queryClient.invalidateQueries({ queryKey: ["stamp-models"] });
      toast.success("Modèle supprimé");
      setDeleteOpen(false);
      setDeletingModel(null);
    },
    onError: (err: unknown) => {
      toast.error("Erreur : " + (err instanceof Error ? err.message : "inconnue"));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("stamp_models")
        .update({ is_active } as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stamp-models"] });
      queryClient.invalidateQueries({ queryKey: ["stamp-models"] });
    },
    onError: (err: unknown) => {
      toast.error("Erreur : " + (err instanceof Error ? err.message : "inconnue"));
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setFormOpen(true);
  }

  function openEdit(model: StampModelRow) {
    setEditingId(model.id);
    setForm({
      name: model.name,
      brand: model.brand,
      type: model.type,
      slug: model.slug,
      width_mm: String(model.width_mm),
      height_mm: String(model.height_mm),
      max_lines: String(model.max_lines),
      supports_logo: model.supports_logo,
      base_price_ht: String(model.base_price_ht),
      base_price_ttc: String(model.base_price_ttc),
      tva_rate: String(model.tva_rate),
      description: model.description ?? "",
      image_url: model.image_url ?? "",
      available_ink_colors: model.available_ink_colors,
      available_case_colors: model.available_case_colors,
      stock_quantity: String(model.stock_quantity),
      display_order: String(model.display_order),
    });
    setAutoSlug(false);
    setFormOpen(true);
  }

  function openDelete(model: StampModelRow) {
    setDeletingModel(model);
    setDeleteOpen(true);
  }

  // Auto-generate slug when name changes
  useEffect(() => {
    if (autoSlug && form.name) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [form.name, autoSlug]);

  // Auto-calculate TTC when HT or TVA changes
  useEffect(() => {
    const ht = parseFloat(form.base_price_ht);
    const tva = parseFloat(form.tva_rate);
    if (!isNaN(ht) && !isNaN(tva)) {
      const ttc = ht * (1 + tva / 100);
      setForm((prev) => ({ ...prev, base_price_ttc: ttc.toFixed(2) }));
    }
  }, [form.base_price_ht, form.tva_rate]);

  function updateField<K extends keyof StampModelForm>(
    key: K,
    value: StampModelForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArrayItem(
    key: "available_ink_colors" | "available_case_colors",
    item: string
  ) {
    setForm((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(item)
          ? arr.filter((c) => c !== item)
          : [...arr, item],
      };
    });
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Le nom est requis.";
    if (!form.brand) return "La marque est requise.";
    if (!form.type) return "Le type est requis.";
    if (!form.slug.trim()) return "Le slug est requis.";
    const w = parseFloat(form.width_mm);
    const h = parseFloat(form.height_mm);
    if (isNaN(w) || w <= 0) return "La largeur doit être un nombre positif.";
    if (isNaN(h) || h <= 0) return "La hauteur doit être un nombre positif.";
    const ml = parseInt(form.max_lines);
    if (isNaN(ml) || ml <= 0) return "Le nombre de lignes doit être positif.";
    const priceHt = parseFloat(form.base_price_ht);
    if (isNaN(priceHt) || priceHt < 0) return "Le prix HT est invalide.";
    const priceTtc = parseFloat(form.base_price_ttc);
    if (isNaN(priceTtc) || priceTtc < 0) return "Le prix TTC est invalide.";
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      brand: form.brand,
      type: form.type,
      slug: form.slug.trim(),
      width_mm: parseFloat(form.width_mm),
      height_mm: parseFloat(form.height_mm),
      max_lines: parseInt(form.max_lines),
      supports_logo: form.supports_logo,
      base_price_ht: parseFloat(form.base_price_ht),
      base_price_ttc: parseFloat(form.base_price_ttc),
      tva_rate: parseFloat(form.tva_rate),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      available_ink_colors: form.available_ink_colors,
      available_case_colors: form.available_case_colors,
      stock_quantity: parseInt(form.stock_quantity) || 100,
      display_order: parseInt(form.display_order) || 0,
    };

    saveMutation.mutate({ id: editingId ?? undefined, data: payload });
  }

  // ── Export CSV ──────────────────────────────────────────────────────────

  function exportCSV() {
    const SEP = ";";
    const headers = ["ref", "designation", "marque", "type", "largeur_mm", "hauteur_mm", "prix_ht", "prix_ttc", "tva", "stock", "actif"];
    const lines = models.map((m) =>
      [
        m.slug,
        m.name,
        m.brand,
        m.type,
        m.width_mm,
        m.height_mm,
        m.base_price_ht,
        m.base_price_ttc,
        m.tva_rate,
        m.stock_quantity,
        m.is_active ? "oui" : "non",
      ].join(SEP)
    );
    const csv = [headers.join(SEP), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `tampons-export-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${models.length} modèles exportés`);
  }

  // ── Import CSV ──────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("Fichier CSV vide ou format invalide");
        return;
      }
      setImportRows(rows);
    };
    reader.readAsText(file, "utf-8");
  }

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(sep).map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    }).filter((r) => r.ref || r.designation);
  }

  async function handleImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    let created = 0, updated = 0, errors = 0;

    for (const row of importRows) {
      const slug = (row.ref || "").trim();
      const name = (row.designation || "").trim();
      if (!slug || !name) { errors++; continue; }

      const payload: Record<string, unknown> = {
        slug,
        name,
        brand: row.marque || "Générique",
        type: row.type || "auto-encreur",
        width_mm: parseFloat(row.largeur_mm) || 47,
        height_mm: parseFloat(row.hauteur_mm) || 18,
        base_price_ht: parseFloat(row.prix_ht) || 0,
        base_price_ttc: parseFloat(row.prix_ttc) || 0,
        tva_rate: parseFloat(row.tva) || 20,
        stock_quantity: parseInt(row.stock) || 100,
        is_active: row.actif ? row.actif.toLowerCase() !== "non" : true,
      };

      const existing = models.find((m) => m.slug === slug);
      if (existing) {
        const { error } = await supabase
          .from("stamp_models")
          .update(payload as Record<string, unknown>)
          .eq("id", existing.id);
        if (error) { errors++; } else { updated++; }
      } else {
        const { error } = await supabase
          .from("stamp_models")
          .insert({ ...payload, max_lines: 4, supports_logo: true } as any);
        if (error) { errors++; } else { created++; }
      }
    }

    setImporting(false);
    setImportOpen(false);
    setImportRows([]);
    queryClient.invalidateQueries({ queryKey: ["admin-stamp-models"] });
    queryClient.invalidateQueries({ queryKey: ["stamp-models"] });

    const parts = [];
    if (created) parts.push(`${created} créé${created > 1 ? "s" : ""}`);
    if (updated) parts.push(`${updated} mis à jour`);
    if (errors) parts.push(`${errors} erreur${errors > 1 ? "s" : ""}`);
    toast.success(`Import terminé : ${parts.join(", ")}`);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Tampons"
      description="Gérer le catalogue de corps de tampons personnalisables"
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {models.length} modèle{models.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
          <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter un modèle
              </Button>
            </DialogTrigger>

          {/* ── Add / Edit Dialog ─────────────────────────────────────── */}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier le modèle" : "Nouveau modèle"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Trodat Printy 4912"
                />
              </div>

              {/* Brand + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Marque *</Label>
                  <Select
                    value={form.brand}
                    onValueChange={(v) => updateField("brand", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateField("type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {STAMP_TYPE_LABELS[t] ?? t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Slug */}
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    updateField("slug", e.target.value);
                  }}
                  placeholder="trodat-printy-4912"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-généré depuis le nom. Modifiable manuellement.
                </p>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="width_mm">Largeur (mm) *</Label>
                  <Input
                    id="width_mm"
                    type="number"
                    step="0.1"
                    value={form.width_mm}
                    onChange={(e) => updateField("width_mm", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="height_mm">Hauteur (mm) *</Label>
                  <Input
                    id="height_mm"
                    type="number"
                    step="0.1"
                    value={form.height_mm}
                    onChange={(e) => updateField("height_mm", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_lines">Lignes max *</Label>
                  <Input
                    id="max_lines"
                    type="number"
                    value={form.max_lines}
                    onChange={(e) => updateField("max_lines", e.target.value)}
                  />
                </div>
              </div>

              {/* Supports logo */}
              <div className="flex items-center gap-3">
                <Switch
                  id="supports_logo"
                  checked={form.supports_logo}
                  onCheckedChange={(v) => updateField("supports_logo", v)}
                />
                <Label htmlFor="supports_logo">Supporte un logo</Label>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="base_price_ht">Prix HT *</Label>
                  <Input
                    id="base_price_ht"
                    type="number"
                    step="0.01"
                    value={form.base_price_ht}
                    onChange={(e) =>
                      updateField("base_price_ht", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tva_rate">TVA (%)</Label>
                  <Input
                    id="tva_rate"
                    type="number"
                    step="0.01"
                    value={form.tva_rate}
                    onChange={(e) => updateField("tva_rate", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="base_price_ttc">Prix TTC *</Label>
                  <Input
                    id="base_price_ttc"
                    type="number"
                    step="0.01"
                    value={form.base_price_ttc}
                    onChange={(e) =>
                      updateField("base_price_ttc", e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Calculé auto, modifiable
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Description du modèle..."
                />
              </div>

              {/* Image URL */}
              <div className="grid gap-2">
                <Label htmlFor="image_url">URL image</Label>
                <Input
                  id="image_url"
                  value={form.image_url}
                  onChange={(e) => updateField("image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Ink colors */}
              <div className="grid gap-2">
                <Label>Couleurs d'encre disponibles</Label>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(INK_COLOR_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={form.available_ink_colors.includes(key)}
                        onCheckedChange={() =>
                          toggleArrayItem("available_ink_colors", key)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Case colors */}
              <div className="grid gap-2">
                <Label>Couleurs de boîtier disponibles</Label>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(CASE_COLOR_LABELS).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={form.available_case_colors.includes(key)}
                        onCheckedChange={() =>
                          toggleArrayItem("available_case_colors", key)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Stock + display order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock_quantity">Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={form.stock_quantity}
                    onChange={(e) =>
                      updateField("stock_quantity", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="display_order">Ordre d'affichage</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      updateField("display_order", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeForm}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? "Enregistrement..."
                  : editingId
                  ? "Mettre à jour"
                  : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Dimensions (LxH mm)</TableHead>
                <TableHead className="text-right">Prix TTC</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Aucun modèle de tampon.
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      {model.image_url ? (
                        <img
                          src={model.image_url}
                          alt={model.name}
                          className="h-10 w-10 rounded object-contain bg-gray-50"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.brand}</Badge>
                    </TableCell>
                    <TableCell>
                      {STAMP_TYPE_LABELS[model.type] ?? model.type}
                    </TableCell>
                    <TableCell className="text-right">
                      {model.width_mm} x {model.height_mm}
                    </TableCell>
                    <TableCell className="text-right">
                      {model.base_price_ttc.toFixed(2)}&nbsp;&euro;
                    </TableCell>
                    <TableCell className="text-right">
                      {model.stock_quantity}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            id: model.id,
                            is_active: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(model)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(model)}
                          title="Supprimer"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Delete confirmation dialog ──────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer le modèle{" "}
            <strong>{deletingModel?.name}</strong> ? Cette action est
            irréversible.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingModel(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingModel && deleteMutation.mutate(deletingModel.id)}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import CSV dialog ──────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setImportRows([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer un fichier CSV</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fichier CSV</Label>
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-muted-foreground">
                Colonnes attendues : ref ; designation ; marque ; type ; largeur_mm ; hauteur_mm ; prix_ht ; prix_ttc ; tva ; stock ; actif
              </p>
            </div>

            {importRows.length > 0 && (
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead>Marque</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-right">Prix TTC</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, i) => {
                      const exists = models.some((m) => m.slug === row.ref);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.ref}</TableCell>
                          <TableCell>{row.designation}</TableCell>
                          <TableCell>{row.marque}</TableCell>
                          <TableCell className="text-right">{row.prix_ht}</TableCell>
                          <TableCell className="text-right">{row.prix_ttc}</TableCell>
                          <TableCell className="text-right">{row.stock}</TableCell>
                          <TableCell>
                            <Badge variant={exists ? "secondary" : "default"}>
                              {exists ? "Mise à jour" : "Nouveau"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportRows([]); }}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={importRows.length === 0 || importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Import en cours..." : `Importer ${importRows.length} ligne${importRows.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
