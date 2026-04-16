import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Swords,
  MessageSquare,
  BarChart3,
  LayoutDashboard,
  Lightbulb,
  BookOpen,
  Play,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AiCmoProfile } from '@/components/admin/ai-cmo/AiCmoProfile';
import { AiCmoCompetitors } from '@/components/admin/ai-cmo/AiCmoCompetitors';
import { AiCmoQuestions } from '@/components/admin/ai-cmo/AiCmoQuestions';
import { AiCmoResults } from '@/components/admin/ai-cmo/AiCmoResults';
import { AiCmoDashboard } from '@/components/admin/ai-cmo/AiCmoDashboard';
import { AiCmoRecommendations } from '@/components/admin/ai-cmo/AiCmoRecommendations';
import { AiCmoPromptLibrary } from '@/components/admin/ai-cmo/AiCmoPromptLibrary';

type LazyTab = 'results' | 'dashboard' | 'recommendations' | 'prompts';

export default function AdminAICMO() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{ runs: number; mentions: number } | null>(null);

  const [loadedTabs, setLoadedTabs] = useState<Record<LazyTab, boolean>>({
    results: false,
    dashboard: false,
    recommendations: false,
    prompts: false,
  });

  const onTabChange = useCallback((value: string) => {
    if (value in loadedTabs && !loadedTabs[value as LazyTab]) {
      setLoadedTabs((prev) => ({ ...prev, [value]: true }));
    }
  }, [loadedTabs]);

  const handleRunMonitoring = async () => {
    setRunning(true);
    setLastRunResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-cmo-run', {
        body: {},
      });
      if (error) throw error;

      const result = data as { success: boolean; runs: number; brand_mentions: number; message?: string };

      if (result.runs === 0) {
        toast.info(result.message || 'Aucune question active à exécuter. Activez des questions dans l\'onglet "Questions".');
      } else {
        toast.success(`Monitoring terminé : ${result.runs} analyse${result.runs > 1 ? 's' : ''}, ${result.brand_mentions} mention${result.brand_mentions > 1 ? 's' : ''} de marque`);
        setLastRunResult({ runs: result.runs, mentions: result.brand_mentions });
      }

      // Refresh all AI-CMO queries
      queryClient.invalidateQueries({ queryKey: ['ai-cmo-prompt-runs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-cmo-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['ai-cmo-llm-costs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-cmo-questions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-cmo-recommendations'] });
    } catch (err) {
      toast.error('Erreur lors du monitoring', {
        description: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminLayout
      title="AI-CMO"
      description="Monitoring de visibilité dans les IA conversationnelles"
    >
      {/* Run monitoring button */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handleRunMonitoring}
          disabled={running}
          size="lg"
        >
          {running ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {running ? 'Analyse en cours…' : 'Lancer le monitoring'}
        </Button>
        {lastRunResult && (
          <div className="flex items-center gap-2">
            <Badge variant="default">{lastRunResult.runs} analyse{lastRunResult.runs > 1 ? 's' : ''}</Badge>
            <Badge variant={lastRunResult.mentions > 0 ? 'default' : 'secondary'}>
              {lastRunResult.mentions} mention{lastRunResult.mentions > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" onValueChange={onTabChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-1.5">
            <Swords className="h-4 w-4" />
            Concurrents
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Résultats
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            Prompts Marketing
          </TabsTrigger>
        </TabsList>

        {/* Eager tabs */}
        <TabsContent value="profile" className="space-y-4 mt-0">
          <AiCmoProfile />
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4 mt-0">
          <AiCmoCompetitors />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-0">
          <AiCmoQuestions />
        </TabsContent>

        {/* Lazy tabs — loaded on first click */}
        <TabsContent value="results" className="space-y-4 mt-0">
          {loadedTabs.results && <AiCmoResults />}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 mt-0">
          {loadedTabs.dashboard && <AiCmoDashboard />}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-0">
          {loadedTabs.recommendations && <AiCmoRecommendations />}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4 mt-0">
          {loadedTabs.prompts && <AiCmoPromptLibrary />}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
