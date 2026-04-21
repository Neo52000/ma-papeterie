import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, Percent, RefreshCw, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAllB2BAccounts, useB2BAccountMutations } from "@/hooks/useB2BAccount";

export default function AdminB2B() {
  const queryClient = useQueryClient();
  const [newGrid, setNewGrid] = useState({
    name: "",
    customer_type: "entreprise",
    discount_percent: 0,
    min_order_amount: 0,
    description: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  interface B2BGrid {
    id: string;
    name: string;
    customer_type: string;
    discount_percent: number;
    min_order_amount: number;
    description: string;
    is_active: boolean;
    created_at: string;
  }

  interface B2BAssignment {
    id: string;
    user_id: string;
    grid_id: string;
    assigned_at: string;
    profiles: { display_name: string } | null;
  }

  const { data: grids, isLoading } = useQuery({
    queryKey: ["b2b-grids"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("b2b_price_grids")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as B2BGrid[];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["b2b-assignments"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("b2b_customer_grids")
        .select("*, profiles:user_id(display_name)")
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data as B2BAssignment[];
    },
  });


  const createGrid = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("b2b_price_grids")
        .insert(newGrid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grille B2B créée");
      queryClient.invalidateQueries({ queryKey: ["b2b-grids"] });
      setDialogOpen(false);
      setNewGrid({ name: "", customer_type: "entreprise", discount_percent: 0, min_order_amount: 0, description: "" });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const deleteGrid = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("b2b_price_grids")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grille supprimée");
      queryClient.invalidateQueries({ queryKey: ["b2b-grids"] });
    },
  });

  const toggleGrid = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("b2b_price_grids")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-grids"] });
    },
  });

  return (
    <AdminLayout title="Grilles Tarifaires B2B" description="Gestion des remises par type de client, catégorie et volume">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Percent className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{grids?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Grilles tarifaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{assignments?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Clients assignés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Percent className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{grids?.filter((g) => g.is_active).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Grilles actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Grilles tarifaires</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Nouvelle grille</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une grille B2B</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nom</Label>
                      <Input value={newGrid.name} onChange={e => setNewGrid(g => ({ ...g, name: e.target.value }))} placeholder="Ex: Entreprises locales" />
                    </div>
                    <div>
                      <Label>Type de client</Label>
                      <Select value={newGrid.customer_type} onValueChange={v => setNewGrid(g => ({ ...g, customer_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entreprise">Entreprise</SelectItem>
                          <SelectItem value="association">Association</SelectItem>
                          <SelectItem value="mairie">Mairie</SelectItem>
                          <SelectItem value="ecole">École</SelectItem>
                          <SelectItem value="artisan">Artisan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Remise globale (%)</Label>
                      <Input type="number" value={newGrid.discount_percent} onChange={e => setNewGrid(g => ({ ...g, discount_percent: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Montant minimum de commande (€)</Label>
                      <Input type="number" value={newGrid.min_order_amount} onChange={e => setNewGrid(g => ({ ...g, min_order_amount: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={newGrid.description} onChange={e => setNewGrid(g => ({ ...g, description: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => createGrid.mutate()} disabled={!newGrid.name || createGrid.isPending}>
                      Créer la grille
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type client</TableHead>
                    <TableHead className="text-right">Remise</TableHead>
                    <TableHead className="text-right">Min. commande</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grids?.map((grid) => (
                    <TableRow key={grid.id}>
                      <TableCell className="font-medium">{grid.name}</TableCell>
                      <TableCell><Badge variant="outline">{grid.customer_type}</Badge></TableCell>
                      <TableCell className="text-right font-bold">{grid.discount_percent}%</TableCell>
                      <TableCell className="text-right">{grid.min_order_amount}€</TableCell>
                      <TableCell>
                        <Badge
                          className={grid.is_active ? "bg-primary/10 text-primary cursor-pointer" : "cursor-pointer"}
                          variant={grid.is_active ? "default" : "secondary"}
                          onClick={() => toggleGrid.mutate({ id: grid.id, is_active: !grid.is_active })}
                        >
                          {grid.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(grid.created_at), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteGrid.mutate(grid.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!grids || grids.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucune grille B2B — créez-en une pour commencer
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <B2BAccountsSection />
      </div>
    </AdminLayout>
  );
}

// ─── Section dédiée : comptes B2B (société) avec re-sync SIRENE ──────────────

function B2BAccountsSection() {
  const { data: accounts, isLoading } = useAllB2BAccounts();
  const { syncFromSirene } = useB2BAccountMutations();

  const sirenDisplay = (s: string | null | undefined) =>
    s ? s.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Comptes B2B
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Société</TableHead>
                <TableHead>SIREN</TableHead>
                <TableHead>NAF</TableHead>
                <TableHead>Effectif</TableHead>
                <TableHead>Dernière sync INSEE</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{a.name}</span>
                      {a.siret && (
                        <span className="text-xs text-muted-foreground font-mono">
                          SIRET {a.siret}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sirenDisplay(a.siren)}</TableCell>
                  <TableCell>
                    {a.naf_code ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-mono">{a.naf_code}</span>
                        {a.naf_label && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {a.naf_label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{a.employee_range || "—"}</TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground"
                    title={a.sirene_synced_at || ""}
                  >
                    {a.sirene_synced_at
                      ? format(new Date(a.sirene_synced_at), "dd/MM/yyyy", { locale: fr })
                      : "Jamais"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!a.siret || syncFromSirene.isPending}
                      onClick={() => syncFromSirene.mutate(a.id)}
                      title={!a.siret ? "SIRET manquant" : "Mettre à jour depuis data.gouv"}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1 ${
                          syncFromSirene.isPending ? "animate-spin" : ""
                        }`}
                      />
                      Re-sync SIRENE
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!accounts || accounts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun compte B2B pour l'instant
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
