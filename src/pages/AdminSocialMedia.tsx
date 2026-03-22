import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialPostCreator } from "@/components/admin/social/SocialPostCreator";
import { SocialPostsList } from "@/components/admin/social/SocialPostsList";
import { SocialCalendarView } from "@/components/admin/social/SocialCalendarView";
import { SocialEditorialPlanner } from "@/components/admin/social/SocialEditorialPlanner";
import { SocialSettingsPanel } from "@/components/admin/blog/SocialSettingsPanel";
import { PlusCircle, List, CalendarDays, BookOpen, Settings } from "lucide-react";

export default function AdminSocialMedia() {
  return (
    <AdminLayout
      title="Social Media"
      description="Créez, planifiez et publiez vos posts sur les réseaux sociaux"
    >
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="create" className="gap-1.5 text-xs">
            <PlusCircle className="w-3.5 h-3.5" />
            Nouveau post
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 text-xs">
            <List className="w-3.5 h-3.5" />
            Publications
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <CalendarDays className="w-3.5 h-3.5" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="planner" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            Planning IA
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />
            Réglages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <SocialPostCreator />
        </TabsContent>

        <TabsContent value="list">
          <SocialPostsList />
        </TabsContent>

        <TabsContent value="calendar">
          <SocialCalendarView />
        </TabsContent>

        <TabsContent value="planner">
          <SocialEditorialPlanner />
        </TabsContent>

        <TabsContent value="settings">
          <SocialSettingsPanel />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
