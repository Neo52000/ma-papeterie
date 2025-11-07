import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Edit, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
  useCalculatePriceAdjustments,
  PricingRule,
} from "@/hooks/usePricingRules";
import { PricingRuleForm } from "@/components/admin/PricingRuleForm";
import { PriceAdjustmentsList } from "@/components/admin/PriceAdjustmentsList";

export default function AdminPricing() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  
  const { data: rules, isLoading } = usePricingRules();
  const createRule = useCreatePricingRule();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();
  const calculateAdjustments = useCalculatePriceAdjustments();

  const handleSaveRule = (ruleData: Partial<PricingRule>) => {
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...ruleData }, {
        onSuccess: () => {
          setShowForm(false);
          setEditingRule(null);
        },
      });
    } else {
      createRule.mutate(ruleData as any, {
        onSuccess: () => {
          setShowForm(false);
        },
      });
    }
  };

  const handleToggleActive = (rule: PricingRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      deleteRule.mutate(id);
    }
  };

  const handleCalculate = (ruleId?: string) => {
    calculateAdjustments.mutate(ruleId);
  };

  const getStrategyLabel = (strategy: string) => {
    const labels: Record<string, string> = {
      margin_target: "Marge cible",
      competitor_match: "Aligner concurrents",
      competitor_undercut: "Sous-couper concurrents",
      hybrid: "Hybride",
    };
    return labels[strategy] || strategy;
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {editingRule ? 'Modifier la règle' : 'Nouvelle règle de pricing'}
          </h1>
        </div>
        <PricingRuleForm
          rule={editingRule || undefined}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Règles de pricing automatique</h1>
          <p className="text-muted-foreground">
            Gérez les règles pour ajuster automatiquement les prix selon les marges et la concurrence
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => handleCalculate()}
            disabled={calculateAdjustments.isPending}
          >
            {calculateAdjustments.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Calculer les ajustements
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Règles actives</CardTitle>
          <CardDescription>
            Les règles sont appliquées par ordre de priorité (1 = plus haute priorité)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune règle configurée. Créez votre première règle pour commencer.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Stratégie</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Marge cible</TableHead>
                    <TableHead>Approbation</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {rule.name}
                        {rule.description && (
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge>{getStrategyLabel(rule.strategy)}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.category ? (
                          <Badge variant="outline">{rule.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Tous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.target_margin_percent ? (
                          `${rule.target_margin_percent}%`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.require_approval ? (
                          <Badge variant="secondary">Requise</Badge>
                        ) : (
                          <Badge variant="outline">Auto</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCalculate(rule.id)}
                            disabled={calculateAdjustments.isPending}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRule(rule);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PriceAdjustmentsList />
    </div>
  );
}
