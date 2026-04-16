import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { useAiCmoCompetitors, useSaveAiCmoCompetitors } from '@/hooks/admin/useAiCmo';

interface LocalCompetitor {
  name: string;
  website: string;
  weight: number;
}

export function AiCmoCompetitors() {
  const { data: competitors = [], isLoading } = useAiCmoCompetitors();
  const save = useSaveAiCmoCompetitors();

  const [items, setItems] = useState<LocalCompetitor[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (competitors.length > 0 || !isLoading) {
      setItems(
        competitors.map((c) => ({
          name: c.name,
          website: c.website ?? '',
          weight: c.weight,
        })),
      );
      setIsDirty(false);
    }
  }, [competitors, isLoading]);

  const updateItem = (idx: number, patch: Partial<LocalCompetitor>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
    setIsDirty(true);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', website: '', weight: 1 }]);
    setIsDirty(true);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setIsDirty(true);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    const payload = items
      .filter((it) => it.name.trim())
      .map((it, i) => ({
        name: it.name.trim(),
        website: it.website.trim() || null,
        weight: it.weight,
        sort_order: i,
      }));
    save.mutate(payload, { onSuccess: () => setIsDirty(false) });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Concurrents suivis</CardTitle>
            <CardDescription>
              Ajoutez les concurrents dont vous souhaitez comparer la visibilité IA
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
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-end gap-2 p-3 border rounded-lg bg-background">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input
                placeholder="Nom du concurrent"
                value={item.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Site web</Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={item.website}
                onChange={(e) => updateItem(idx, { website: e.target.value })}
              />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">Poids</Label>
              <Select
                value={String(item.weight)}
                onValueChange={(v) => updateItem(idx, { weight: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un concurrent
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
