import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, GitMerge, Network, BarChart3, Search } from "lucide-react";
import {
  useAllProductRelations,
  useCreateRelation,
  useDeleteRelation,
  useAllCompatibility,
  useCreateCompatibility,
  useDeleteCompatibility,
  useRecommendationStats,
  RELATION_LABELS,
  type RelationType,
} from "@/hooks/useRecommendations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Petite hook pour chercher des produits ────────────────────────────────────

function useProductSearch(q: string) {
  return useQuery({
    queryKey: ["product-search-reco", q],
    enabled: q.length >= 2,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category")
        .eq("is_active", true)
        .ilike("name", `%${q}%`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Onglet Relations ──────────────────────────────────────────────────────────

function RelationsTab() {
  const [filterType, setFilterType] = useState<RelationType | "all">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Dialog state
  const [srcQ, setSrcQ] = useState("");
  const [tgtQ, setTgtQ] = useState("");
  const [srcId, setSrcId] = useState("");
  const [tgtId, setTgtId] = useState("");
  const [relType, setRelType] = useState<RelationType>("complement");

  const { data: relations, isLoading } = useAllProductRelations(
    filterType === "all"
      ? { search: search || undefined }
      : { type: filterType, search: search || undefined },
  );
  const createRel = useCreateRelation();
  const deleteRel = useDeleteRelation();

  const { data: srcResults } = useProductSearch(srcQ);
  const { data: tgtResults } = useProductSearch(tgtQ);

  const handleCreate = async () => {
    if (!srcId || !tgtId) return;
    await createRel.mutateAsync({ product_id: srcId, related_product_id: tgtId, relation_type: relType });
    setDialogOpen(false);
    setSrcQ(""); setTgtQ(""); setSrcId(""); setTgtId("");
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit…"
            className="pl-8 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as RelationType | "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.entries(RELATION_LABELS) as [RelationType, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto gap-1">
              <Plus className="h-4 w-4" />
              Nouvelle relation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter une relation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Produit source */}
              <div className="space-y-1">
                <Label>Produit source</Label>
                <Input
                  placeholder="Rechercher…"
                  value={srcQ}
                  onChange={(e) => { setSrcQ(e.target.value); setSrcId(""); }}
                />
                {srcResults && srcResults.length > 0 && !srcId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {srcResults.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => { setSrcId(p.id); setSrcQ(p.name); }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label>Type de relation</Label>
                <Select value={relType} onValueChange={(v) => setRelType(v as RelationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RELATION_LABELS) as [RelationType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Produit cible */}
              <div className="space-y-1">
                <Label>Produit lié</Label>
                <Input
                  placeholder="Rechercher…"
                  value={tgtQ}
                  onChange={(e) => { setTgtQ(e.target.value); setTgtId(""); }}
                />
                {tgtResults && tgtResults.length > 0 && !tgtId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {tgtResults.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => { setTgtId(p.id); setTgtQ(p.name); }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!srcId || !tgtId || createRel.isPending}
              >
                Créer la relation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Produit lié</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!relations || relations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucune relation
                  </TableCell>
                </TableRow>
              )}
              {(relations ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.product?.name ?? <span className="text-muted-foreground text-xs">{r.product_id.slice(0, 8)}…</span>}
                    {r.product?.category && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.product.category}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {RELATION_LABELS[r.relation_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.related_product?.name ?? <span className="text-muted-foreground text-xs">{r.related_product_id.slice(0, 8)}…</span>}
                    {r.related_product?.category && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.related_product.category}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette relation ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La relation entre {r.product?.name} et {r.related_product?.name} sera supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteRel.mutate(r.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Onglet Compatibilité ──────────────────────────────────────────────────────

function CompatibilityTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [srcQ, setSrcQ] = useState("");
  const [tgtQ, setTgtQ] = useState("");
  const [srcId, setSrcId] = useState("");
  const [tgtId, setTgtId] = useState("");
  const [note, setNote] = useState("");

  const { data: entries, isLoading } = useAllCompatibility();
  const createCompat = useCreateCompatibility();
  const deleteCompat = useDeleteCompatibility();

  const { data: srcResults } = useProductSearch(srcQ);
  const { data: tgtResults } = useProductSearch(tgtQ);

  const handleCreate = async () => {
    if (!srcId || !tgtId) return;
    await createCompat.mutateAsync({
      product_id: srcId,
      compatible_product_id: tgtId,
      compatibility_note: note || undefined,
      is_bidirectional: true,
    });
    setDialogOpen(false);
    setSrcQ(""); setTgtQ(""); setSrcId(""); setTgtId(""); setNote("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nouvelle compatibilité
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Déclarer une compatibilité</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Produit A</Label>
                <Input
                  placeholder="Rechercher…"
                  value={srcQ}
                  onChange={(e) => { setSrcQ(e.target.value); setSrcId(""); }}
                />
                {srcResults && srcResults.length > 0 && !srcId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {srcResults.map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => { setSrcId(p.id); setSrcQ(p.name); }}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Produit B (compatible avec A)</Label>
                <Input
                  placeholder="Rechercher…"
                  value={tgtQ}
                  onChange={(e) => { setTgtQ(e.target.value); setTgtId(""); }}
                />
                {tgtResults && tgtResults.length > 0 && !tgtId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {tgtResults.map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => { setTgtId(p.id); setTgtQ(p.name); }}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Note de compatibilité (optionnel)</Label>
                <Textarea
                  placeholder="Ex : Cartouche compatible avec cette imprimante"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={!srcId || !tgtId || createCompat.isPending}
              >
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit A</TableHead>
                <TableHead>Produit B</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Bidirectionnel</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!entries || entries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucune compatibilité déclarée
                  </TableCell>
                </TableRow>
              )}
              {(entries ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.product?.name ?? e.product_id}</TableCell>
                  <TableCell>{e.compatible_product?.name ?? e.compatible_product_id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.compatibility_note ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.is_bidirectional ? "default" : "outline"} className="text-xs">
                      {e.is_bidirectional ? "Oui" : "Non"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette compatibilité ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La compatibilité entre {e.product?.name} et {e.compatible_product?.name} sera supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteCompat.mutate(e.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Onglet Statistiques CTR ───────────────────────────────────────────────────

const PLACEMENT_LABEL: Record<string, string> = {
  product_page: "Fiche produit",
  cart: "Panier",
};

function StatsTab() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = useRecommendationStats(days);

  const totalShown   = (stats ?? []).reduce((s, r) => s + r.shown,   0);
  const totalClicked = (stats ?? []).reduce((s, r) => s + r.clicked, 0);
  const totalAdded   = (stats ?? []).reduce((s, r) => s + r.added,   0);
  const globalCtr    = totalShown > 0 ? Math.round((totalClicked / totalShown) * 1000) / 10 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Période :</Label>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Affichages", value: totalShown },
          { label: "Clics", value: totalClicked },
          { label: "Ajouts panier", value: totalAdded },
          { label: "CTR global", value: `${globalCtr} %` },
        ].map((kpi) => (
          <div key={kpi.label} className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Détail par type × placement */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Emplacement</TableHead>
                <TableHead className="text-right">Affichages</TableHead>
                <TableHead className="text-right">Clics</TableHead>
                <TableHead className="text-right">Ajouts</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!stats || stats.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucune donnée sur cette période
                  </TableCell>
                </TableRow>
              )}
              {(stats ?? []).sort((a, b) => b.shown - a.shown).map((row) => (
                <TableRow key={`${row.relation_type}-${row.placement}`}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {RELATION_LABELS[row.relation_type as RelationType] ?? row.relation_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {PLACEMENT_LABEL[row.placement] ?? row.placement}
                  </TableCell>
                  <TableCell className="text-right">{row.shown}</TableCell>
                  <TableCell className="text-right">{row.clicked}</TableCell>
                  <TableCell className="text-right">{row.added}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={row.ctr >= 5 ? "text-emerald-600" : row.ctr >= 2 ? "text-amber-600" : "text-muted-foreground"}>
                      {row.ctr} %
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.conversion >= 2 ? "text-emerald-600" : "text-muted-foreground"}>
                      {row.conversion} %
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminRecommendations() {
  return (
    <AdminLayout
      title="Recommandations intelligentes"
      description="Gérez les relations produits, les compatibilités et analysez les performances CTR."
    >
      <Tabs defaultValue="relations">
        <TabsList className="mb-6">
          <TabsTrigger value="relations" className="gap-2">
            <GitMerge className="h-4 w-4" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="compatibility" className="gap-2">
            <Network className="h-4 w-4" />
            Compatibilités
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="relations">
          <RelationsTab />
        </TabsContent>
        <TabsContent value="compatibility">
          <CompatibilityTab />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
