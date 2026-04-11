import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteBuilder } from "@/components/admin/crm/QuoteBuilder";
import { QuotesList } from "@/components/admin/crm/QuotesList";

export default function AdminCrmQuotes() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <AdminLayout title="Gestion des devis">
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Gestion des devis</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Liste des devis</TabsTrigger>
            <TabsTrigger value="create">Nouveau devis</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <QuotesList />
          </TabsContent>

          <TabsContent value="create" className="mt-4">
            <QuoteBuilder onSuccess={() => setActiveTab("list")} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
