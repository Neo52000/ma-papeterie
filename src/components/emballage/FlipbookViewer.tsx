import { useState } from "react";
import { BookOpen, Download, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlipbookViewerProps {
  pdfUrl?: string;
  title?: string;
}

export function FlipbookViewer({ pdfUrl, title = "Catalogue" }: FlipbookViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!pdfUrl) {
    return <FlipbookPlaceholder />;
  }

  function toggleFullscreen() {
    const el = document.getElementById("pdf-viewer-container");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  return (
    <div id="pdf-viewer-container" className="flex flex-col gap-4">
      <div className="relative rounded-xl overflow-hidden border shadow-lg bg-white">
        <iframe
          src={pdfUrl}
          title={title}
          className="w-full border-0"
          style={{ height: isFullscreen ? "100vh" : "700px" }}
          allow="fullscreen"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1.5" /> : <Maximize2 className="h-4 w-4 mr-1.5" />}
          {isFullscreen ? "Quitter" : "Plein écran"}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Ouvrir dans un nouvel onglet
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={pdfUrl} download>
            <Download className="h-4 w-4 mr-1.5" />
            Télécharger
          </a>
        </Button>
      </div>
    </div>
  );
}

function FlipbookPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/20">
      <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
        Catalogue interactif bientôt disponible
      </h3>
      <p className="text-sm text-muted-foreground/70 text-center max-w-md">
        Notre catalogue est en cours de préparation.
        En attendant, découvrez nos produits dans la section ci-dessous.
      </p>
    </div>
  );
}
