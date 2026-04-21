import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Target, Mail, BarChart3, Search, Plus, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ProspectSearchForm } from "@/components/admin/prospection/ProspectSearchForm";
import { ProspectSearchResults } from "@/components/admin/prospection/ProspectSearchResults";
import { ProspectListTable } from "@/components/admin/prospection/ProspectListTable";
import { ProspectDetailDrawer } from "@/components/admin/prospection/ProspectDetailDrawer";
import { CampaignForm } from "@/components/admin/prospection/CampaignForm";
import {
  useProspects, useProspectionKpis,
  DEFAULT_PROSPECT_FILTERS,
  type ProspectFilters, type ProspectRow,
} from "@/hooks/useProspects";
import { useDataGouvSearch, type DataGouvEntity } from "@/hooks/useDataGouvSearch";
import { useProspectCampaigns } from "@/hooks/useProspectCampaigns";

export default function AdminCrmProspection() {
  // ── Onglet recherche data.gouv ────────────────────────────────────────────
  const search = useDataGouvSearch();
  const [searchResults, setSearchResults] = useState<{ results: DataGouvEntity[]; total: number } | null>(null);

  const handleSearch = useCallback(async (filters: Parameters<typeof search.mutate>[0]) => {
    try {
      const result = await search.mutateAsync(filters);
      setSearchResults({ results: result.results, total: result.total });
      if (result.results.length === 0) {
        toast.info("Aucun résultat", { description: "Affinez vos filtres et relancez." });
      }
    } catch (err) {
      toast.error("Recherche impossible", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }, [search]);

  // ── Onglet prospects ──────────────────────────────────────────────────────
  const [pFilters, setPFilters] = useState<ProspectFilters>(DEFAULT_PROSPECT_FILTERS);
  const updateFilters = useCallback((patch: Partial<ProspectFilters>) => {
    setPFilters((prev) => ({ ...prev, ...patch, ...(patch.page === undefined && !("page" in patch) ? { page: 0 } : {}) }));
  }, []);
  const { data: prospectList, isLoading: prospectLoading } = useProspects(pFilters);
  const [openProspect, setOpenProspect] = useState<ProspectRow | null>(null);

  // ── Onglet campagnes ──────────────────────────────────────────────────────
  const { data: campaigns, isLoading: campaignsLoading } = useProspectCampaigns();
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);

  // ── KPI ───────────────────────────────────────────────────────────────────
  const { data: kpis } = useProspectionKpis();

  return (
    <AdminLayout title="Prospection B2B" description="Générez, qualifiez et convertissez des prospects depuis data.gouv.fr">
      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Prospects"
            value={kpis?.totalProspects ?? 0}
          />
          <KpiCard
            icon={<Target className="h-5 w-5 text-primary" />}
            label="À contacter"
            value={(kpis?.byStatus.new ?? 0) + (kpis?.byStatus.qualified ?? 0)}
          />
          <KpiCard
            icon={<AlertCircle className="h-5 w-5 text-primary" />}
            label="Non assignés"
            value={kpis?.unassigned ?? 0}
          />
          <KpiCard
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
            label="Score moyen"
            value={kpis?.avgScore ?? 0}
            suffix="/100"
          />
        </div>

        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" /> Recherche data.gouv
            </TabsTrigger>
            <TabsTrigger value="prospects">
              <Users className="h-4 w-4 mr-2" /> Prospects
              {kpis?.totalProspects ? (
                <Badge variant="secondary" className="ml-2">{kpis.totalProspects}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="campaigns">
              <Mail className="h-4 w-4 mr-2" /> Campagnes
              {campaigns?.length ? (
                <Badge variant="secondary" className="ml-2">{campaigns.length}</Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <ProspectSearchForm onSearch={handleSearch} loading={search.isPending} />
            {searchResults && (
              <ProspectSearchResults
                results={searchResults.results}
                total={searchResults.total}
              />
            )}
          </TabsContent>

          <TabsContent value="prospects">
            <ProspectListTable
              prospects={prospectList?.prospects ?? []}
              totalCount={prospectList?.totalCount ?? 0}
              totalPages={prospectList?.totalPages ?? 1}
              filters={pFilters}
              onFiltersChange={updateFilters}
              onOpen={setOpenProspect}
              loading={prospectLoading}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Campagnes de prospection</CardTitle>
                <Button onClick={() => setCampaignFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Nouvelle campagne
                </Button>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : campaigns?.length ? (
                  <div className="space-y-2">
                    {campaigns.map((c) => (
                      <Card key={c.id}>
                        <CardContent className="pt-4 pb-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.name}</span>
                              <Badge variant={c.status === "active" ? "default" : "secondary"}>
                                {c.status}
                              </Badge>
                              {c.target_segment && (
                                <Badge variant="outline" className="capitalize">
                                  {c.target_segment}
                                </Badge>
                              )}
                            </div>
                            {c.description && (
                              <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{c.enrollment_count ?? 0} prospect{(c.enrollment_count ?? 0) > 1 ? "s" : ""}</div>
                            {c.brevo_list_id && (
                              <div className="text-xs">Brevo liste #{c.brevo_list_id}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune campagne. Créez-en une pour enrôler des prospects dans une séquence Brevo.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ProspectDetailDrawer
          prospect={openProspect}
          open={!!openProspect}
          onClose={() => setOpenProspect(null)}
        />

        <CampaignForm
          open={campaignFormOpen}
          onClose={() => setCampaignFormOpen(false)}
        />
      </div>
    </AdminLayout>
  );
}

// ── Sous-composant KPI card ────────────────────────────────────────────────

function KpiCard({
  icon, label, value, suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">{icon}</div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tabular-nums">
              {value}{suffix ?? ""}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
