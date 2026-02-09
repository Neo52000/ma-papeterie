import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImageEnricher } from "@/components/image-collector/ProductImageEnricher";
import { BatchImageImport } from "@/components/image-collector/BatchImageImport";
import { CrawlForm } from "@/components/image-collector/CrawlForm";
import { AlkorCookieSection } from "@/components/image-collector/AlkorCookieSection";
import { CrawlJobsList } from "@/components/image-collector/CrawlJobsList";
import { CrawlJobDetail } from "@/components/image-collector/CrawlJobDetail";
import { useProductImages } from "@/hooks/useProductImages";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const AdminImageCollector = () => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string>("MRS_PUBLIC");

  const {
    products,
    productsWithoutImage,
    productsWithImage,
    loading,
    enriching,
    uploading,
    enrichFromUrl,
    uploadDirect,
    enrichBatch,
  } = useProductImages();

  return (
    <AdminLayout
      title="Enrichissement Images Produits"
      description="Associez des images à vos produits par URL, upload direct ou import CSV"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Enrichissement Images Produits</h1>
          <p className="text-muted-foreground mt-1">
            Associez des images à vos produits par URL, upload direct ou import CSV
          </p>
        </div>

        <Tabs defaultValue="per-product">
          <TabsList>
            <TabsTrigger value="per-product">Par produit</TabsTrigger>
            <TabsTrigger value="batch">Import en masse</TabsTrigger>
            <TabsTrigger value="crawl">Crawl avancé</TabsTrigger>
          </TabsList>

          <TabsContent value="per-product" className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des produits...
              </div>
            ) : (
              <ProductImageEnricher
                products={products}
                productsWithoutImage={productsWithoutImage}
                productsWithImage={productsWithImage}
                enriching={enriching}
                uploading={uploading}
                onEnrichFromUrl={enrichFromUrl}
                onUploadDirect={uploadDirect}
              />
            )}
          </TabsContent>

          <TabsContent value="batch" className="space-y-6">
            <BatchImageImport onEnrichBatch={enrichBatch} />
          </TabsContent>

          <TabsContent value="crawl" className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Fonctionnalité limitée :</strong> Les sites fournisseurs
                bloquent actuellement les requêtes serveur (HTTP 403/404). Utilisez
                plutôt l'onglet "Par produit" pour coller les URLs d'images
                récupérées manuellement depuis votre navigateur.
              </AlertDescription>
            </Alert>

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

            <CrawlJobsList
              source={activeSource}
              selectedJobId={selectedJobId}
              onSelectJob={setSelectedJobId}
            />

            {selectedJobId && (
              <CrawlJobDetail
                jobId={selectedJobId}
                onClose={() => setSelectedJobId(null)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminImageCollector;
