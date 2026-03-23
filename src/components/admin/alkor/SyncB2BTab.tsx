import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Globe, Clock, StopCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AlkorCookieSection } from "@/components/image-collector/AlkorCookieSection";
import { useCrawlJobs, useCancelCrawl, useTriggerAlkorSync, useTriggerMrsSync } from "@/hooks/useCrawlJobs";
import { CrawlJobManager } from "@/components/admin/alkor/CrawlJobManager";

export function SyncB2BTab() {
  const { data: alkorJobs, isLoading: alkorLoading } = useCrawlJobs("ALKOR_B2B");
  const { data: mrsJobs, isLoading: mrsLoading } = useCrawlJobs("MRS_PUBLIC_PRODUCTS");
  const triggerSync = useTriggerAlkorSync();
  const triggerMrsSync = useTriggerMrsSync();
  const cancelCrawl = useCancelCrawl();

  const jobsLoading = alkorLoading || mrsLoading;
  const crawlJobs = [...(alkorJobs || []), ...(mrsJobs || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Find the active (running/queued) job for the progress bar
  const activeJob = crawlJobs?.find((j) => j.status === "running" || j.status === "queued");
  const isRunning = !!activeJob;

  // Elapsed time counter
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (isRunning && !tickRef.current) {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
  } else if (!isRunning && tickRef.current) {
    clearInterval(tickRef.current);
    tickRef.current = null;
  }

  const formatElapsed = (startIso: string) => {
    const sec = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  const phaseLabel = (phase: string | null) => {
    switch (phase) {
      case "login": return "Connexion au site B2B...";
      case "discovery": return "Découverte du catalogue...";
      case "scraping": return "Scraping des produits...";
      case "uploading": return "Upload des images...";
      case "pushing": return "Envoi vers la base de données...";
      default: return "Démarrage...";
    }
  };

  return (
    <>
      {/* Cookie configuration */}
      <AlkorCookieSection />

      {/* Launch crawl */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Crawl Catalogue</CardTitle>
              <CardDescription>
                Lancer la synchronisation via GitHub Actions.
                Alkor B2B : scrape le catalogue professionnel (auth requise).
                MRS : scrape le site public ma-rentree-scolaire.fr pour enrichir les fiches.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && activeJob ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-blue-700 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <Badge variant="outline" className="text-[10px] font-mono mr-1">
                    {activeJob.source === "ALKOR_B2B" ? "Alkor" : "MRS"}
                  </Badge>
                  {phaseLabel(activeJob.phase)}
                </span>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatElapsed(activeJob.created_at)}
                  </span>
                  {activeJob.pages_visited > 0 && activeJob.max_pages > 0 && (
                    <span className="font-mono">
                      {activeJob.pages_visited} / {activeJob.max_pages} pages
                    </span>
                  )}
                  {activeJob.pages_visited > 0 && !activeJob.max_pages && (
                    <span className="font-mono">
                      {activeJob.pages_visited} pages
                    </span>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 gap-1"
                    disabled={cancelCrawl.isPending}
                    onClick={() => cancelCrawl.mutate(activeJob.id)}
                  >
                    {cancelCrawl.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <StopCircle className="h-3 w-3" />
                    )}
                    Arrêter
                  </Button>
                </div>
              </div>
              <Progress
                value={
                  activeJob.max_pages > 0 && activeJob.pages_visited > 0
                    ? Math.min(99, Math.max(1, (activeJob.pages_visited / activeJob.max_pages) * 100))
                    : 1
                }
                className="h-3"
              />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{activeJob.pages_visited} pages crawlées</span>
                <span>{activeJob.images_found} images trouvées</span>
                <span>{activeJob.images_uploaded} images uploadées</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => triggerSync.mutate()}
                disabled={triggerSync.isPending || triggerMrsSync.isPending}
                className="gap-2"
              >
                {triggerSync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Crawl B2B Alkor
              </Button>
              <Button
                onClick={() => triggerMrsSync.mutate()}
                disabled={triggerSync.isPending || triggerMrsSync.isPending}
                variant="outline"
                className="gap-2"
              >
                {triggerMrsSync.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Crawl ma-rentree-scolaire.fr
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crawl jobs history */}
      <CrawlJobManager crawlJobs={crawlJobs} jobsLoading={jobsLoading} />
    </>
  );
}
