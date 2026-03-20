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

interface PhotoPricing {
  id: string;
  type: string;
  format: string;
  unit_price: number;
  pack_price: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = Omit<PhotoPricing, "id" | "created_at" | "updated_at">;

const EMPTY_FORM: FormData = {
  type: "identite",
  format: "",
  unit_price: 0,
  pack_price: null,
  active: true,
};

const TYPE_LABELS: Record<string, string> = {
  identite: "Photo d'identité",
  tirage: "Tirage photo",
  toile: "Impression sur toile",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPhotos() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["service_photos_pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_photos_pricing" as never)
        .select("*")
        .order("type")
        .order("format");
      if (error) throw error;
      return data as unknown as PhotoPricing[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (d: FormData & { id?: string }) => {
      const payload = {
        type: d.type,
        format: d.format,
        unit_price: d.unit_price,
        pack_price: d.pack_price,
        active: d.active,
        updated_at: new Date().toISOString(),
      };
      if (d.id) {
        const { error } = await supabase
          .from("service_photos_pricing" as never)
          .update(payload as never)
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("service_photos_pricing" as never)
          .insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service_photos_pricing"] });
      toast.success(editId ? "Tarif mis à jour" : "Tarif créé");
      closeDialog();
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_photos_pricing" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service_photos_pricing"] });
      toast.success("Tarif supprimé");
    },
    onError: (e) => toast.error(`Erreur : ${e.message}`),
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: PhotoPricing) {
    setEditId(item.id);
    setForm({
      type: item.type,
      format: item.format,
      unit_price: item.unit_price,
      pack_price: item.pack_price,
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
    <AdminLayout title="Photos & Identité" description="Gérer les tarifs du service photos et tirages">
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
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Prix pack</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun tarif configuré</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{TYPE_LABELS[item.type] ?? item.type}</TableCell>
                    <TableCell>{item.format}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unit_price).toFixed(2)} €</TableCell>
                    <TableCell className="text-right font-mono">{item.pack_price != null ? `${Number(item.pack_price).toFixed(2)} €` : "—"}</TableCell>
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

        <TabsContent value="parametres">
          <Card>
            <CardHeader><CardTitle>Paramètres du service Photos</CardTitle></CardHeader>
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
                  <p className="font-medium">Borne photo en libre-service</p>
                  <p className="text-sm text-muted-foreground">La borne est disponible en magasin</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Photos d'identité ANTS</p>
                  <p className="text-sm text-muted-foreground">Service de photos conformes aux normes ANTS</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Délai moyen</Label>
                <Input defaultValue="Immédiat (borne) / 24h (toile)" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Photos ce mois</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA Photos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Type le + demandé</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">—</p><p className="text-xs text-muted-foreground">Statistiques bientôt disponibles</p></CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le tarif" : "Ajouter un tarif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identite">Photo d'identité</SelectItem>
                    <SelectItem value="tirage">Tirage photo</SelectItem>
                    <SelectItem value="toile">Impression sur toile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Input value={form.format} onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))} placeholder="Ex: 10x15 cm, 35x45 mm (x4)…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix unitaire (€)</Label>
                <Input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Prix pack (€)</Label>
                <Input type="number" step="0.01" min="0" value={form.pack_price ?? ""} onChange={(e) => setForm((p) => ({ ...p, pack_price: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="Optionnel" />
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
