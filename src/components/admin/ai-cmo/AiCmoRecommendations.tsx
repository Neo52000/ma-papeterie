import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SearchX, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAiCmoRecommendations, useGenerateAiCmoRecommendations } from '@/hooks/admin/useAiCmo';

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '';

export function AiCmoRecommendations() {
  const { data: recommendations = [], isLoading } = useAiCmoRecommendations();
  const generateMutation = useGenerateAiCmoRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <SearchX className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Aucune recommandation</p>
          <p className="text-sm mb-4">
            Lancez l'analyse concurrentielle pour générer des recommandations à partir de vos résultats de monitoring
          </p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generateMutation.isPending ? 'Analyse en cours…' : 'Générer les recommandations'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recommandations concurrentielles</CardTitle>
            <CardDescription>
              Analyses des concurrents et plans d'action pour améliorer votre visibilité IA
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generateMutation.isPending ? 'Analyse…' : 'Régénérer'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {recommendations.map((rec) => {
            const isCompleted = !!rec.completed_at;
            return (
              <AccordionItem key={rec.id} value={rec.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold">
                      {rec.competitor_domain ?? 'Domaine inconnu'}
                    </span>
                    <Badge variant={isCompleted ? 'default' : 'secondary'}>
                      {isCompleted ? 'Terminée' : 'En cours'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(rec.completed_at ?? rec.created_at)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {rec.why_competitor && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Pourquoi le concurrent est cité
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{rec.why_competitor}</p>
                    </div>
                  )}

                  {rec.why_not_user && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Pourquoi vous n'êtes pas cité
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{rec.why_not_user}</p>
                    </div>
                  )}

                  {rec.what_to_do && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Plan d'action recommandé
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{rec.what_to_do}</p>
                    </div>
                  )}

                  {rec.prompts_to_analyze && rec.prompts_to_analyze.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Prompts analysés
                      </p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {rec.prompts_to_analyze.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
