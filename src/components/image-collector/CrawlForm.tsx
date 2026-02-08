import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play } from "lucide-react";
import { useStartCrawl } from "@/hooks/useCrawlJobs";

interface CrawlFormProps {
  source: string;
  defaultUrls: string;
}

export function CrawlForm({ source, defaultUrls }: CrawlFormProps) {
  const [startUrls, setStartUrls] = useState(defaultUrls);
  const [maxPages, setMaxPages] = useState(800);
  const [maxImages, setMaxImages] = useState(3000);
  const [delayMs, setDelayMs] = useState(150);

  const startCrawl = useStartCrawl();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = startUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    startCrawl.mutate({
      source,
      start_urls: urls,
      max_pages: maxPages,
      max_images: maxImages,
      delay_ms: delayMs,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lancer un crawl</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="start-urls">URLs de départ (1 par ligne)</Label>
            <Textarea
              id="start-urls"
              value={startUrls}
              onChange={(e) => setStartUrls(e.target.value)}
              rows={3}
              placeholder="https://..."
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="max-pages">Max pages</Label>
              <Input
                id="max-pages"
                type="number"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 800)}
                min={1}
                max={5000}
              />
            </div>
            <div>
              <Label htmlFor="max-images">Max images</Label>
              <Input
                id="max-images"
                type="number"
                value={maxImages}
                onChange={(e) => setMaxImages(parseInt(e.target.value) || 3000)}
                min={1}
                max={10000}
              />
            </div>
            <div>
              <Label htmlFor="delay-ms">Délai (ms)</Label>
              <Input
                id="delay-ms"
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value) || 150)}
                min={50}
                max={5000}
              />
            </div>
          </div>

          <Button type="submit" disabled={startCrawl.isPending}>
            {startCrawl.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Lancer le crawl
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
