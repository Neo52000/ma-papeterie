import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Save, AlertCircle } from 'lucide-react';
import { useAiCmoProfile, useUpsertAiCmoProfile } from '@/hooks/admin/useAiCmo';

export function AiCmoProfile() {
  const { data: profile, isLoading } = useAiCmoProfile();
  const upsert = useUpsertAiCmoProfile();

  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [nameAliasesStr, setNameAliasesStr] = useState('');
  const [llmUnderstanding, setLlmUnderstanding] = useState('');
  const [products, setProducts] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setDescription(profile.description ?? '');
      setWebsite(profile.website ?? '');
      setNameAliasesStr((profile.name_aliases ?? []).join(', '));
      setLlmUnderstanding(profile.llm_understanding ?? '');
      setProducts(profile.products ?? '');
      setIsDirty(false);
    }
  }, [profile]);

  const markDirty = () => setIsDirty(true);

  const handleSave = () => {
    const aliases = nameAliasesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    upsert.mutate(
      {
        id: profile?.id,
        description: description || null,
        website: website || null,
        name_aliases: aliases,
        llm_understanding: llmUnderstanding || null,
        products: products || null,
      },
      { onSuccess: () => setIsDirty(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profil de marque AI-CMO</CardTitle>
            <CardDescription>
              Identité de votre entreprise pour le monitoring IA
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
        <div className="space-y-1.5">
          <Label htmlFor="ai-cmo-description">Description de l'entreprise</Label>
          <Textarea
            id="ai-cmo-description"
            placeholder="Décrivez votre entreprise, son activité, son positionnement…"
            value={description}
            onChange={(e) => { setDescription(e.target.value); markDirty(); }}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-cmo-website">Site web</Label>
          <Input
            id="ai-cmo-website"
            type="url"
            placeholder="https://ma-papeterie.fr"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); markDirty(); }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-cmo-aliases">Noms alternatifs (séparés par des virgules)</Label>
          <Input
            id="ai-cmo-aliases"
            placeholder="Ma Papeterie, MaPapeterie, ma-papeterie.fr"
            value={nameAliasesStr}
            onChange={(e) => { setNameAliasesStr(e.target.value); markDirty(); }}
          />
          <p className="text-xs text-muted-foreground">
            Variantes du nom de marque à détecter dans les réponses IA
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-cmo-llm">Compréhension LLM</Label>
          <Textarea
            id="ai-cmo-llm"
            placeholder="Comment les IA perçoivent votre marque actuellement…"
            value={llmUnderstanding}
            onChange={(e) => { setLlmUnderstanding(e.target.value); markDirty(); }}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-cmo-products">Produits et services</Label>
          <Textarea
            id="ai-cmo-products"
            placeholder="Fournitures scolaires, fournitures de bureau, papeterie, impression…"
            value={products}
            onChange={(e) => { setProducts(e.target.value); markDirty(); }}
            rows={3}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!isDirty || upsert.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {upsert.isPending ? 'Sauvegarde…' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
