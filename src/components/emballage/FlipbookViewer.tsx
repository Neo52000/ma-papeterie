import { useState, useEffect, useRef } from "react";
import { BookOpen, Download, Maximize2, Minimize2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlipbookViewerProps {
  pdfUrl?: string;
  title?: string;
}

export function FlipbookViewer({ pdfUrl, title = "Catalogue" }: FlipbookViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-mark as loaded after timeout (object tag doesn't always fire onLoad)
  useEffect(() => {
    if (!pdfUrl) return;
    const timer = setTimeout(() => setLoaded(true), 3000);
    return () => clearTimeout(timer);
  }, [pdfUrl]);

  if (!pdfUrl) {
    return <FlipbookPlaceholder />;
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <div ref={containerRef} className={`flex flex-col gap-4 ${isFullscreen ? "bg-white p-4" : ""}`}>
      <div className="relative rounded-xl overflow-hidden border shadow-lg bg-white">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement du catalogue...</span>
          </div>
        )}
        {/*
          Use <object> tag instead of <iframe>.
          <object> with type="application/pdf" triggers the browser's native PDF viewer
          and is NOT blocked by X-Frame-Options (unlike iframe).
        */}
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full"
          style={{ height: isFullscreen ? "calc(100vh - 80px)" : "700px" }}
          onLoad={() => setLoaded(true)}
        >
          {/* Fallback for browsers that don't support object PDF */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-2">Votre navigateur ne supporte pas l'affichage PDF intégré.</p>
            <div className="flex gap-3 mt-4">
              <Button variant="default" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Ouvrir le PDF
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
        </object>
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
