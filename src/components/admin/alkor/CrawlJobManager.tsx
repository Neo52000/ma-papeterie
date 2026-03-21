import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Clock, Trash2, StopCircle } from "lucide-react";
import { useCancelCrawl, useDeleteCrawlJobs } from "@/hooks/useCrawlJobs";

interface CrawlJob {
  id: string;
  source: string;
  status: string;
  phase: string | null;
  pages_visited: number;
  max_pages: number;
  images_found: number;
  images_uploaded: number;
  last_error: string | null;
  created_at: string;
}

interface CrawlJobManagerProps {
  crawlJobs: CrawlJob[];
  jobsLoading: boolean;
}

function phaseLabel(phase: string | null) {
  switch (phase) {
    case "login": return "Connexion au site B2B...";
    case "discovery": return "Découverte du catalogue...";
    case "scraping": return "Scraping des produits...";
    case "uploading": return "Upload des images...";
    case "pushing": return "Envoi vers la base de données...";
    default: return "Démarrage...";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "done":
      return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>;
    case "running":
      return <Badge className="bg-blue-100 text-blue-800 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> En cours</Badge>;
    case "queued":
      return <Badge className="bg-yellow-100 text-yellow-800 gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
    case "error":
      return <Badge className="bg-red-100 text-red-800 gap-1"><AlertCircle className="h-3 w-3" /> Erreur</Badge>;
    case "canceled":
      return <Badge className="bg-gray-100 text-gray-800 gap-1"><StopCircle className="h-3 w-3" /> Annulé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function CrawlJobManager({ crawlJobs, jobsLoading }: CrawlJobManagerProps) {
  const deleteCrawlJobs = useDeleteCrawlJobs("ALKOR_B2B");
  const cancelCrawl = useCancelCrawl();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Historique des crawls</CardTitle>
        {crawlJobs && crawlJobs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm("Supprimer tout l'historique des crawls ALKOR B2B ?")) {
                deleteCrawlJobs.mutate();
              }
            }}
            disabled={deleteCrawlJobs.isPending}
          >
            {deleteCrawlJobs.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Supprimer l'historique
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {jobsLoading ? (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Chargement...
          </div>
        ) : !crawlJobs || crawlJobs.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">Aucun crawl encore effectué</p>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead className="text-right">Images trouvées</TableHead>
                  <TableHead className="text-right">Images uploadées</TableHead>
                  <TableHead>Erreur</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crawlJobs.slice(0, 10).map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-xs font-mono">
                      {new Date(job.created_at).toLocaleString("fr-FR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {job.source === "ALKOR_B2B" ? "Alkor B2B" : "MRS"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {statusBadge(job.status)}
                        {(job.status === "running" || job.status === "queued") && job.phase && (
                          <span className="text-[10px] text-muted-foreground">{phaseLabel(job.phase)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{job.pages_visited}</TableCell>
                    <TableCell className="text-right font-mono">{job.images_found}</TableCell>
                    <TableCell className="text-right font-mono">{job.images_uploaded}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {job.last_error || "—"}
                    </TableCell>
                    <TableCell>
                      {(job.status === "running" || job.status === "queued") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 gap-1"
                          disabled={cancelCrawl.isPending}
                          onClick={() => cancelCrawl.mutate(job.id)}
                        >
                          <StopCircle className="h-3 w-3" />
                          Arrêter
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
