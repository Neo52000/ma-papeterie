import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  X,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import {
  useCrawlJobDetail,
  exportCrawlImagesCsv,
} from "@/hooks/useCrawlJobs";

interface CrawlJobDetailProps {
  jobId: string;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 50;

export function CrawlJobDetail({ jobId, onClose }: CrawlJobDetailProps) {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useCrawlJobDetail(jobId, search, ITEMS_PER_PAGE, offset);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setOffset(0);
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { job, images, total_images, total_pages } = data;
  const pagesProgress = job.max_pages > 0 ? (job.pages_visited / job.max_pages) * 100 : 0;
  const imagesProgress = job.max_images > 0 ? (job.images_uploaded / job.max_images) * 100 : 0;
  const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.ceil(total_images / ITEMS_PER_PAGE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Détail du job
            <Badge variant="outline" className="font-mono text-xs">
              {jobId.slice(0, 8)}…
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Pages visitées</span>
              <span className="font-medium">{job.pages_visited} / {job.max_pages}</span>
            </div>
            <Progress value={pagesProgress} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Images uploadées</span>
              <span className="font-medium">{job.images_uploaded} / {job.max_images}</span>
            </div>
            <Progress value={imagesProgress} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{total_pages}</p>
            <p className="text-muted-foreground">Pages crawlées</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{job.images_found}</p>
            <p className="text-muted-foreground">Images trouvées</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{total_images}</p>
            <p className="text-muted-foreground">Images stockées</p>
          </div>
        </div>

        {job.last_error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <strong>Dernière erreur :</strong> {job.last_error}
          </div>
        )}

        {/* Search + Export */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher par URL..."
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Rechercher
            </Button>
          </form>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => exportCrawlImagesCsv(images, jobId)}
            disabled={images.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Image gallery */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                {img.signed_url ? (
                  <img
                    src={img.signed_url}
                    alt={img.source_url}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {img.source_url.split("/").pop()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Aucune image trouvée</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + ITEMS_PER_PAGE >= total_images}
              onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
