import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from "sonner";
import { useSocialMediaUpload } from '@/hooks/useSocialMediaUpload';
import { useCreateStandaloneCampaign, useGenerateSocialCaptions } from '@/hooks/useSocialMedia';
import { SocialPostEditor } from './SocialPostEditor';
import type { SocialPost } from '@/hooks/useSocialBooster';
import {
  Loader2,
  Sparkles,
  Upload,
  X,
  Plus,
} from 'lucide-react';

const OCCASIONS = [
  { value: '', label: 'Aucune' },
  { value: 'rentrée', label: 'Rentrée scolaire' },
  { value: 'noël', label: 'Noël' },
  { value: 'pâques', label: 'Pâques' },
  { value: 'fête-des-mères', label: 'Fête des mères' },
  { value: 'fête-des-pères', label: 'Fête des pères' },
  { value: 'saint-valentin', label: 'Saint-Valentin' },
  { value: 'halloween', label: 'Halloween' },
  { value: 'black-friday', label: 'Black Friday' },
  { value: 'soldes', label: 'Soldes' },
  { value: 'été', label: 'Été' },
  { value: 'printemps', label: 'Printemps' },
];

const TONES = [
  { value: 'chaleureux', label: 'Chaleureux' },
  { value: 'fun', label: 'Fun' },
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'informatif', label: 'Informatif' },
  { value: 'promotionnel', label: 'Promotionnel' },
  { value: 'inspirant', label: 'Inspirant' },
];

export function SocialPostCreator() {
  const { upload, uploading } = useSocialMediaUpload();
  const createCampaign = useCreateStandaloneCampaign();
  const generateCaptions = useGenerateSocialCaptions();

  const [title, setTitle] = useState('');
  const [product, setProduct] = useState('');
  const [promo, setPromo] = useState('');
  const [occasion, setOccasion] = useState('');
  const [tone, setTone] = useState('chaleureux');
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<SocialPost[]>([]);

  const isGenerating = createCampaign.isPending || generateCaptions.isPending;

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const url = await upload(file);
        setMediaUrls((prev) => [...prev, url]);
      } catch (err) {
        toast({
          title: 'Erreur d\'upload',
          description: err instanceof Error ? err.message : 'Erreur inconnue',
          variant: 'destructive',
        });
      }
    }
  }, [upload, toast]);

  const removeMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!title.trim() && !description.trim()) {
      toast({ title: 'Veuillez saisir un titre ou une description', variant: 'destructive' });
      return;
    }

    let campaignId: string | null = null;
    try {
      // 1. Create the campaign
      const campaign = await createCampaign.mutateAsync({
        title: title || 'Publication Social Media',
        rawContext: { product, promo, occasion, tone, description },
        mediaUrls,
        mediaType: mediaUrls.length > 1 ? 'carousel' : mediaUrls.length === 1 ? 'image' : undefined,
      });
      campaignId = campaign.id;

      // 2. Generate captions via AI
      const result = await generateCaptions.mutateAsync(campaign.id);
      setGeneratedPosts(result.posts || []);

      toast({ title: 'Posts générés avec succès !' });
    } catch (err) {
      const desc = err instanceof Error ? err.message : 'Erreur inconnue';
      if (campaignId) {
        // Campaign was created but caption generation failed
        toast({
          title: 'Campagne créée, mais génération échouée',
          description: `${desc}. Retrouvez la campagne dans l'onglet Publications.`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erreur de création', description: desc, variant: 'destructive' });
      }
    }
  };

  const handleReset = () => {
    setTitle('');
    setProduct('');
    setPromo('');
    setOccasion('');
    setTone('chaleureux');
    setDescription('');
    setMediaUrls([]);
    setGeneratedPosts([]);
  };

  return (
    <div className="space-y-6">
      {/* Creation form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Créer un post social media
          </CardTitle>
          <CardDescription>
            Uploadez vos visuels, décrivez le contexte et laissez l'IA générer les textes pour chaque plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Media upload zone */}
          <div>
            <label className="text-sm font-medium">Visuels</label>
            <div className="mt-1 border-2 border-dashed rounded-lg p-4">
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-md overflow-hidden group">
                      <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={uploading}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Upload en cours...' : 'Ajouter des visuels'}
                  </div>
                </label>
                <span className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF, MP4, MOV</span>
              </div>
            </div>
          </div>

          {/* Context form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Titre du post</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouvelle collection rentrée 2026"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Produit / Collection</label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Ex: Cahiers Clairefontaine, Stylos Bic..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Promotion</label>
              <Input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Ex: -20% sur les fournitures scolaires"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Occasion</label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value || '__none__'}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ton</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description libre</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce que vous souhaitez communiquer... L'IA adaptera le message à chaque plateforme."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!title.trim() && !description.trim())}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? 'Génération en cours...' : 'Générer les posts'}
            </Button>

            {generatedPosts.length > 0 && (
              <Button variant="outline" onClick={handleReset}>
                Nouveau post
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generated posts */}
      {generatedPosts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Posts générés ({generatedPosts.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {generatedPosts.map((post) => (
              <SocialPostEditor
                key={post.id}
                post={post}
                mediaUrl={mediaUrls[0]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
