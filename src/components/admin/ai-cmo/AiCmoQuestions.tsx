import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Plus, Trash2, AlertCircle, Clock } from 'lucide-react';
import { useAiCmoQuestions, useSaveAiCmoQuestions, type AiCmoQuestion } from '@/hooks/admin/useAiCmo';

const INTERVAL_OPTIONS = [
  { label: '1 heure', value: 3600 },
  { label: '6 heures', value: 21600 },
  { label: '12 heures', value: 43200 },
  { label: 'Quotidien', value: 86400 },
  { label: 'Hebdomadaire', value: 604800 },
];

interface LocalQuestion {
  id?: string;
  prompt: string;
  prompt_type: 'product' | 'expertise';
  target_country: string;
  is_active: boolean;
  refresh_interval_seconds: number;
  last_run_at: string | null;
  next_run_at: string | null;
  sort_order: number;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function AiCmoQuestions() {
  const { data: questions = [], isLoading } = useAiCmoQuestions();
  const save = useSaveAiCmoQuestions();
  const originalRef = useRef<AiCmoQuestion[]>([]);

  const [items, setItems] = useState<LocalQuestion[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      originalRef.current = questions;
      setItems(
        questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          prompt_type: q.prompt_type,
          target_country: q.target_country ?? '',
          is_active: q.is_active,
          refresh_interval_seconds: q.refresh_interval_seconds,
          last_run_at: q.last_run_at,
          next_run_at: q.next_run_at,
          sort_order: q.sort_order,
        })),
      );
      setIsDirty(false);
    }
  }, [questions, isLoading]);

  const updateItem = (idx: number, patch: Partial<LocalQuestion>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    setIsDirty(true);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        prompt: '',
        prompt_type: 'product',
        target_country: '',
        is_active: false,
        refresh_interval_seconds: 86400,
        last_run_at: null,
        next_run_at: null,
        sort_order: prev.length,
      },
    ]);
    setIsDirty(true);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const handleSave = () => {
    const modified = items
      .filter((it) => it.prompt.trim())
      .map((it, i) => ({
        ...(it.id ? { id: it.id } : {}),
        prompt: it.prompt.trim(),
        prompt_type: it.prompt_type,
        target_country: it.target_country.trim() || null,
        is_active: it.is_active,
        refresh_interval_seconds: it.refresh_interval_seconds,
        last_run_at: it.last_run_at,
        next_run_at: it.next_run_at,
        sort_order: i,
      }));

    save.mutate(
      { original: originalRef.current, modified },
      { onSuccess: () => setIsDirty(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Questions de monitoring</CardTitle>
            <CardDescription>
              Prompts envoyés aux IA pour analyser la visibilité de votre marque
            </CardDescription>
          </div>
          {isDirty && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Modifications non sauvegardées
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id ?? `new-${idx}`} className="p-4 border rounded-lg bg-background space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Prompt</Label>
                <Textarea
                  placeholder="Ex: Quels sont les meilleurs fournisseurs de fournitures de bureau à Chaumont ?"
                  value={item.prompt}
                  onChange={(e) => updateItem(idx, { prompt: e.target.value })}
                  rows={2}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="mt-5">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={item.prompt_type}
                  onValueChange={(v) => updateItem(idx, { prompt_type: v as 'product' | 'expertise' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produit</SelectItem>
                    <SelectItem value="expertise">Expertise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pays cible (ISO 2)</Label>
                <Input
                  maxLength={2}
                  placeholder="FR"
                  value={item.target_country}
                  onChange={(e) => updateItem(idx, { target_country: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Fréquence</Label>
                <Select
                  value={String(item.refresh_interval_seconds)}
                  onValueChange={(v) => updateItem(idx, { refresh_interval_seconds: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={item.is_active}
                  onCheckedChange={(checked) => updateItem(idx, { is_active: checked })}
                />
                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                  {item.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>

            {(item.last_run_at || item.next_run_at) && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Dernier run : {formatDate(item.last_run_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Prochain run : {formatDate(item.next_run_at)}
                </span>
              </div>
            )}
          </div>
        ))}

        <Button variant="outline" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une question
        </Button>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!isDirty || save.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {save.isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
