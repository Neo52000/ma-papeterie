import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingRule } from "@/hooks/usePricingRules";

interface PricingRuleFormProps {
  rule?: PricingRule;
  onSave: (rule: Partial<PricingRule>) => void;
  onCancel: () => void;
}

export const PricingRuleForm = ({ rule, onSave, onCancel }: PricingRuleFormProps) => {
  const [formData, setFormData] = useState<Partial<PricingRule>>({
    name: rule?.name || '',
    description: rule?.description || '',
    is_active: rule?.is_active ?? true,
    priority: rule?.priority || 1,
    strategy: rule?.strategy || 'margin_target',
    target_margin_percent: rule?.target_margin_percent || undefined,
    min_margin_percent: rule?.min_margin_percent || undefined,
    max_margin_percent: rule?.max_margin_percent || undefined,
    competitor_offset_percent: rule?.competitor_offset_percent || 0,
    competitor_offset_fixed: rule?.competitor_offset_fixed || 0,
    min_competitor_count: rule?.min_competitor_count || 1,
    min_price_ht: rule?.min_price_ht || undefined,
    max_price_ht: rule?.max_price_ht || undefined,
    max_price_change_percent: rule?.max_price_change_percent || 10,
    require_approval: rule?.require_approval ?? true,
    category: rule?.category || undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Configuration de base de la règle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nom de la règle *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Règle active</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Catégorie (optionnel)</Label>
            <Input
              id="category"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value || undefined })}
              placeholder="Laisser vide pour appliquer à tous les produits"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stratégie de pricing</CardTitle>
          <CardDescription>Choisissez comment les prix seront calculés</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="strategy">Stratégie *</Label>
            <Select
              value={formData.strategy}
              onValueChange={(value: any) => setFormData({ ...formData, strategy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="margin_target">Marge cible</SelectItem>
                <SelectItem value="competitor_match">Aligner sur concurrents</SelectItem>
                <SelectItem value="competitor_undercut">Sous-couper concurrents</SelectItem>
                <SelectItem value="hybrid">Hybride (marge + concurrence)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.strategy === 'margin_target' || formData.strategy === 'hybrid') && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="target_margin">Marge cible (%)</Label>
                <Input
                  id="target_margin"
                  type="number"
                  step="0.1"
                  value={formData.target_margin_percent || ''}
                  onChange={(e) => setFormData({ ...formData, target_margin_percent: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="min_margin">Marge min (%)</Label>
                <Input
                  id="min_margin"
                  type="number"
                  step="0.1"
                  value={formData.min_margin_percent || ''}
                  onChange={(e) => setFormData({ ...formData, min_margin_percent: parseFloat(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label htmlFor="max_margin">Marge max (%)</Label>
                <Input
                  id="max_margin"
                  type="number"
                  step="0.1"
                  value={formData.max_margin_percent || ''}
                  onChange={(e) => setFormData({ ...formData, max_margin_percent: parseFloat(e.target.value) || undefined })}
                />
              </div>
            </div>
          )}

          {(formData.strategy === 'competitor_match' || formData.strategy === 'competitor_undercut' || formData.strategy === 'hybrid') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offset_percent">Écart concurrent (%)</Label>
                <Input
                  id="offset_percent"
                  type="number"
                  step="0.1"
                  value={formData.competitor_offset_percent || 0}
                  onChange={(e) => setFormData({ ...formData, competitor_offset_percent: parseFloat(e.target.value) })}
                  placeholder="-5 pour être 5% moins cher"
                />
              </div>
              <div>
                <Label htmlFor="offset_fixed">Écart fixe (€)</Label>
                <Input
                  id="offset_fixed"
                  type="number"
                  step="0.01"
                  value={formData.competitor_offset_fixed || 0}
                  onChange={(e) => setFormData({ ...formData, competitor_offset_fixed: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contrôles et limites</CardTitle>
          <CardDescription>Sécurité et validation des changements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_price">Prix min HT (€)</Label>
              <Input
                id="min_price"
                type="number"
                step="0.01"
                value={formData.min_price_ht || ''}
                onChange={(e) => setFormData({ ...formData, min_price_ht: parseFloat(e.target.value) || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="max_price">Prix max HT (€)</Label>
              <Input
                id="max_price"
                type="number"
                step="0.01"
                value={formData.max_price_ht || ''}
                onChange={(e) => setFormData({ ...formData, max_price_ht: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="max_change">Changement max par application (%)</Label>
            <Input
              id="max_change"
              type="number"
              step="0.1"
              value={formData.max_price_change_percent || 10}
              onChange={(e) => setFormData({ ...formData, max_price_change_percent: parseFloat(e.target.value) })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="require_approval"
              checked={formData.require_approval}
              onCheckedChange={(checked) => setFormData({ ...formData, require_approval: checked })}
            />
            <Label htmlFor="require_approval">Nécessite une approbation manuelle</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          {rule ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
