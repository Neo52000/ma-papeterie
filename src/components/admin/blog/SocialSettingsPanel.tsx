import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from "sonner";
import { useSocialSettings, useUpdateSocialSettings, type SocialSettings } from '@/hooks/useSocialBooster';
import { Loader2, Save, Settings } from 'lucide-react';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'whatsapp', label: 'WhatsApp' },
];

export function SocialSettingsPanel() {
  const { data: settings, isLoading } = useSocialSettings();
  const updateSettings = useUpdateSocialSettings();

  const [form, setForm] = useState<Partial<SocialSettings>>({});
  const [ctaInput, setCtaInput] = useState('');

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form);
      toast.success('R\u00e9glages sauvegard\u00e9s');
    } catch (_error) {
      toast.error('Impossible de sauvegarder');
    }
  };

  const togglePlatform = (platform: string) => {
    const current = form.active_platforms || [];
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    setForm({ ...form, active_platforms: updated });
  };

  const addCta = () => {
    if (!ctaInput.trim()) return;
    setForm({ ...form, default_ctas: [...(form.default_ctas || []), ctaInput.trim()] });
    setCtaInput('');
  };

  const removeCta = (index: number) => {
    const updated = [...(form.default_ctas || [])];
    updated.splice(index, 1);
    setForm({ ...form, default_ctas: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-lg font-semibold">R\u00e9glages Social Booster</h2>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </Button>
      </div>

      {/* Module activation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Module</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Social Booster actif</span>
            <Button
              variant={form.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
            >
              {form.enabled ? 'Actif' : 'D\u00e9sactiv\u00e9'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">R\u00e9seaux actifs</CardTitle>
          <CardDescription>S\u00e9lectionnez les r\u00e9seaux sur lesquels publier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <Badge
                key={p.id}
                className={`cursor-pointer ${
                  form.active_platforms?.includes(p.id)
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                onClick={() => togglePlatform(p.id)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Default mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mode par d\u00e9faut</CardTitle>
          <CardDescription>Comportement \u00e0 la g\u00e9n\u00e9ration des posts</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={form.default_mode || 'draft'} onValueChange={(v) => setForm({ ...form, default_mode: v })}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon (validation manuelle)</SelectItem>
              <SelectItem value="approval">Approbation requise</SelectItem>
              <SelectItem value="auto">Auto-publication (V2)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* UTM parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Param\u00e8tres UTM</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Source</label>
            <Input
              value={form.utm_source || ''}
              onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Medium</label>
            <Input
              value={form.utm_medium || ''}
              onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Pr\u00e9fixe campagne</label>
            <Input
              value={form.utm_campaign_prefix || ''}
              onChange={(e) => setForm({ ...form, utm_campaign_prefix: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">IA</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Provider</label>
            <Input
              value={form.ai_provider || ''}
              onChange={(e) => setForm({ ...form, ai_provider: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mod\u00e8le</label>
            <Input
              value={form.ai_model || ''}
              onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default CTAs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CTA par d\u00e9faut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(form.default_ctas || []).map((cta, i) => (
              <Badge key={i} variant="outline" className="gap-1 cursor-pointer hover:bg-red-50" onClick={() => removeCta(i)}>
                {cta} <span className="text-red-400">\u00d7</span>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={ctaInput}
              onChange={(e) => setCtaInput(e.target.value)}
              placeholder="Nouveau CTA..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCta())}
            />
            <Button variant="outline" onClick={addCta}>Ajouter</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
