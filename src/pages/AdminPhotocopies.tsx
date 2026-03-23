import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PhotocopiePricing {
  id: string;
  format: string;
  color: string;
  recto_verso: boolean;
  unit_price: number;
  lot_10_price: number | null;
  lot_100_price: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = Omit<PhotocopiePricing, "id" | "created_at" | "updated_at">;

const EMPTY_FORM: FormData = {
  format: "A4",
  color: "nb",
  recto_verso: false,
  unit_price: 0,
  lot_10_price: null,
  lot_100_price: null,
  active: true,
};

const COLOR_LABELS: Record<string, string> = { nb: "Noir & Blanc", couleur: "Couleur" };

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPhotocopies() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["service_photocopies_pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_photocopies_pricing" as never)
        .select("*")
        .order("format")
        .order("color")
        .order("recto_verso");
      if (error) throw error;
      return data as unknown as PhotocopiePricing[];
    },
  });

  // ── Upsert ─────────────────────────────────────────────────────────────────
  const upsert = useMutation({
    mutationFn: async (d: FormData & { id?: string }) => {
      const payload = {
        format: d.format,
        color: d.color,
        recto_verso: d.recto_verso,
        unit_price: d.unit_price,
        lot_10_price: d.lot_10_price,
        lot_100_price: d.lot_100_price,
        active: d.active,
        updated_at: new Date().toISOString(),
      };
      if (d.id) {
        const { error } = await supabase
          .from("service_photocopies_pricing" as never)
          .update(payload as never)
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_photocopies_pricing" as never)
          .insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service_photocopies_pricing"] });
      toast.success(editId ? "Tarif mis à jour" : "Tarif créé");
      closeDialog();
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_photocopies_pricing" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service_photocopies_pricing"] });
      toast.success("Tarif supprimé");
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: PhotocopiePricing) {
    setEditId(item.id);
    setForm({
      format: item.format,
      color: item.color,
      recto_verso: item.recto_verso,
      unit_price: item.unit_price,
      lot_10_price: item.lot_10_price,
      lot_100_price: item.lot_100_price,
      active: item.active,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    upsert.mutate({ ...form, id: editId ?? undefined });
  }

  const activeCount = items.filter((i) => i.active).length;

  return (
    <AdminLayout title="Photocopies" description="Gérer les tarifs du service photocopies">
      <Tabs defaultValue="tarifs" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tarifs">Tarifs</TabsTrigger>
            <TabsTrigger value="parametres">Paramètres</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Ajouter un tarif
          </Button>
        </div>

        {/* ── Tab Tarifs ────────────────────────────────────────────────────── */}
        <TabsContent value="tarifs" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total tarifs</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{items.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Actifs</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{activeCount}</p></CardContent>
            </Card>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Format</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recto/Verso</TableHead>
                  <TableHead className="text-right">Unitaire</TableHead>
                  <TableHead className="text-right">Lot 10</TableHead>
                  <TableHead className="text-right">Lot 100</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun tarif configuré</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.format}</TableCell>
                    <TableCell>{COLOR_LABELS[item.color] ?? item.color}</TableCell>
                    <TableCell>{item.recto_verso ? "Recto-verso" : "Recto"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unit_price).toFixed(3)} €</TableCell>
                    <TableCell className="text-right font-mono">{item.lot_10_price != null ? `${Number(item.lot_10_price).toFixed(3)} €` : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{item.lot_100_price != null ? `${Number(item.lot_100_price).toFixed(3)} €` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Actif" : "Inactif"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Tab Paramètres ────────────────────────────────────────────────── */}
        <TabsContent value="parametres">
          <Card>
            <CardHeader><CardTitle>Paramètres du service Photocopies</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Service actif</p>
                  <p className="text-sm text-muted-foreground">Afficher le service sur le site public</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sans rendez-vous</p>
                  <p className="text-sm text-muted-foreground">Service disponible sans rendez-vous</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Délai moyen</Label>
                <Input defaultValue="Immédiat" />
              </div>
              <div className="space-y-2">
                <Label>Formats acceptés</Label>
                <Input defaultValue="A4, A3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Stats ─────────────────────────────────────────────────────── */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Copies ce mois</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA Photocopies</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Moy. / jour</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Ajout/Édition ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le tarif" : "Ajouter un tarif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm((p) => ({ ...p, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.color} onValueChange={(v) => setForm((p) => ({ ...p, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nb">Noir & Blanc</SelectItem>
                    <SelectItem value="couleur">Couleur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.recto_verso} onCheckedChange={(v) => setForm((p) => ({ ...p, recto_verso: v }))} />
              <Label>Recto-verso</Label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prix unitaire (€)</Label>
                <Input type="number" step="0.001" min="0" value={form.unit_price} onChange={(e) => setForm((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Prix lot 10 (€)</Label>
                <Input type="number" step="0.001" min="0" value={form.lot_10_price ?? ""} onChange={(e) => setForm((p) => ({ ...p, lot_10_price: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Prix lot 100 (€)</Label>
                <Input type="number" step="0.001" min="0" value={form.lot_100_price ?? ""} onChange={(e) => setForm((p) => ({ ...p, lot_100_price: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
              <Label>Actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={upsert.isPending}>
              {upsert.isPending ? "Enregistrement…" : editId ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
