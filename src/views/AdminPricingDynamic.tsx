import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Edit, Play, CheckCircle, RotateCcw, Loader2,
  TrendingUp, TrendingDown, AlertTriangle, History,
} from "lucide-react";
import {
  useRulesets, useCreateRuleset, useUpdateRuleset, useDeleteRuleset,
  useRulesetRules, useCreateRule, useUpdateRule, useDeleteRule,
  useSimulations, useSimulationItems, useRunSimulation, useApplySimulation, useRollbackSimulation,
  usePriceChangesLog,
  type PricingRuleset, type PricingRulesetRule, type RuleType, type RuleParams,
  type PricingSimulation,
} from "@/hooks/usePricingDynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  seasonality: "Saisonnalité",
  low_stock: "Stock faible",
  low_rotation: "Rotation faible",
  margin_guard: "Garde-fou marge",
};

const RULE_TYPE_COLORS: Record<RuleType, string> = {
  seasonality: "bg-blue-100 text-blue-800",
  low_stock: "bg-orange-100 text-orange-800",
  low_rotation: "bg-purple-100 text-purple-800",
  margin_guard: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Prête",
  applied: "Appliquée",
  rolled_back: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-yellow-100 text-yellow-800",
  applied: "bg-green-100 text-green-800",
  rolled_back: "bg-gray-100 text-gray-600",
};

function formatParams(rule: PricingRulesetRule): string {
  const p = rule.params;
  switch (rule.rule_type) {
    case "seasonality":
      return `Mois ${(p.months ?? [8, 9]).join(",")} → +${p.adjustment_percent ?? 10}%`;
    case "low_stock":
      return `Stock ≤ ${p.threshold ?? 5} → +${p.adjustment_percent ?? 10}%`;
    case "low_rotation":
      return `Pas de vente depuis ${p.days_without_sale ?? 60}j → -${p.discount_percent ?? 15}%`;
    case "margin_guard":
      return `Marge min ${p.min_margin_percent ?? 15}%`;
    default:
      return JSON.stringify(p);
  }
}

// ── Dialog: Ruleset ───────────────────────────────────────────────────────────

interface RulesetDialogProps {
  open: boolean;
  initial?: PricingRuleset | null;
  onClose: () => void;
}

function RulesetDialog({ open, initial, onClose }: RulesetDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const create = useCreateRuleset();
  const update = useUpdateRuleset();

  const saving = create.isPending || update.isPending;

  const handleSave = () => {
    if (!name.trim()) return;
    if (initial) {
      update.mutate({ id: initial.id, name, description }, { onSuccess: onClose });
    } else {
      create.mutate({ name, description }, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le ruleset" : "Nouveau ruleset"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Rentrée scolaire 2026" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectif et périmètre de ce jeu de règles…"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Règle ─────────────────────────────────────────────────────────────

interface RuleDialogProps {
  open: boolean;
  rulesetId: string;
  initial?: PricingRulesetRule | null;
  onClose: () => void;
}

function RuleDialog({ open, rulesetId, initial, onClose }: RuleDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ruleType, setRuleType] = useState<RuleType>(initial?.rule_type ?? "seasonality");
  const [priority, setPriority] = useState(String(initial?.priority ?? 10));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  // params fields
  const p = initial?.params ?? {};
  const [months, setMonths] = useState(String((p.months ?? [8, 9]).join(",")));
  const [adjustPct, setAdjustPct] = useState(String(p.adjustment_percent ?? 10));
  const [threshold, setThreshold] = useState(String(p.threshold ?? 5));
  const [lowStockPct, setLowStockPct] = useState(String(p.adjustment_percent ?? 10));
  const [daysWithout, setDaysWithout] = useState(String(p.days_without_sale ?? 60));
  const [discountPct, setDiscountPct] = useState(String(p.discount_percent ?? 15));
  const [minMargin, setMinMargin] = useState(String(p.min_margin_percent ?? 15));

  const create = useCreateRule();
  const update = useUpdateRule();
  const saving = create.isPending || update.isPending;

  const buildParams = (): RuleParams => {
    switch (ruleType) {
      case "seasonality":
        return {
          months: months.split(",").map((m) => parseInt(m.trim())).filter((m) => !isNaN(m) && m >= 1 && m <= 12),
          adjustment_percent: parseFloat(adjustPct) || 10,
        };
      case "low_stock":
        return {
          threshold: parseInt(threshold) || 5,
          adjustment_percent: parseFloat(lowStockPct) || 10,
        };
      case "low_rotation":
        return {
          days_without_sale: parseInt(daysWithout) || 60,
          discount_percent: parseFloat(discountPct) || 15,
        };
      case "margin_guard":
        return { min_margin_percent: parseFloat(minMargin) || 15 };
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const values = {
      ruleset_id: rulesetId,
      name,
      rule_type: ruleType,
      priority: parseInt(priority) || 10,
      is_active: isActive,
      params: buildParams(),
    };
    if (initial) {
      update.mutate({ id: initial.id, ...values }, { onSuccess: onClose });
    } else {
      create.mutate(values, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la règle" : "Nouvelle règle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Nom de la règle</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Majoration rentrée" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priorité (1 = plus haute)</Label>
              <Input type="number" min={1} value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>

          {/* Params dynamiques */}
          {ruleType === "seasonality" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Mois concernés (1–12, séparés par virgule)</Label>
                <Input value={months} onChange={(e) => setMonths(e.target.value)} placeholder="8,9" />
                <p className="text-xs text-muted-foreground">Ex: 8,9 = août et septembre</p>
              </div>
              <div className="space-y-1">
                <Label>Majoration (%)</Label>
                <Input type="number" value={adjustPct} onChange={(e) => setAdjustPct(e.target.value)} />
              </div>
            </div>
          )}

          {ruleType === "low_stock" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Seuil stock (unités)</Label>
                <Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Majoration (%)</Label>
                <Input type="number" value={lowStockPct} onChange={(e) => setLowStockPct(e.target.value)} />
              </div>
            </div>
          )}

          {ruleType === "low_rotation" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Jours sans vente</Label>
                <Input type="number" min={1} value={daysWithout} onChange={(e) => setDaysWithout(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Remise (%)</Label>
                <Input type="number" min={1} max={80} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
              </div>
            </div>
          )}

          {ruleType === "margin_guard" && (
            <div className="space-y-3 rounded-md border p-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Marge minimale (%)</Label>
                <Input type="number" min={0} max={100} value={minMargin} onChange={(e) => setMinMargin(e.target.value)} />
                <p className="text-xs text-muted-foreground">Bloque ou corrige tout changement qui passerait sous ce seuil</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Règle active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminPricingDynamic() {
  // Rulesets
  const [rulesetDialog, setRulesetDialog] = useState<{ open: boolean; editing?: PricingRuleset | null }>({ open: false });
  // Règles
  const [selectedRuleset, setSelectedRuleset] = useState<PricingRuleset | null>(null);
  const [ruleDialog, setRuleDialog] = useState<{ open: boolean; editing?: PricingRulesetRule | null }>({ open: false });
  // Simulation
  const [simRulesetId, setSimRulesetId] = useState<string>("");
  const [simCategory, setSimCategory] = useState<string>("");
  const [selectedSim, setSelectedSim] = useState<PricingSimulation | null>(null);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [rollbackConfirm, setRollbackConfirm] = useState(false);

  // Data
  const { data: rulesets = [], isLoading: loadingRulesets } = useRulesets();
  const { data: rules = [], isLoading: loadingRules } = useRulesetRules(selectedRuleset?.id ?? null);
  const { data: simulations = [], isLoading: loadingSims } = useSimulations();
  const { data: simItems = [], isLoading: loadingItems } = useSimulationItems(selectedSim?.id ?? null);
  const { data: logs = [], isLoading: loadingLogs } = usePriceChangesLog();

  const deleteRuleset = useDeleteRuleset();
  const deleteRule = useDeleteRule();
  const runSim = useRunSimulation();
  const applySim = useApplySimulation();
  const rollbackSim = useRollbackSimulation();

  return (
    <AdminLayout
      title="Pricing Dynamique"
      description="Moteur de règles : simulation, validation et logs immuables"
    >
      <Tabs defaultValue="rulesets">
        <TabsList className="mb-6">
          <TabsTrigger value="rulesets">Rulesets</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="logs">Historique</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: RULESETS ──────────────────────────────────────────────── */}
        <TabsContent value="rulesets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setRulesetDialog({ open: true, editing: null })}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau ruleset
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Jeux de règles</CardTitle>
              <CardDescription>Un ruleset regroupe plusieurs règles appliquées ensemble lors d'une simulation.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRulesets ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : rulesets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun ruleset. Créez-en un pour commencer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesets.map((rs) => (
                      <TableRow key={rs.id}>
                        <TableCell className="font-medium">{rs.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                          {rs.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={rs.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                            {rs.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(rs.created_at).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost"
                              onClick={() => setRulesetDialog({ open: true, editing: rs })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => { if (confirm("Supprimer ce ruleset et toutes ses règles ?")) deleteRuleset.mutate(rs.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: RÈGLES ────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Règles</CardTitle>
              <CardDescription>Sélectionnez un ruleset pour voir et éditer ses règles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label>Ruleset</Label>
                  <Select
                    value={selectedRuleset?.id ?? ""}
                    onValueChange={(id) => setSelectedRuleset(rulesets.find((r) => r.id === id) ?? null)}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir un ruleset…" /></SelectTrigger>
                    <SelectContent>
                      {rulesets.map((rs) => (
                        <SelectItem key={rs.id} value={rs.id}>{rs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRuleset && (
                  <Button onClick={() => setRuleDialog({ open: true, editing: null })}>
                    <Plus className="h-4 w-4 mr-2" /> Nouvelle règle
                  </Button>
                )}
              </div>

              {selectedRuleset && (
                loadingRules ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : rules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Aucune règle dans ce ruleset.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Paramètres</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell><Badge variant="outline">{rule.priority}</Badge></TableCell>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RULE_TYPE_COLORS[rule.rule_type]}`}>
                              {RULE_TYPE_LABELS[rule.rule_type]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatParams(rule)}</TableCell>
                          <TableCell>
                            <Badge className={rule.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}>
                              {rule.is_active ? "Oui" : "Non"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost"
                                onClick={() => setRuleDialog({ open: true, editing: rule })}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost"
                                onClick={() => { if (confirm("Supprimer cette règle ?")) deleteRule.mutate({ id: rule.id, rulesetId: rule.ruleset_id }); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: SIMULATION ────────────────────────────────────────────── */}
        <TabsContent value="simulation" className="space-y-6">
          {/* Panneau de lancement */}
          <Card>
            <CardHeader>
              <CardTitle>Lancer une simulation</CardTitle>
              <CardDescription>Prévisualisez l'impact des règles sans modifier les prix réels.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <Label>Ruleset</Label>
                  <Select value={simRulesetId} onValueChange={setSimRulesetId}>
                    <SelectTrigger><SelectValue placeholder="Choisir un ruleset…" /></SelectTrigger>
                    <SelectContent>
                      {rulesets.map((rs) => (
                        <SelectItem key={rs.id} value={rs.id}>{rs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1 min-w-[150px]">
                  <Label>Catégorie (optionnel)</Label>
                  <Input value={simCategory} onChange={(e) => setSimCategory(e.target.value)} placeholder="Toutes" />
                </div>
                <Button
                  disabled={!simRulesetId || runSim.isPending}
                  onClick={() => runSim.mutate(
                    { ruleset_id: simRulesetId, category: simCategory || undefined },
                    { onSuccess: (data) => setSelectedSim(simulations.find((s) => s.id === data.simulation_id) ?? null) }
                  )}
                >
                  {runSim.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Simuler
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des simulations récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Simulations récentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSims ? (
                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : simulations.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Aucune simulation pour l'instant.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ruleset</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead>Impactés</TableHead>
                      <TableHead>Variation moy.</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Voir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulations.map((sim) => {
                      const rs = rulesets.find((r) => r.id === sim.ruleset_id);
                      return (
                        <TableRow
                          key={sim.id}
                          className={selectedSim?.id === sim.id ? "bg-muted" : "cursor-pointer hover:bg-muted/50"}
                          onClick={() => setSelectedSim(sim)}
                        >
                          <TableCell className="text-sm">
                            {new Date(sim.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          </TableCell>
                          <TableCell className="font-medium">{rs?.name ?? "—"}</TableCell>
                          <TableCell>{sim.category ?? <span className="text-muted-foreground">Toutes</span>}</TableCell>
                          <TableCell>{sim.product_count}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sim.affected_count}</Badge>
                          </TableCell>
                          <TableCell>
                            {sim.avg_change_pct != null ? (
                              <span className={sim.avg_change_pct >= 0 ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                                {sim.avg_change_pct >= 0 ? "+" : ""}{Number(sim.avg_change_pct).toFixed(2)}%
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[sim.status]}`}>
                              {STATUS_LABELS[sim.status]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedSim(sim); }}>
                              Détails
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Détails de la simulation sélectionnée */}
          {selectedSim && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle>Impacts — simulation du {new Date(selectedSim.created_at).toLocaleString("fr-FR")}</CardTitle>
                    <CardDescription>
                      {selectedSim.affected_count} produit(s) modifié(s) ·{" "}
                      variation moyenne{" "}
                      {selectedSim.avg_change_pct != null
                        ? `${selectedSim.avg_change_pct >= 0 ? "+" : ""}${Number(selectedSim.avg_change_pct).toFixed(2)}%`
                        : "—"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedSim.status === "completed" && (
                      <>
                        {!applyConfirm ? (
                          <Button onClick={() => setApplyConfirm(true)}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Appliquer les prix
                          </Button>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground self-center">Confirmer ?</span>
                            <Button variant="destructive"
                              disabled={applySim.isPending}
                              onClick={() => applySim.mutate(selectedSim.id, {
                                onSuccess: () => { setApplyConfirm(false); setSelectedSim((s) => s ? { ...s, status: "applied" } : s); }
                              })}>
                              {applySim.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                              Oui, appliquer
                            </Button>
                            <Button variant="outline" onClick={() => setApplyConfirm(false)}>Annuler</Button>
                          </>
                        )}
                      </>
                    )}
                    {selectedSim.status === "applied" && (
                      <>
                        {!rollbackConfirm ? (
                          <Button variant="outline" onClick={() => setRollbackConfirm(true)}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Rollback
                          </Button>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground self-center">Restaurer les anciens prix ?</span>
                            <Button variant="destructive"
                              disabled={rollbackSim.isPending}
                              onClick={() => rollbackSim.mutate(selectedSim.id, {
                                onSuccess: () => { setRollbackConfirm(false); setSelectedSim((s) => s ? { ...s, status: "rolled_back" } : s); }
                              })}>
                              {rollbackSim.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                              Confirmer rollback
                            </Button>
                            <Button variant="outline" onClick={() => setRollbackConfirm(false)}>Annuler</Button>
                          </>
                        )}
                      </>
                    )}
                    {selectedSim.status === "rolled_back" && (
                      <Badge className="bg-gray-100 text-gray-600">Annulée</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : simItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Aucun produit impacté.</p>
                ) : (
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead>Catégorie</TableHead>
                          <TableHead>Type règle</TableHead>
                          <TableHead className="text-right">Prix HT actuel</TableHead>
                          <TableHead className="text-right">Prix HT nouveau</TableHead>
                          <TableHead className="text-right">Variation</TableHead>
                          <TableHead className="text-right">Marge avant</TableHead>
                          <TableHead className="text-right">Marge après</TableHead>
                          <TableHead>Garde-fou</TableHead>
                          <TableHead>Raison</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simItems.map((item) => {
                          const pct = Number(item.price_change_percent ?? 0);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.products?.name ?? item.product_id.slice(0, 8)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.products?.category ?? "—"}</TableCell>
                              <TableCell>
                                {item.rule_type ? (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RULE_TYPE_COLORS[item.rule_type as RuleType] ?? ""}`}>
                                    {RULE_TYPE_LABELS[item.rule_type as RuleType] ?? item.rule_type}
                                  </span>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-right">{Number(item.old_price_ht).toFixed(2)} €</TableCell>
                              <TableCell className="text-right font-medium">{Number(item.new_price_ht).toFixed(2)} €</TableCell>
                              <TableCell className="text-right">
                                <span className={`font-medium ${pct >= 0 ? "text-green-700" : "text-red-600"}`}>
                                  {pct >= 0 ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                                  {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.old_margin_percent != null ? `${Number(item.old_margin_percent).toFixed(1)}%` : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.new_margin_percent != null ? `${Number(item.new_margin_percent).toFixed(1)}%` : "—"}
                              </TableCell>
                              <TableCell>
                                {item.blocked_by_guard && (
                                  <AlertTriangle className="h-4 w-4 text-orange-500" aria-label="Corrigé par garde-fou marge" />
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {item.reason ?? "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB 4: HISTORIQUE ────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle>Historique des changements de prix</CardTitle>
              </div>
              <CardDescription>
                Log immuable — aucune modification ou suppression possible. Les rollbacks apparaissent comme de nouvelles entrées.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun changement de prix enregistré.</p>
              ) : (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Ancien prix HT</TableHead>
                        <TableHead className="text-right">Nouveau prix HT</TableHead>
                        <TableHead className="text-right">Variation</TableHead>
                        <TableHead className="text-right">Marge av.</TableHead>
                        <TableHead className="text-right">Marge ap.</TableHead>
                        <TableHead>Rollback</TableHead>
                        <TableHead>Raison</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const pct = Number(log.price_change_percent ?? 0);
                        return (
                          <TableRow key={log.id} className={log.is_rollback ? "bg-orange-50" : undefined}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(log.applied_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {log.products?.name ?? log.product_id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.products?.category ?? "—"}
                            </TableCell>
                            <TableCell>
                              {log.rule_type ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RULE_TYPE_COLORS[log.rule_type as RuleType] ?? "bg-gray-100 text-gray-600"}`}>
                                  {RULE_TYPE_LABELS[log.rule_type as RuleType] ?? log.rule_type}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">{Number(log.old_price_ht).toFixed(2)} €</TableCell>
                            <TableCell className="text-right font-medium">{Number(log.new_price_ht).toFixed(2)} €</TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium text-sm ${pct >= 0 ? "text-green-700" : "text-red-600"}`}>
                                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {log.old_margin_percent != null ? `${Number(log.old_margin_percent).toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {log.new_margin_percent != null ? `${Number(log.new_margin_percent).toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell>
                              {log.is_rollback && (
                                <Badge className="bg-orange-100 text-orange-700 text-xs">
                                  <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                              {log.reason ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RulesetDialog
        open={rulesetDialog.open}
        initial={rulesetDialog.editing}
        onClose={() => setRulesetDialog({ open: false })}
      />

      {selectedRuleset && (
        <RuleDialog
          open={ruleDialog.open}
          rulesetId={selectedRuleset.id}
          initial={ruleDialog.editing}
          onClose={() => setRuleDialog({ open: false })}
        />
      )}
    </AdminLayout>
  );
}
