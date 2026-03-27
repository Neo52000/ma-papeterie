import { lazy, Suspense } from "react";
import { BookOpen } from "lucide-react";
import { Loader2 } from "lucide-react";

// Lazy import for heavy PDF + flipbook libs
const FlipbookContent = lazy(() => import("./FlipbookContent"));

interface FlipbookViewerProps {
  pdfUrl?: string;
  title?: string;
}

export function FlipbookViewer({ pdfUrl, title = "Catalogue Emballage" }: FlipbookViewerProps) {
  if (!pdfUrl) {
    return <FlipbookPlaceholder />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <FlipbookContent pdfUrl={pdfUrl} title={title} />
    </Suspense>
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
        Notre catalogue d'emballage interactif est en cours de préparation.
        En attendant, découvrez nos produits dans la section ci-dessous.
      </p>
    </div>
  );
}
