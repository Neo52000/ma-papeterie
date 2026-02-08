import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { useCrawlJobs, type CrawlJob } from "@/hooks/useCrawlJobs";

interface CrawlJobsListProps {
  source: string;
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  queued: { label: "En attente", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  running: { label: "En cours", variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  done: { label: "Terminé", variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
  error: { label: "Erreur", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  canceled: { label: "Annulé", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

export function CrawlJobsList({ source, selectedJobId, onSelectJob }: CrawlJobsListProps) {
  const { data: jobs, isLoading } = useCrawlJobs(source);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jobs de crawl</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Aucun job lancé pour cette source.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Jobs de crawl ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((job) => {
          const config = statusConfig[job.status] || statusConfig.queued;
          const pagesProgress = job.max_pages > 0 ? (job.pages_visited / job.max_pages) * 100 : 0;
          const imagesProgress = job.max_images > 0 ? (job.images_uploaded / job.max_images) * 100 : 0;

          return (
            <div
              key={job.id}
              className={`border rounded-lg p-4 space-y-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedJobId === job.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => onSelectJob(job.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={config.variant} className="gap-1">
                    {config.icon}
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {job.id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(job.created_at).toLocaleString("fr-FR")}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1">
                    <Eye className="h-3 w-3" />
                    Détail
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Pages : </span>
                  <span className="font-medium">{job.pages_visited}/{job.max_pages}</span>
                  <Progress value={pagesProgress} className="h-1.5 mt-1" />
                </div>
                <div>
                  <span className="text-muted-foreground">Images : </span>
                  <span className="font-medium">{job.images_uploaded}/{job.max_images}</span>
                  <Progress value={imagesProgress} className="h-1.5 mt-1" />
                </div>
              </div>

              {job.last_error && (
                <p className="text-xs text-destructive truncate">
                  ⚠ {job.last_error}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
