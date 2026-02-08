import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrawlForm } from "@/components/image-collector/CrawlForm";
import { AlkorCookieSection } from "@/components/image-collector/AlkorCookieSection";
import { CrawlJobsList } from "@/components/image-collector/CrawlJobsList";
import { CrawlJobDetail } from "@/components/image-collector/CrawlJobDetail";

const AdminImageCollector = () => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>("MRS_PUBLIC");

  return (
    <AdminLayout title="Collecteur d'Images" description="Collectez les images depuis les sites fournisseurs autorisés">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Collecteur d'Images</h1>
          <p className="text-muted-foreground mt-1">
            Collectez les images depuis les sites fournisseurs autorisés
          </p>
        </div>

        <Tabs
          value={activeSource}
          onValueChange={(v) => {
            setActiveSource(v);
            setSelectedJobId(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="MRS_PUBLIC">
              Ma-rentrée-scolaire (Public)
            </TabsTrigger>
            <TabsTrigger value="ALKOR_B2B">
              AlkorShop B2B (Auth)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="MRS_PUBLIC" className="space-y-6">
            <CrawlForm
              source="MRS_PUBLIC"
              defaultUrls="https://img1.ma-rentree-scolaire.fr/"
            />
          </TabsContent>

          <TabsContent value="ALKOR_B2B" className="space-y-6">
            <AlkorCookieSection />
            <CrawlForm
              source="ALKOR_B2B"
              defaultUrls="https://b2b.alkorshop.com/"
            />
          </TabsContent>
        </Tabs>

        {/* Jobs list */}
        <CrawlJobsList
          source={activeSource}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
        />

        {/* Job detail */}
        {selectedJobId && (
          <CrawlJobDetail
            jobId={selectedJobId}
            onClose={() => setSelectedJobId(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminImageCollector;
