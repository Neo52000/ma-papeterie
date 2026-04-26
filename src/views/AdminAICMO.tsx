import { useState, useCallback, useMemo } from 'react';
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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/supabase-functions';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AiCmoProfile } from '@/components/admin/ai-cmo/AiCmoProfile';
import { AiCmoCompetitors } from '@/components/admin/ai-cmo/AiCmoCompetitors';
import { AiCmoQuestions } from '@/components/admin/ai-cmo/AiCmoQuestions';
import { AiCmoResults } from '@/components/admin/ai-cmo/AiCmoResults';
import { AiCmoDashboard } from '@/components/admin/ai-cmo/AiCmoDashboard';
import { AiCmoRecommendations } from '@/components/admin/ai-cmo/AiCmoRecommendations';
import { AiCmoPromptLibrary } from '@/components/admin/ai-cmo/AiCmoPromptLibrary';
import {
  useAiCmoProfile,
  useAiCmoQuestions,
  useAiCmoCompetitors,
} from '@/hooks/admin/useAiCmo';

type LazyTab = 'results' | 'dashboard' | 'recommendations' | 'prompts';

function SetupBadge({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${
        optional
          ? 'bg-muted text-muted-foreground'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
      }`}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {label}
      {optional ? ' (optionnel)' : ''}
    </span>
  );
}

export default function AdminAICMO() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{ runs: number; mentions: number } | null>(null);

  const { data: profile } = useAiCmoProfile();
  const { data: questions = [] } = useAiCmoQuestions();
  const { data: competitors = [] } = useAiCmoCompetitors();

  const setupStatus = useMemo(() => {
    const profileOk = Boolean(profile?.description && (profile?.name_aliases?.length ?? 0) > 0);
    const activeQuestions = questions.filter((q) => q.is_active).length;
    const questionsOk = activeQuestions > 0;
    const competitorsOk = competitors.length > 0;
    return {
      profileOk,
      questionsOk,
      competitorsOk,
      activeQuestions,
      ready: profileOk && questionsOk,
    };
  }, [profile, questions, competitors]);

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
      if (error) {
        const description = await extractFunctionErrorMessage(error, 'Erreur inconnue');
        toast.error('Erreur lors du monitoring', { description });
        return;
      }

      const result = data as {
        success: boolean;
        runs: number;
        brand_mentions: number;
        message?: string;
        failures?: number;
        failure_details?: { question_id: string; error: string }[];
      };

      if (result.runs === 0) {
        toast.info(result.message || 'Aucune question active à exécuter. Activez des questions dans l\'onglet "Questions".');
      } else {
        toast.success(`Monitoring terminé : ${result.runs} analyse${result.runs > 1 ? 's' : ''}, ${result.brand_mentions} mention${result.brand_mentions > 1 ? 's' : ''} de marque`);
        setLastRunResult({ runs: result.runs, mentions: result.brand_mentions });
      }

      if (result.failures && result.failures > 0) {
        const firstError = result.failure_details?.[0]?.error ?? 'Voir les logs Edge Function';
        toast.warning(
          `${result.failures} question${result.failures > 1 ? 's ont' : ' a'} échoué`,
          { description: firstError },
        );
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
      {/* Setup status + Run monitoring */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleRunMonitoring}
            disabled={running || !setupStatus.ready}
            size="lg"
            title={!setupStatus.ready ? "Complétez le profil et activez au moins une question" : undefined}
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

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <SetupBadge ok={setupStatus.profileOk} label="Profil de marque" />
          <SetupBadge
            ok={setupStatus.questionsOk}
            label={`Questions actives (${setupStatus.activeQuestions})`}
          />
          <SetupBadge ok={setupStatus.competitorsOk} label={`Concurrents (${competitors.length})`} optional />
        </div>

        {!setupStatus.ready && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>Setup incomplet.</strong>{' '}
              {!setupStatus.profileOk && 'Complétez le profil de marque (description + aliases). '}
              {!setupStatus.questionsOk && 'Activez au moins une question dans l\'onglet "Questions". '}
              Le monitoring ne peut pas s'exécuter sans ces éléments.
            </div>
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
