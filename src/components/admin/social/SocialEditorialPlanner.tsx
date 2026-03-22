import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useEditorialCalendar,
  useGenerateEditorialCalendar,
  useConvertIdeaToCampaign,
  useGenerateSocialCaptions,
  type CalendarIdea,
} from '@/hooks/useSocialMedia';
import {
  Loader2,
  Sparkles,
  Plus,
  Calendar,
  Facebook,
  Instagram,
  Linkedin,
  X,
  MessageCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  x: X,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
};

const TONE_COLORS: Record<string, string> = {
  informatif: 'bg-blue-100 text-blue-700',
  fun: 'bg-yellow-100 text-yellow-700',
  promotionnel: 'bg-red-100 text-red-700',
  inspirant: 'bg-purple-100 text-purple-700',
  professionnel: 'bg-gray-100 text-gray-700',
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

export function SocialEditorialPlanner() {
  const { toast } = useToast();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [context, setContext] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const { data: calendar, isLoading } = useEditorialCalendar(selectedMonth);
  const generateCalendar = useGenerateEditorialCalendar();
  const convertIdea = useConvertIdeaToCampaign();
  const generateCaptions = useGenerateSocialCaptions();

  const handleGenerate = async () => {
    try {
      await generateCalendar.mutateAsync({ month: selectedMonth, context: context || undefined });
      toast({ title: 'Planning éditorial généré !' });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur de génération',
        variant: 'destructive',
      });
    }
  };

  const handleConvertIdea = async (idea: CalendarIdea) => {
    const ideaKey = `${idea.suggested_date}-${idea.theme}`;
    setConvertingId(ideaKey);
    try {
      const campaign = await convertIdea.mutateAsync(idea);
      await generateCaptions.mutateAsync(campaign.id);
      toast({ title: 'Post créé et généré !', description: idea.theme });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur de conversion',
        variant: 'destructive',
      });
    } finally {
      setConvertingId(null);
    }
  };

  const ideas: CalendarIdea[] = calendar?.ideas || [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Planning éditorial IA
          </CardTitle>
          <CardDescription>
            Générez un planning de publications pour le mois. L'IA propose des idées adaptées à la saisonnalité et à votre activité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm font-medium">Mois</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateCalendar.isPending}
              className="gap-2"
            >
              {generateCalendar.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generateCalendar.isPending ? 'Génération...' : 'Générer le planning'}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium">Contexte supplémentaire (optionnel)</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Promotion rentrée -30%, nouveau partenariat avec Oxford, événement en magasin le 15..."
              className="mt-1 min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar ideas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : ideas.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {ideas.length} idées pour {monthOptions.find((m) => m.value === selectedMonth)?.label}
            </h3>
            {calendar?.generated_by && (
              <Badge variant="outline" className="text-xs">
                {calendar.generated_by === 'ai' ? 'Généré par IA' : 'Fallback'}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {ideas.map((idea, idx) => {
              const ideaKey = `${idea.suggested_date}-${idea.theme}`;
              const isConverting = convertingId === ideaKey;
              const toneColor = TONE_COLORS[idea.tone] || 'bg-gray-100 text-gray-700';
              const date = new Date(idea.suggested_date + 'T12:00:00');

              return (
                <Card key={idx} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <Badge className={`text-[10px] ${toneColor}`}>{idea.tone}</Badge>
                          <Badge variant="outline" className="text-[10px]">{idea.content_type}</Badge>
                        </div>
                        <h4 className="font-medium text-sm mt-1">{idea.theme}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{idea.description}</p>
                        <div className="flex items-center gap-1 mt-2">
                          {idea.platforms.map((p) => {
                            const Icon = PLATFORM_ICONS[p];
                            return Icon ? (
                              <div key={p} className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center" title={p}>
                                <Icon className="w-3 h-3 text-gray-600" />
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConvertIdea(idea)}
                        disabled={isConverting}
                        className="gap-1 text-xs shrink-0"
                      >
                        {isConverting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        Créer le post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucun planning éditorial pour ce mois.</p>
            <p className="text-sm mt-1">Cliquez sur "Générer le planning" pour démarrer.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
