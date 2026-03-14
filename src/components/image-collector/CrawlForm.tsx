import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Play } from "lucide-react";
import { useStartCrawl } from "@/hooks/useCrawlJobs";

interface CrawlFormProps {
  source: string;
  defaultUrls: string;
}

const ENRICH_OPTIONS = [
  { id: "images", label: "Images HD", description: "Télécharger les images produit haute résolution" },
  { id: "descriptions", label: "Descriptions", description: "Extraire les descriptions longues et commerciales" },
  { id: "specs", label: "Caractéristiques", description: "Extraire les spécifications techniques (matière, couleur, etc.)" },
  { id: "dimensions", label: "Dimensions & Poids", description: "Extraire les dimensions, poids et conditionnement" },
] as const;

export function CrawlForm({ source, defaultUrls }: CrawlFormProps) {
  const [startUrls, setStartUrls] = useState(defaultUrls);
  const [maxPages, setMaxPages] = useState(800);
  const [maxImages, setMaxImages] = useState(3000);
  const [delayMs, setDelayMs] = useState(150);
  const [enrichOptions, setEnrichOptions] = useState<Set<string>>(
    new Set(["images", "descriptions", "specs", "dimensions"])
  );

  const startCrawl = useStartCrawl();

  const toggleOption = (id: string) => {
    setEnrichOptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      enrich: Array.from(enrichOptions),
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

          <div>
            <Label className="text-sm font-medium mb-2 block">Données à extraire</Label>
            <div className="grid grid-cols-2 gap-3">
              {ENRICH_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={enrichOptions.has(opt.id)}
                    onCheckedChange={() => toggleOption(opt.id)}
                    className="mt-0.5"
                  />
                  <div className="text-sm leading-tight">
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-muted-foreground text-xs">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
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

          <Button type="submit" disabled={startCrawl.isPending || enrichOptions.size === 0}>
            {startCrawl.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Lancer le crawl ({enrichOptions.size} type{enrichOptions.size > 1 ? "s" : ""} de données)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
