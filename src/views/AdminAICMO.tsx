import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Swords,
  MessageSquare,
  BarChart3,
  LayoutDashboard,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { AiCmoProfile } from '@/components/admin/ai-cmo/AiCmoProfile';
import { AiCmoCompetitors } from '@/components/admin/ai-cmo/AiCmoCompetitors';
import { AiCmoQuestions } from '@/components/admin/ai-cmo/AiCmoQuestions';
import { AiCmoResults } from '@/components/admin/ai-cmo/AiCmoResults';
import { AiCmoDashboard } from '@/components/admin/ai-cmo/AiCmoDashboard';
import { AiCmoRecommendations } from '@/components/admin/ai-cmo/AiCmoRecommendations';
import { AiCmoPromptLibrary } from '@/components/admin/ai-cmo/AiCmoPromptLibrary';

type LazyTab = 'results' | 'dashboard' | 'recommendations' | 'prompts';

export default function AdminAICMO() {
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

  return (
    <AdminLayout
      title="AI-CMO"
      subtitle="Monitoring de visibilité dans les IA conversationnelles"
    >
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
