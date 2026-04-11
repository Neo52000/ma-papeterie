import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, ClipboardList, MessageSquarePlus } from "lucide-react";
import { useClientProfile } from "@/hooks/admin/useClientProfile";
import { useClientInteractions } from "@/hooks/admin/useClientInteractions";
import { useClientOrders } from "@/hooks/admin/useClientOrders";
import { useClientQuotes } from "@/hooks/admin/useClientQuotes";
import { useClientTasks } from "@/hooks/admin/useClientTasks";
import { ClientProfileCard } from "@/components/admin/crm/ClientProfileCard";
import { ClientTimeline } from "@/components/admin/crm/ClientTimeline";
import { ClientOrdersTab } from "@/components/admin/crm/ClientOrdersTab";
import { ClientQuotesTab } from "@/components/admin/crm/ClientQuotesTab";
import { ClientTasksTab } from "@/components/admin/crm/ClientTasksTab";
import { AddInteractionDialog } from "@/components/admin/crm/AddInteractionDialog";
import { AddTaskDialog } from "@/components/admin/crm/AddTaskDialog";

export default function AdminCrmClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const { data: profile, isLoading: profileLoading } = useClientProfile(id ?? null);
  const { data: interactions, isLoading: interactionsLoading } = useClientInteractions(
    id ?? null,
    profile?.user_id ?? null,
  );
  const { data: orders, isLoading: ordersLoading } = useClientOrders(
    profile?.user_id ?? null,
  );
  const { data: quotes, isLoading: quotesLoading } = useClientQuotes(id ?? null);
  const { data: tasks, isLoading: tasksLoading } = useClientTasks(id ?? null);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/crm")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour CRM
          </Button>
          <h1 className="text-xl font-bold">
            Fiche client {profile?.display_name ?? ""}
          </h1>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setShowAddInteraction(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Ajouter note
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddTask(true)}>
            <ClipboardList className="h-4 w-4 mr-1" />
            Creer tache
          </Button>
        </div>

        {/* Main layout: 2 columns on desktop, stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Left column: Profile card */}
          <div>
            <ClientProfileCard profile={profile ?? null} isLoading={profileLoading} />
          </div>

          {/* Right column: Tabs */}
          <div>
            <Tabs defaultValue="timeline">
              <TabsList>
                <TabsTrigger value="timeline">
                  Timeline ({interactions?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="orders">
                  Commandes ({orders?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="quotes">
                  Devis ({quotes?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Taches ({tasks?.filter((t) => t.status !== "done" && t.status !== "cancelled").length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="border rounded-lg mt-2">
                <ClientTimeline
                  interactions={interactions ?? []}
                  isLoading={interactionsLoading}
                />
              </TabsContent>

              <TabsContent value="orders" className="border rounded-lg mt-2">
                <ClientOrdersTab
                  orders={orders ?? []}
                  isLoading={ordersLoading}
                />
              </TabsContent>

              <TabsContent value="quotes" className="border rounded-lg mt-2">
                <ClientQuotesTab
                  quotes={quotes ?? []}
                  isLoading={quotesLoading}
                />
              </TabsContent>

              <TabsContent value="tasks" className="mt-2">
                <ClientTasksTab
                  tasks={tasks ?? []}
                  isLoading={tasksLoading}
                  profileId={id}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {profile && (
        <>
          <AddInteractionDialog
            open={showAddInteraction}
            onOpenChange={setShowAddInteraction}
            profileId={profile.id}
            userId={profile.user_id}
          />
          <AddTaskDialog
            open={showAddTask}
            onOpenChange={setShowAddTask}
            profileId={profile.id}
          />
        </>
      )}
    </AdminLayout>
  );
}
